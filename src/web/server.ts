/**
 * Web server for Claude Explorer
 */
import express, { Request, Response } from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { ClaudeDataParser } from '../core/parser.js';
import { SearchIndexer } from '../core/indexer.js';
import { FilterEngine } from '../core/filters.js';
import { MarkdownExporter } from '../core/exporters/markdown.js';
import { JSONExporter } from '../core/exporters/json.js';
import { BundleExporter } from '../core/exporters/bundle.js';
import { ClaudeCodeLibrarian } from '../core/claude-code-librarian.js';
import { tmpdir } from 'os';
import multer from 'multer';
import AdmZip from 'adm-zip';
import { existsSync, mkdirSync, rmSync, readdirSync, statSync } from 'fs';
import { readFile } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// Global state
let parser: ClaudeDataParser;
let indexer: SearchIndexer;
let filterEngine: FilterEngine;
let librarian: ClaudeCodeLibrarian | null = null;
let dataPath: string;
let uploadedDataPath: string | null = null;

// Configure multer for file uploads
const uploadDir = join(tmpdir(), 'claude-explorer-uploads');
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/zip' ||
        file.mimetype === 'application/x-zip-compressed' ||
        file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Only .zip files are allowed'));
    }
  },
});

/**
 * Initialize data
 */
async function initializeData(path: string) {
  dataPath = path;
  parser = new ClaudeDataParser(path);
  
  try {
    await parser.load();

    indexer = new SearchIndexer();
    indexer.buildIndex(parser.getConversationsWithMessages());

    filterEngine = new FilterEngine();

    console.log(`✓ Loaded data from: ${path}`);
    console.log(`✓ ${parser.getStats().totalConversations} conversations`);
    console.log(`✓ ${parser.getStats().totalProjects} projects`);
  } catch (error) {
    console.log(`⚠ No data found at ${path}`);
    console.log(`  Upload your Claude.ai export via the web UI to get started`);
    
    // Initialize with empty state
    indexer = new SearchIndexer();
    filterEngine = new FilterEngine();
  }

  // Try to initialize Claude Code librarian
  try {
    librarian = new ClaudeCodeLibrarian(path);
    await librarian.initialize();
    console.log(`✓ AI Assistant initialized (Claude Code headless)`);
  } catch (error) {
    console.log(`⚠ AI Assistant not available (Claude Code not found or not authenticated)`);
    console.log(`   To enable: Install Claude Code and run 'claude login'`);
  }
}

/**
 * API Routes
 */

