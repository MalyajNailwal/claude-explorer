# Claude Explorer

> A powerful tool for parsing, searching, and extracting insights from your Claude.ai conversation history.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)

Claude Explorer helps you unlock the value in your Claude.ai conversation history by providing intelligent search, context extraction, and multiple export formats. Perfect for migrating conversations between accounts, creating knowledge bases for Claude Projects, or simply organizing your AI interactions.

## What's New

This fork includes several enhancements and fixes beyond the original project:

- **OpenRouter Integration** — Bring your own API key and choose from 200+ AI models (GPT-4o, Claude, Gemini, Llama, and more) instead of being locked to a single provider
- **Persistent Data Storage** — Conversation data now persists across server restarts at `~/.claude-explorer/data/`
- **Searchable Model Selector** — Dropdown with model pricing, context length, and provider grouping
- **API Key Persistence** — Save your OpenRouter key with configurable expiry (7, 30, 90 days or indefinite)
- **One-Click Data Reset** — Reset all uploaded data directly from the UI with confirmation
- **Render Deployment Ready** — Includes `render.yaml` and Dockerfile for one-click cloud deployment
- **Improved Error Handling** — Graceful fallback when data files are missing; no more startup crashes

## Features

### 🤖 AI-Powered Interface
- **Natural language queries** — Ask questions about your conversations in plain English
- **Intelligent search** — Find conversations by topic, date, or content with typo-tolerant fuzzy matching
- **Context-aware responses** — Multi-turn conversations with conversation memory
- **Auto-export** — Create bundles and exports through natural conversation
- **OpenRouter support** — Use any AI model from OpenRouter's catalog

### 🔍 Advanced Search & Filtering
- **Full-text indexing** — Lightning-fast search powered by Lunr.js
- **Fuzzy matching** — Find results even with typos using FuseJS
- **Smart ranking** — Most relevant results appear first
- **Rich filters** — Filter by date range, message count, code presence, and more
- **Snippet previews** — See context around your search matches

### 📊 Data Exploration
- Browse all conversations and projects
- View detailed conversation timelines
- Sort by date, message count, or title
- Filter by multiple criteria simultaneously
- Export statistics and analytics

### 📦 Multiple Export Formats

**Markdown**
- Clean, readable format perfect for Claude Projects
- Preserves conversation structure and formatting
- Code blocks with syntax highlighting

**JSON**
- Complete structured data export
- Programmatic access to all conversation data
- Optional metadata inclusion

**Bundle (ZIP)**
- Complete archives with multiple conversations
- Organized folder structure
- Includes both Markdown and JSON formats
- Comprehensive metadata files

### 🎯 Smart Context Extraction
- Automatic topic detection
- Code snippet identification and extraction
- Key decision tracking
- Action item identification
- Entity recognition

### 💻 Triple Interface
- **AI Chat** — Conversational interface powered by Claude Code or OpenRouter
- **CLI** — Fast command-line tool for power users
- **Web UI** — Beautiful browser interface for visual exploration

## Quick Start

