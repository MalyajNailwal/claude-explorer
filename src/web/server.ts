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
import { fetchModels, chatCompletion, OpenRouterSettings, OpenRouterMessage } from '../core/openrouter-client.js';
import { tmpdir } from 'os';
import { existsSync as fsExistsSync, readFileSync, writeFileSync } from 'fs';
import multer from 'multer';
import AdmZip from 'adm-zip';
import { existsSync, mkdirSync, rmSync } from 'fs';
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

// Persistent data directory
const SETTINGS_DIR = join(process.env.HOME || process.env.USERPROFILE || '', '.claude-explorer');
const PERSISTENT_DATA_DIR = join(SETTINGS_DIR, 'data');

// OpenRouter settings (persisted to disk)
const SETTINGS_FILE = join(SETTINGS_DIR, 'openrouter-settings.json');
let openRouterSettings: OpenRouterSettings & { savedAt?: string; expiresAt?: string } = { apiKey: '', model: '' };

function loadSettings() {
  try {
    if (fsExistsSync(SETTINGS_FILE)) {
      const raw = readFileSync(SETTINGS_FILE, 'utf-8');
      openRouterSettings = JSON.parse(raw);
    }
  } catch {}
}

function saveSettings(settings: OpenRouterSettings & { savedAt?: string; expiresAt?: string }) {
  if (!fsExistsSync(SETTINGS_DIR)) {
    mkdirSync(SETTINGS_DIR, { recursive: true });
  }
  openRouterSettings = settings;
  writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

loadSettings();

// Configure multer for file uploads (temp during extraction only)
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
  await parser.load();

  indexer = new SearchIndexer();
  indexer.buildIndex(parser.getConversationsWithMessages());

  filterEngine = new FilterEngine();

  console.log(`✓ Loaded data from: ${path}`);
  console.log(`✓ ${parser.getStats().totalConversations} conversations`);
  console.log(`✓ ${parser.getStats().totalProjects} projects`);

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
 * Auto-load persisted data from ~/.claude-explorer/data/
 */
async function tryLoadPersistedData(): Promise<boolean> {
  const convFile = join(PERSISTENT_DATA_DIR, 'conversations.json');
  if (fsExistsSync(convFile)) {
    try {
      console.log(`✓ Found persisted data at: ${PERSISTENT_DATA_DIR}`);
      uploadedDataPath = PERSISTENT_DATA_DIR;
      await initializeData(PERSISTENT_DATA_DIR);
      return true;
    } catch (error) {
      console.log(`⚠ Failed to load persisted data:`, error);
    }
  }
  // No persisted data — create placeholder files in cwd
  for (const file of ['conversations.json', 'projects.json', 'users.json']) {
    const filePath = join(process.cwd(), file);
    if (!fsExistsSync(filePath)) {
      writeFileSync(filePath, '[]', 'utf-8');
    }
  }
  return false;
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
 * OpenRouter Settings & Chat Routes
 */

// In-memory conversation history for OpenRouter chat
let chatHistory: OpenRouterMessage[] = [];
const SYSTEM_PROMPT = `You are an AI assistant for Claude Explorer — a tool that helps users search, explore, and export their Claude.ai conversation history.

You have access to conversation data and can help users:
- Search for conversations by topic, date, or content
- Get details about specific conversations
- Export conversations in various formats (Markdown, JSON, ZIP)
- Create knowledge bases from multiple conversations
- Analyze patterns and topics across conversations

When helping users:
1. Be conversational and helpful
2. Ask clarifying questions if needed
3. Provide clear, actionable responses
4. Reference specific conversations by UUID when relevant
5. Suggest useful next steps`;

// Get current settings (API key masked)
app.get('/api/settings', (_req: Request, res: Response) => {
  res.json({
    apiKey: openRouterSettings.apiKey ? 'sk-or-v1-...' + openRouterSettings.apiKey.slice(-4) : '',
    hasApiKey: !!openRouterSettings.apiKey,
    model: openRouterSettings.model,
    savedAt: openRouterSettings.savedAt || null,
    expiresAt: openRouterSettings.expiresAt || null,
  });
});

// Save settings
app.post('/api/settings', (req: Request, res: Response) => {
  const { apiKey, model, persistDays } = req.body;
  if (apiKey !== undefined) openRouterSettings.apiKey = apiKey;
  if (model !== undefined) openRouterSettings.model = model;

  // Set saved/expiry timestamps
  const now = new Date();
  openRouterSettings.savedAt = now.toISOString();

  if (persistDays && persistDays > 0) {
    const expiry = new Date(now.getTime() + persistDays * 24 * 60 * 60 * 1000);
    openRouterSettings.expiresAt = expiry.toISOString();
  } else {
    openRouterSettings.expiresAt = undefined;
  }

  saveSettings(openRouterSettings);
  res.json({ success: true });
});

// Clear settings
app.post('/api/settings/clear', (_req: Request, res: Response) => {
  openRouterSettings = { apiKey: '', model: '' };
  if (fsExistsSync(SETTINGS_FILE)) {
    rmSync(SETTINGS_FILE);
  }
  res.json({ success: true });
});

// Fetch available models from OpenRouter
app.get('/api/models', async (req: Request, res: Response) => {
  try {
    const apiKey = (req.query.apiKey as string) || openRouterSettings.apiKey;
    if (!apiKey) {
      return res.status(400).json({ error: 'API key required' });
    }
    const models = await fetchModels(apiKey);
    return res.json({ models });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch models',
    });
  }
});