// Get statistics
app.get('/api/stats', (_req: Request, res: Response) => {
  try {
    const stats = parser.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Search conversations
app.get('/api/search', (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    const limit = parseInt((req.query.limit as string) || '20');

    if (!query) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    const results = indexer.search(query, limit);
    return res.json(results);
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// List conversations
app.get('/api/conversations', (req: Request, res: Response) => {
  try {
    const limit = parseInt((req.query.limit as string) || '50');
    const sortBy = (req.query.sort as 'date' | 'messages' | 'name') || 'date';
    const messagesOnly = req.query.messagesOnly === 'true';

    let conversations = messagesOnly
      ? parser.getConversationsWithMessages()
      : parser.getConversations();

    conversations = filterEngine.sortConversations(conversations, sortBy);

    res.json({
      total: conversations.length,
      conversations: conversations.slice(0, limit),
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get single conversation
app.get('/api/conversations/:uuid', (req: Request, res: Response) => {
  try {
    const conversation = parser.getConversation(req.params.uuid);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    return res.json(conversation);
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// List projects
app.get('/api/projects', (_req: Request, res: Response) => {
  try {
    const projects = parser.getProjects();
    res.json({ total: projects.length, projects });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get single project
app.get('/api/projects/:uuid', (req: Request, res: Response) => {
  try {
    const project = parser.getProject(req.params.uuid);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    return res.json(project);
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Export conversation
app.post('/api/export/conversation/:uuid', async (req: Request, res: Response) => {
  try {
    const conversation = parser.getConversation(req.params.uuid);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const format = req.body.format || 'markdown';
    const safeName = (conversation.name || 'conversation')
      .replace(/[^a-z0-9-_]/gi, '_')
      .substring(0, 50);

    switch (format) {
      case 'markdown': {
        const exporter = new MarkdownExporter();
        const content = exporter.exportConversation(conversation);
        res.setHeader('Content-Type', 'text/markdown');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${safeName}.md"`
        );
        return res.send(content);
      }

      case 'json': {
        const exporter = new JSONExporter();
        const content = exporter.exportConversation(conversation, {
          format: 'json',
          includeMetadata: true,
        });
        res.setHeader('Content-Type', 'application/json');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${safeName}.json"`
        );
        return res.send(content);
      }

      case 'bundle': {
        const exporter = new BundleExporter();
        const tmpPath = join(tmpdir(), `${safeName}-${Date.now()}.zip`);
        await exporter.exportConversationBundle(conversation, tmpPath);
        return res.download(tmpPath, `${safeName}.zip`);
      }

      default:
        return res.status(400).json({ error: 'Invalid format' });
    }
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Batch export
app.post('/api/export/batch', async (req: Request, res: Response) => {
  try {
    const uuids = req.body.uuids as string[];
    const format = req.body.format || 'bundle';

    if (!Array.isArray(uuids) || uuids.length === 0) {
      return res.status(400).json({ error: 'UUIDs array is required' });
    }

    const conversations = uuids
      .map((uuid) => parser.getConversation(uuid))
      .filter((c) => c !== undefined);

    if (conversations.length === 0) {
      return res.status(404).json({ error: 'No conversations found' });
    }

    if (format === 'bundle') {
      const exporter = new BundleExporter();
      const tmpPath = join(tmpdir(), `export-${Date.now()}.zip`);
      await exporter.exportConversationsBundle(
        conversations,
        tmpPath,
        'Claude Conversations Export'
      );
      return res.download(tmpPath, 'conversations-export.zip');
    } else {
      return res.status(400).json({ error: 'Batch export only supports bundle format' });
    }
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * AI Assistant Routes
 */

// Check authentication status
app.get('/api/assistant/status', (_req: Request, res: Response) => {
  try {
    res.json({
      authenticated: librarian !== null,
      model: librarian ? 'Claude Code (Headless)' : null,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      authenticated: false,
    });
  }
});

// Chat with AI assistant
app.post('/api/assistant/chat', async (req: Request, res: Response) => {
  try {
    const { message, model, provider, apiKey } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log(`[AI Assistant] Received message: ${message.substring(0, 100)}...`);
    console.log(`[AI Assistant] Provider: ${provider || 'default'}, Model: ${model || 'default'}`);

    // If OpenRouter provider and API key provided, use OpenRouter directly
    if (provider === 'openrouter' && apiKey) {
      const { OpenRouterClient } = await import('../core/openrouter-client.js');
      const client = new OpenRouterClient(apiKey);
      
      const messages = [
        {
          role: 'system' as const,
          content: 'You are a helpful AI assistant for Claude Explorer. Help users search, explore, and understand their Claude conversation history.',
        },
        {
          role: 'user' as const,
          content: message,
        },
      ];

      const response = await client.chatCompletion(messages, model || 'openai/gpt-3.5-turbo');
      
      return res.json({
        response: response.choices[0]?.message?.content || 'No response',
        model: response.model,
        tokensUsed: response.usage.total_tokens,
      });
    }

    // Otherwise, use Claude Code Librarian (default)
    if (!librarian) {
      // Try to initialize if not already done
      try {
        librarian = new ClaudeCodeLibrarian(dataPath);
        await librarian.initialize();
      } catch (error) {
        console.error('AI Assistant initialization error:', error);
        return res.status(503).json({
          error: 'AI Assistant not available. Please ensure Claude Code is installed and authenticated.',
          hint: 'Run: claude login',
        });
      }
    }

    console.log(`[AI Assistant] Using Claude Code Librarian`);
    const response = await librarian.chat(message);
    console.log(`[AI Assistant] Response: ${response.success ? 'Success' : 'Failed'}`);

    if (response.success) {
      return res.json({
        response: response.message,
      });
    } else {
      return res.status(500).json({
        error: response.error || 'Failed to generate response',
      });
    }
  } catch (error) {
    console.error('[AI Assistant] Chat error:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined,
    });
  }
});

/**
 * Helper: Find files recursively in directory
 */
function findFilesRecursive(dir: string, targetFiles: string[]): Map<string, string> {
  const found = new Map<string, string>();
  
  function search(currentPath: string) {
    const entries = readdirSync(currentPath);
    
    for (const entry of entries) {
      const fullPath = join(currentPath, entry);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        search(fullPath);
      } else if (targetFiles.includes(entry)) {
        found.set(entry, fullPath);
      }
    }
  }
  
  search(dir);
  return found;
}

/**
 * File Upload Routes
 */

// Upload and extract Claude.ai export zip
app.post('/api/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file;
    console.log(`[Upload] Processing file: ${file.originalname} (${file.size} bytes)`);

    // Create unique directory for this upload
    const extractPath = join(uploadDir, `extract-${Date.now()}`);
    mkdirSync(extractPath, { recursive: true });

    try {
      // Extract zip file
      const zip = new AdmZip(file.path);
      zip.extractAllTo(extractPath, true);

      // Find required files recursively
      const requiredFiles = ['conversations.json'];
      const optionalFiles = ['projects.json', 'users.json'];
      const allTargetFiles = [...requiredFiles, ...optionalFiles];
      const foundFiles = findFilesRecursive(extractPath, allTargetFiles);
      const missingFiles = requiredFiles.filter(f => !foundFiles.has(f));

      console.log(`[Upload] Extracted to: ${extractPath}`);
      console.log(`[Upload] Found files:`, Array.from(foundFiles.keys()));
      console.log(`[Upload] Missing optional files:`, optionalFiles.filter(f => !foundFiles.has(f)));

      if (missingFiles.length > 0) {
        // Clean up
        rmSync(extractPath, { recursive: true, force: true });
        return res.status(400).json({
          error: 'Invalid Claude.ai export file',
          message: `Missing required files: ${missingFiles.join(', ')}`,
        });
      }

      // Verify files are valid JSON
      try {
        for (const [_filename, filePath] of foundFiles) {
          const fileContent = await readFile(filePath, 'utf-8');
          JSON.parse(fileContent);
        }
      } catch (parseError) {
        rmSync(extractPath, { recursive: true, force: true });
        return res.status(400).json({
          error: 'Invalid JSON in export files',
          message: parseError instanceof Error ? parseError.message : 'Unknown parsing error',
        });
      }

      // Create empty optional files if they don't exist
      const conversationsPath = foundFiles.get('conversations.json')!;
      const filesDir = join(conversationsPath, '..');
      
      for (const optionalFile of optionalFiles) {
        if (!foundFiles.has(optionalFile)) {
          const emptyFilePath = join(filesDir, optionalFile);
          await import('fs/promises').then(fs => fs.writeFile(emptyFilePath, '[]', 'utf-8'));
          foundFiles.set(optionalFile, emptyFilePath);
          console.log(`[Upload] Created empty ${optionalFile} at ${emptyFilePath}`);
        }
      }

      // If files are in subdirectory, move them to root for consistency
      if (filesDir !== extractPath) {
        // Files are in subdirectory, use that as the data path
        if (uploadedDataPath && existsSync(uploadedDataPath)) {
          rmSync(uploadedDataPath, { recursive: true, force: true });
        }
        uploadedDataPath = filesDir;
        await initializeData(filesDir);
      } else {
        // Files are at root, use extractPath
        if (uploadedDataPath && existsSync(uploadedDataPath)) {
          rmSync(uploadedDataPath, { recursive: true, force: true });
        }
        uploadedDataPath = extractPath;
        await initializeData(extractPath);
      }

      const stats = parser.getStats();

      console.log(`[Upload] Successfully loaded data from uploaded file`);
      console.log(`[Upload] ${stats.totalConversations} conversations, ${stats.totalProjects} projects`);

      return res.json({
        success: true,
        message: 'File uploaded and processed successfully',
        stats: {
          conversations: stats.totalConversations,
          projects: stats.totalProjects,
          messages: stats.messages.total,
        },
      });
    } catch (extractError) {
      // Clean up on error
      if (existsSync(extractPath)) {
        rmSync(extractPath, { recursive: true, force: true });
      }
      throw extractError;
    }
  } catch (error) {
    console.error('[Upload] Error:', error);
    return res.status(500).json({
      error: 'Failed to process uploaded file',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get upload status
app.get('/api/upload/status', (_req: Request, res: Response) => {
  try {
    res.json({
      hasUploadedData: uploadedDataPath !== null,
      dataSource: uploadedDataPath ? 'uploaded' : 'default',
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Clear uploaded data and revert to default
app.post('/api/upload/clear', async (_req: Request, res: Response) => {
  try {
    if (uploadedDataPath && existsSync(uploadedDataPath)) {
      rmSync(uploadedDataPath, { recursive: true, force: true });
      console.log(`[Upload] Cleared uploaded data from: ${uploadedDataPath}`);
    }

    uploadedDataPath = null;

    // Reload default data
    await initializeData(dataPath);

    res.json({
      success: true,
      message: 'Uploaded data cleared, reverted to default data source',
    });
  } catch (error) {
    console.error('[Upload] Error clearing data:', error);
    res.status(500).json({
      error: 'Failed to clear uploaded data',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * OpenRouter & API Key Management Routes
 */

// Get available models (Anthropic + OpenRouter)
app.get('/api/models', async (req: Request, res: Response) => {
  try {
    const { OpenRouterClient } = await import('../core/openrouter-client.js');
    const { ModelProvider } = await import('../core/models.js');
    
    const models = [];
    
    // Add Anthropic models
    models.push({
      id: 'claude-sonnet-4-5-20250514',
      name: 'Claude Sonnet 4.5',
      provider: ModelProvider.ANTHROPIC,
      description: 'Most capable model for complex reasoning',
      quality: 'high',
      speed: 'moderate',
      cost: '$3-15 per million tokens',
    });
    models.push({
      id: 'claude-haiku-4-5-20250514',
      name: 'Claude Haiku 4.5',
      provider: ModelProvider.ANTHROPIC,
      description: 'Fast and efficient for simple tasks',
      quality: 'medium',
      speed: 'fast',
      cost: '$0.8-4 per million tokens',
    });

    // Add OpenRouter models if API key is available
    const openRouterKey = req.query.openrouter_key as string;
    if (openRouterKey) {
      try {
        const client = new OpenRouterClient(openRouterKey);
        const openRouterModels = await client.getPopularModels();
        
        openRouterModels.forEach(model => {
          models.push({
            id: model.id,
            name: model.name,
            provider: ModelProvider.OPENROUTER,
            description: model.description || 'OpenRouter model',
            quality: 'medium',
            speed: 'moderate',
            cost: `~$${parseFloat(model.pricing.prompt || '0')}-${parseFloat(model.pricing.completion || '0')} per million tokens`,
          });
        });
      } catch (error) {
        console.warn('Failed to fetch OpenRouter models:', error);
      }
    }

    return res.json({ models });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Chat with OpenRouter
app.post('/api/openrouter/chat', async (req: Request, res: Response) => {
  try {
    const { OpenRouterClient } = await import('../core/openrouter-client.js');
    const { apiKey, model, messages } = req.body;

    if (!apiKey || !model || !messages) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const client = new OpenRouterClient(apiKey);
    const response = await client.chatCompletion(messages, model);

    return res.json({
      response: response.choices[0]?.message?.content || '',
      model: response.model,
      tokensUsed: response.usage.total_tokens,
    });
  } catch (error) {
    console.error('[OpenRouter] Chat error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Stream chat with OpenRouter
app.post('/api/openrouter/chat/stream', async (req: Request, res: Response) => {
  try {
    const { OpenRouterClient } = await import('../core/openrouter-client.js');
    const { apiKey, model, messages } = req.body;

    if (!apiKey || !model || !messages) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const client = new OpenRouterClient(apiKey);
    const stream = client.chatCompletionStream(messages, model);

    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
    return;
  } catch (error) {
    console.error('[OpenRouter] Stream error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Validate API key
app.post('/api/validate-key', async (req: Request, res: Response) => {
  try {
    const { provider, apiKey } = req.body;

    if (provider === 'openrouter') {
      const { OpenRouterClient } = await import('../core/openrouter-client.js');
      const client = new OpenRouterClient(apiKey);
      const isValid = await client.validateKey();
      return res.json({ valid: isValid });
    }

    // Add other provider validation here
    return res.json({ valid: false, error: 'Unknown provider' });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Start server
 */
export async function startServer(path: string) {
  try {
    await initializeData(path);

    app.listen(PORT, () => {
      console.log(`\n🚀 Claude Explorer running at http://localhost:${PORT}`);
      console.log(`   Data path: ${path}`);
      console.log(`\n   Press Ctrl+C to stop\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start if run directly
if (process.argv[1] === __filename) {
  const dataPath = process.env.DATA_PATH || process.argv[2] || process.cwd();
  startServer(dataPath);
}