### Prerequisites
- Node.js 18 or higher
- Your Claude.ai export data (see [Getting Your Data](#getting-your-data))

### Installation

```bash
git clone https://github.com/MalyajNailwal/claude-explorer.git
cd claude-explorer
npm install
npm run build
```

### Basic Usage

**Web Interface (Recommended)**
```bash
npm run web
# Open http://localhost:3000 in your browser
```

**AI Chat Interface**
```bash
# Set up authentication (one time)
npm run login

# Start chatting
npm run chat
```

**Command Line**
```bash
# Get statistics
npm run cli stats

# Search conversations
npm run cli search "authentication patterns"

# Export a conversation
npm run cli export <uuid> --format markdown -o output.md
```

## Getting Your Data

### Exporting from Claude.ai

1. Log in to [claude.ai](https://claude.ai)
2. Click your profile icon (bottom left)
3. Select **Settings**
4. Navigate to **Data & Privacy**
5. Click **Request data export**
6. Wait for the export email (usually within minutes)
7. Download and extract the ZIP file

Your export will contain:
- `conversations.json` — All your conversations
- `projects.json` — All your Claude Projects
- `users.json` — User information

Place these files in a directory and point Claude Explorer to that directory.

### Directory Structure

```
your-export-folder/
├── conversations.json
├── projects.json
└── users.json
```

## Usage Guide

### AI Chat Interface

The AI chat interface provides a natural way to explore your data:

```bash
npm run chat
```

Example queries:
- "Find conversations about React authentication"
- "Show me all conversations from last month"
- "Create a bundle of my database design discussions"
- "What topics do I discuss most?"
- "Export the top 3 conversations about TypeScript"

### Web Interface

The web interface provides a visual way to explore your conversations:

```bash
npm run web
# Open http://localhost:3000
```

Features:
- 📤 **Upload your Claude.ai export** — Drag and drop ZIP file upload
- Browse all conversations with infinite scroll
- Full-text search with live results
- Advanced filters (date range, message count)
- 📊 **Analytics dashboard** with activity timeline and keyword analysis
- Detailed conversation viewer with syntax highlighting
- One-click export buttons (Markdown, JSON, ZIP)
- Batch export for multiple conversations
- Project explorer
- 🤖 **AI assistant** — Natural language queries via OpenRouter or Claude Code
- ⚙️ **OpenRouter settings** — API key management with persistence and expiry
- 🔄 **Data reset** — One-click reset from the UI

### CLI Interface

The CLI provides fast, scriptable access to your data:

#### Statistics

```bash
npm run cli stats
```

Displays:
- Total conversations and projects
- Message counts and averages
- Date ranges
- Conversations with code
- Active time periods

#### Search

```bash
npm run cli search "database schema"
npm run cli search "authentication" --limit 20
npm run cli search "API design" --from 2024-01-01 --min-messages 10
```

Options:
- `-p, --path <path>` — Path to data directory (default: current directory)
- `-l, --limit <number>` — Maximum results (default: 10)
- `--from <date>` — Filter from date (YYYY-MM-DD)
- `--to <date>` — Filter to date (YYYY-MM-DD)
- `--min-messages <number>` — Minimum message count

#### List

```bash
npm run cli list conversations
npm run cli list conversations --sort messages --limit 50
npm run cli list projects
```

Options:
- `-l, --limit <number>` — Maximum items (default: 20)
- `--sort <field>` — Sort by: date, messages, name (default: date)
- `--messages-only` — Only show conversations with messages

#### Export

```bash
npm run cli export <uuid> --format markdown -o conversation.md
npm run cli export <uuid> --format json -o data.json
npm run cli export <uuid> --format bundle -o archive.zip
```

Options:
- `-f, --format <format>` — Export format: markdown, json, bundle (default: markdown)
- `-o, --output <file>` — Output file path
- `-t, --type <type>` — Type: conversation or project (default: conversation)

Get UUIDs from the `list` or `search` commands.

## Deployment

### Render (Recommended)

1. Create a [Render account](https://render.com)
2. Click **New Web Service**
3. Connect your GitHub repo
4. Render auto-detects `render.yaml` — settings are pre-filled
5. Click **Deploy**

Your app will be live at `https://your-app.onrender.com`.

### Docker

```bash
# Build the image
docker build -t claude-explorer .

# Run the container
docker run -d \
  --name claude-explorer \
  -p 3000:3000 \
  -e DATA_PATH=/data \
  claude-explorer
```

### Docker Compose

```yaml
services:
  claude-explorer:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATA_PATH=/data
      - PORT=3000
```

## Use Cases

### Migrating to a Work Account

1. Export from your personal account
2. Search for work-related conversations
3. Export relevant conversations as Markdown
4. Upload to Claude Projects in your work account

### Creating Knowledge Bases

1. Use AI chat or web UI to find related conversations
2. Export as a bundle (ZIP)
3. Extract and organize the Markdown files
4. Upload to Claude Projects for context

### Code Reference Library

1. Search for technical discussions and implementations
2. Automatically extract code snippets
3. Export with preserved formatting
4. Build a personal code reference library

### Research and Analysis

1. Search across all conversations for patterns
2. Extract key decisions and insights
3. Generate reports and summaries
4. Track your learning journey

## Development

### Project Structure

```
claude-explorer/
├── src/
│   ├── core/              # Shared library
│   │   ├── parser.ts      # Data parsing
│   │   ├── indexer.ts     # Search indexing
│   │   ├── filters.ts     # Filtering logic
│   │   ├── context-extractor.ts  # Smart extraction
│   │   ├── fuzzy-search.ts      # Fuzzy matching
│   │   ├── agent-tools.ts       # AI tool definitions
│   │   └── exporters/           # Export formats
│   ├── cli/               # CLI interface
│   │   ├── index.ts       # CLI entry point
│   │   ├── agent.ts       # AI chat interface
│   │   └── commands/      # Individual commands
│   └── web/               # Web interface
│       ├── server.ts      # Express server
│       └── public/        # Frontend files
├── dist/                  # Compiled JavaScript
├── Dockerfile
├── render.yaml
└── package.json
```

### Building

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Watch mode for development
npm run dev
```

### Running Tests

```bash
npm test
```

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```bash
# Port for web server (default: 3000)
PORT=3000

# Data path (optional, can be passed as CLI argument)
DATA_PATH=/path/to/data
```

### Authentication

The AI chat interface uses Claude Code authentication:

```bash
# Set up authentication (one time)
npm run login
```

This will store your credentials securely in `~/.claude-explorer/auth.json`.

## Troubleshooting

### "Failed to load data"

- Ensure you're in the correct directory with the JSON files
- Or use `-p <path>` to specify the data directory
- Verify your export contains `conversations.json` and `projects.json`

### Web server won't start

- Check if port 3000 is already in use
- Set `PORT` environment variable to use a different port
- Check logs for detailed error messages

### Search returns no results

- Verify conversations have messages
- Try broader search terms
- Check date filters aren't too restrictive
- Ensure search index built successfully

### AI chat not working

- Run `npm run login` to authenticate
- Ensure you have Claude Code CLI installed
- Check your API key or OAuth token is valid

## Performance

- Handles large exports (tested with 700+ conversations)
- Fast full-text search using Lunr.js indexing
- Efficient filtering and sorting algorithms
- Lightweight Alpine Linux Docker images (~200MB)
- Optimized for minimal memory usage

## Security

- Data mounted read-only in Docker
- No data sent to external services (except AI features)
- OAuth tokens stored securely
- Local processing only
- User data never leaves your machine

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Original project by [Paul Short](https://github.com/paulhshort)
- Built with [Node.js](https://nodejs.org/) and [TypeScript](https://www.typescriptlang.org/)
- Search powered by [Lunr.js](https://lunrjs.com/) and [FuseJS](https://fusejs.io/)
- Web interface uses [Express](https://expressjs.com/)
- AI features powered by [Claude API](https://www.anthropic.com/claude) and [OpenRouter](https://openrouter.ai/)

## Support

- Report issues on [GitHub Issues](https://github.com/MalyajNailwal/claude-explorer/issues)
- Star the repo if you find it useful!

## Roadmap

- [ ] Advanced analytics dashboard
- [ ] Conversation comparison tools
- [ ] Custom export templates
- [ ] Conversation tagging system
- [ ] GraphQL API
- [ ] Real-time collaboration features
- [ ] Mobile app (Capacitor)

---

Made with ❤️ by [Malyaj Nailwal](https://github.com/MalyajNailwal)