// Check AI assistant status
app.get('/api/assistant/status', (_req: Request, res: Response) => {
  res.json({
    authenticated: !!openRouterSettings.apiKey,
    model: openRouterSettings.model || null,
    provider: openRouterSettings.apiKey ? 'OpenRouter' : null,
  });
});

// Chat with AI assistant via OpenRouter
app.post('/api/assistant/chat', async (req: Request, res: Response) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!openRouterSettings.apiKey) {
      return res.status(400).json({
        error: 'OpenRouter API key not configured. Open Settings to add your key.',
      });
    }

    // Check if key has expired
    if (openRouterSettings.expiresAt) {
      const expiry = new Date(openRouterSettings.expiresAt);
      if (expiry < new Date()) {
        openRouterSettings.apiKey = '';
        openRouterSettings.model = '';
        saveSettings(openRouterSettings);
        return res.status(400).json({
          error: 'Your API key has expired. Please open Settings and re-enter your key.',
        });
      }
    }

    if (!openRouterSettings.model) {
      return res.status(400).json({
        error: 'No model selected. Open Settings to choose a model.',
      });
    }

    // Build messages with context
    const convContext = await buildConversationContext(message);
    const messages: OpenRouterMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT + (convContext ? '\n\n' + convContext : '') },
      ...chatHistory.slice(-20), // last 20 messages for context
      { role: 'user', content: message },
    ];

    console.log(`[OpenRouter Chat] model=${openRouterSettings.model} msg="${message.substring(0, 80)}..."`);

    const response = await chatCompletion(
      { apiKey: openRouterSettings.apiKey, model: openRouterSettings.model },
      messages,
      { temperature: 0.7, max_tokens: 4096 }
    );

    // Save to history
    chatHistory.push({ role: 'user', content: message });
    chatHistory.push({ role: 'assistant', content: response.content });

    // Keep history bounded
    if (chatHistory.length > 40) {
      chatHistory = chatHistory.slice(-40);
    }

    console.log(`[OpenRouter Chat] Response: ${response.content.substring(0, 100)}...`);

    return res.json({
      response: response.content,
      model: response.model,
      usage: response.usage,
    });
  } catch (error) {
    console.error('[OpenRouter Chat] Error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate response',
    });
  }
});

// Clear chat history
app.post('/api/assistant/clear', (_req: Request, res: Response) => {
  chatHistory = [];
  res.json({ success: true });
});

// Build conversation context for the AI
async function buildConversationContext(userMessage: string): Promise<string> {
  if (!parser) return '';
  const parts: string[] = [];

  const stats = parser.getStats();
  parts.push(`Data summary: ${stats.totalConversations} conversations, ${stats.messages.total} messages, ${stats.totalProjects} projects.`);

  // Simple keyword search for context
  try {
    const results = indexer.search(userMessage, 5);
    if (results.length > 0) {
      parts.push('\nRelevant conversations found:');
      for (const r of results) {
        parts.push(`- [${r.conversation.uuid}] "${r.conversation.name || 'Untitled'}" (${r.conversation.chat_messages?.length || 0} messages)`);
      }
    }
  } catch {}

  return parts.join('\n');
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

      // conversations.json is required; projects.json and users.json are optional
      const convPath = join(extractPath, 'conversations.json');
      if (!existsSync(convPath)) {
        rmSync(extractPath, { recursive: true, force: true });
        return res.status(400).json({
          error: 'Invalid Claude.ai export file',
          message: 'Missing conversations.json — this file is required.',
        });
      }

      // Verify conversations.json is valid JSON
      try {
        const convContent = await readFile(convPath, 'utf-8');
        JSON.parse(convContent);
      } catch (parseError) {
        rmSync(extractPath, { recursive: true, force: true });
        return res.status(400).json({
          error: 'Invalid JSON in export files',
          message: parseError instanceof Error ? parseError.message : 'Unknown parsing error',
        });
      }

      // Create empty array files for any missing optional files
      for (const optionalFile of ['projects.json', 'users.json']) {
        const filePath = join(extractPath, optionalFile);
        if (!existsSync(filePath)) {
          const { writeFile } = await import('fs/promises');
          await writeFile(filePath, '[]', 'utf-8');
        }
      }

      // Clear previous persistent data if exists
      if (fsExistsSync(PERSISTENT_DATA_DIR)) {
        rmSync(PERSISTENT_DATA_DIR, { recursive: true, force: true });
      }

      // Copy extracted data to persistent directory
      const { cpSync } = await import('fs');
      cpSync(extractPath, PERSISTENT_DATA_DIR, { recursive: true });

      // Clean up temp extraction
      rmSync(extractPath, { recursive: true, force: true });

      // Update data path and reload
      uploadedDataPath = PERSISTENT_DATA_DIR;
      await initializeData(PERSISTENT_DATA_DIR);

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

// Get persistent data info (path, stats, exists)
app.get('/api/data/info', (_req: Request, res: Response) => {
  try {
    const exists = fsExistsSync(PERSISTENT_DATA_DIR);
    let stats = null;

    if (exists && parser) {
      const s = parser.getStats();
      stats = {
        conversations: s.totalConversations,
        messages: s.messages.total,
        projects: s.totalProjects,
      };
    }

    // Get folder size if exists
    let sizeKB = 0;
    if (exists) {
      try {
        const { statSync } = require('fs');
        const convStat = statSync(join(PERSISTENT_DATA_DIR, 'conversations.json'));
        const projStat = statSync(join(PERSISTENT_DATA_DIR, 'projects.json'));
        const usrStat = statSync(join(PERSISTENT_DATA_DIR, 'users.json'));
        sizeKB = Math.round((convStat.size + projStat.size + usrStat.size) / 1024);
      } catch {}
    }

    res.json({
      exists,
      path: PERSISTENT_DATA_DIR,
      stats,
      sizeKB,
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
    // Remove persistent data
    if (fsExistsSync(PERSISTENT_DATA_DIR)) {
      rmSync(PERSISTENT_DATA_DIR, { recursive: true, force: true });
      console.log(`[Upload] Cleared persistent data from: ${PERSISTENT_DATA_DIR}`);
    }

    uploadedDataPath = null;

    // Create placeholder files in default dataPath so parser can load
    for (const file of ['conversations.json', 'projects.json', 'users.json']) {
      const filePath = join(dataPath, file);
      if (!fsExistsSync(filePath)) {
        writeFileSync(filePath, '[]', 'utf-8');
      }
    }

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
 * Start server
 */
export async function startServer(path: string) {
  try {
    // Try loading persisted data first, fall back to provided path
    const loaded = await tryLoadPersistedData();
    if (!loaded) {
      await initializeData(path);
    }

    app.listen(PORT, () => {
      console.log(`\n🚀 Claude Explorer running at http://localhost:${PORT}`);
      console.log(`   Data path: ${uploadedDataPath || path}`);
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
