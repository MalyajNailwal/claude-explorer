# Claude Explorer

> **Never lose context from your Claude.ai conversations again.**
> 
> Claude Explorer turns your scattered chat history into a searchable, explorable knowledge base — with AI-powered search, topic visualization, and smart export. Perfect for recovering lost context, building knowledge bases, or migrating between accounts.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)

---

##  Acknowledgments

This project is an enhanced fork of [paulhshort/claude-explorer](https://github.com/paulhshort/claude-explorer). The original repository provided an excellent foundation for Claude.ai conversation data exploration.

**Significant enhancements, new features, bug fixes, and architectural improvements** have been added by **Malyaj Nailwal** starting from July 2026.

---

## 🆕 What's New (Malyaj Nailwal's Contributions)

###  AI Assistant 2.0
- **Multi-Provider Support** - Use Anthropic (Claude) or OpenRouter (200+ models including GPT-4, Gemini, Llama, etc.)
- **Free Model Access** - Automatic filtering of free-tier models from OpenRouter
- **Interactive Brain Network** - Real conversation visualization with topic-based nodes and connections
- **Two-Column Layout** - AI conversation on the left, neural network visualization on the right
- **Topic Filtering** - Click legend items to filter conversations by topic (Code, Design, AI, Business, etc.)
- **Node Interaction** - Hover for details, click to open full conversation
- **Settings Management** - In-browser API key management with validation

###  Data Persistence & Storage
- **IndexedDB Integration** - Browser-based storage for API keys, chat history, and settings
- **Export/Import Settings** - Backup and restore your configuration
- **Clear All Data** - Nuclear option to wipe everything from the browser

### 🔧 Server Improvements
- **Graceful Startup** - Server starts even without data files present
- **Recursive File Search** - Handles nested ZIP structures from Claude.ai exports
- **Resilient Parser** - Independent file loading, handles missing/corrupted files gracefully
- **Optional Files** - `projects.json` and `users.json` are now optional (auto-created if missing)
- **Multi-Provider Chat Endpoints** - Direct API access to OpenRouter models

### 🎨 UI/UX Enhancements
- **Model Selector** - Dropdown with provider grouping (Anthropic / OpenRouter)
- **Token Usage Display** - See tokens used per response
- **Topic Legend** - Color-coded visualization of conversation categories
- **Responsive Layout** - Stacks vertically on mobile devices
- **Dark Theme for Brain** - Professional gradient background for visualization

### 🐛 Bug Fixes
- Fixed server crash on startup when no data files present
- Fixed ZIP upload failing for nested folder structures
- Fixed duplicate function declarations in frontend
- Fixed TypeScript compilation errors across multiple files
- Fixed API endpoint return type inconsistencies

---

## Original Features

### 🤖 AI-Powered Interface
- **Natural language queries** - Ask questions about your conversations in plain English
- **Intelligent search** - Find conversations by topic, date, or content with typo-tolerant fuzzy matching
- **Context-aware responses** - Multi-turn conversations with conversation memory
- **Auto-export** - Create bundles and exports through natural conversation

### 🔍 Advanced Search & Filtering
- **Full-text indexing** - Lightning-fast search powered by Lunr.js
- **Fuzzy matching** - Find results even with typos using FuseJS
- **Smart ranking** - Most relevant results appear first
- **Rich filters** - Filter by date range, message count, code presence, and more
- **Snippet previews** - See context around your search matches

### 📊 Data Exploration
- Browse all conversations and projects
- View detailed conversation timelines
- Sort by date, message count, or title
- Filter by multiple criteria simultaneously
- Export statistics and analytics

###  Multiple Export Formats

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

---

## Use Cases

###  Professional Use
- **Knowledge Base Creation** - Build searchable archives of AI conversations for team reference
- **Client Documentation** - Export AI-assisted research and deliverables
- **Training Data** - Curate conversation datasets for model fine-tuning
- **Compliance & Audit** - Maintain records of AI interactions for regulatory requirements

### 🎓 Educational Use
- **Learning Analytics** - Track what topics you explore most with AI
- **Study Material** - Export tutorial conversations as study guides
- **Research Organization** - Categorize and search academic discussions

###  Developer Use
- **Code Reference Library** - Build a searchable archive of coding discussions
- **Debugging History** - Track solutions to past bugs and issues
- **Architecture Decisions** - Document design discussions and rationale

### 🎨 Creative Use
- **Content Planning** - Organize brainstorming sessions and creative discussions
- **Writing Portfolio** - Export AI-assisted writing projects
- **Design Documentation** - Archive design process conversations

### 🔄 Migration & Backup
- **Account Migration** - Move conversations between personal and work accounts
- **Data Backup** - Create local backups of your Claude.ai history
- **Cross-Platform Access** - Access your conversations outside the Claude.ai interface

---

## Quick Start

### Prerequisites
- Node.js 18 or higher
- Your Claude.ai export data (see [Getting Your Data](#getting-your-data))
- **Optional**: Claude Code CLI (for Anthropic AI features)
- **Optional**: OpenRouter API key (for 200+ free/paid models)

### Installation

```bash
git clone https://github.com/malyajnailwal/claude-explorer.git
cd claude-explorer
npm install
npm run build
```

### Running the Application

```bash
# Start web server (port 3000)
npm run web

# Development mode (TypeScript watch)
npm run dev

# CLI interface
npm run cli stats
npm run cli search "your query"

# AI Chat interface
npm run login  # Authenticate first
npm run chat
```

### First Time Setup

1. Run `npm run web` to start the server
2. Open `http://localhost:3000` in your browser
3. Click "Choose File" to upload your Claude.ai export ZIP
4. Once loaded, explore conversations via search, filters, or the AI assistant

---

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
- `conversations.json` - All your conversations (required)
- `projects.json` - Claude Projects (optional, auto-created if missing)
- `users.json` - User information (optional, auto-created if missing)

### Directory Structure

```
your-export-folder/
├── conversations.json
├── projects.json (optional)
└── users.json (optional)
```

---

## AI Assistant Features

### Model Selection

The AI Assistant supports multiple providers:

| Provider | Models | Cost | Authentication |
|----------|--------|------|----------------|
| **Anthropic** | Claude Sonnet 4.5, Haiku 4.5 | $0.8-15/m tokens | Claude Code CLI |
| **OpenRouter** | 200+ models (GPT-4, Gemini, Llama, etc.) | Free & paid options | API Key |

### Setting Up OpenRouter (Free Models)

1. Visit [openrouter.ai](https://openrouter.ai) and create an account
2. Go to **Keys** section and generate an API key
3. In Claude Explorer, click the ️ **Settings** button in the AI Assistant tab
4. Paste your OpenRouter API key and click **Save & Validate**
5. Select a free model from the dropdown
6. Start chatting!

### Brain Network Visualization

The right panel shows an interactive visualization of your conversations:

- **Nodes** represent individual conversations
- **Size** indicates message count (larger = more messages)
- **Color** indicates topic category:
  - 🔵 Blue = Code/Programming
  - 🩷 Pink = Design/UI
  -  Purple = AI/Machine Learning
  - 🟢 Green = Business/Meetings
  - 🟡 Amber = Learning/Studying
  - 🔵 Cyan = Writing
  - 🔴 Red = Data/Analysis
  - 🟢 Lime = Personal
  - ⚪ Gray = Other

**Interactions:**
- **Hover** over a node to see conversation details
- **Click** a node to open the full conversation view
- **Click legend items** to filter by topic
- **Connections** show related conversations (same topics)

---

## CLI Usage

### Statistics
```bash
npm run cli stats
```

### Search
```bash
npm run cli search "authentication patterns"
npm run cli search "database schema" --limit 20
npm run cli search "API design" --from 2024-01-01 --min-messages 10
```

### List
```bash
npm run cli list conversations
npm run cli list conversations --sort messages --limit 50
npm run cli list projects
```

### Export
```bash
npm run cli export <uuid> --format markdown -o output.md
npm run cli export <uuid> --format json -o data.json
npm run cli export <uuid> --format bundle -o archive.zip
```

---

## Docker Deployment

### Using Docker Compose

```yaml
volumes:
  - /path/to/your/claude-export:/data:ro
```

```bash
docker-compose up -d
```

### Using Docker CLI

```bash
docker build -t claude-explorer .
docker run -d \
  --name claude-explorer \
  -p 3000:3000 \
  -v "/path/to/your/claude-export:/data:ro" \
  -e DATA_PATH=/data \
  claude-explorer
```

---

## Project Structure

```
claude-explorer/
├── src/
│   ├── core/
│   │   ├── parser.ts              # Data parsing with resilience
│   │   ├── indexer.ts             # Lunr.js search indexing
│   │   ├── filters.ts             # Filtering logic
│   │   ├── context-extractor.ts   # Smart extraction
│   │   ├── fuzzy-search.ts        # Fuzzy matching
│   │   ├── agent-tools.ts         # AI tool definitions
│   │   ├── models.ts              # Multi-provider model config
│   │   ├── openrouter-client.ts   # OpenRouter API wrapper
│   │   ├── storage.ts             # IndexedDB storage manager
│   │   └── exporters/             # Export formats
│   ├── cli/                       # CLI interface
│   ── web/                       # Web interface
│       ├── server.ts              # Express server
│       ── public/                # Frontend (HTML/CSS/JS)
├── dist/                          # Compiled JavaScript
├── Dockerfile
└── docker-compose.yml
```

---

## Configuration

### Environment Variables

Create a `.env` file:
```bash
PORT=3000
DATA_PATH=/path/to/data
```

### Authentication

**Anthropic (Claude Code):**
```bash
npm run login
```

**OpenRouter:**
Configure via the web UI Settings modal (⚙️ button in AI Assistant tab).

---

## Development

### Building
```bash
npm install
npm run build
npm run dev          # Watch mode
npm run web          # Start server
```

### Tech Stack
- **Backend**: TypeScript 5.3, Node.js 18+, Express 4
- **Search**: Lunr.js (full-text), Fuse.js (fuzzy)
- **Frontend**: Vanilla HTML/CSS/JS, Canvas API
- **Storage**: IndexedDB (browser), JSON files (server)
- **AI**: Anthropic SDK, OpenRouter API
- **Deployment**: Docker, Docker Compose

---

## Security & Privacy

- 🔒 **Local-First** - All data processing happens on your machine
- 🚫 **No External Transmission** - Conversations never leave your device (except AI API calls)
- 🔐 **Secure Storage** - API keys stored in browser IndexedDB
- 📦 **Read-Only Docker** - Data mounted as read-only in containers
- ️ **Full Control** - Clear all data anytime from Settings

---

## Troubleshooting

### "Failed to load data"
- Ensure your export contains `conversations.json`
- Or use `-p <path>` to specify the data directory
- Files can be nested in subfolders - the parser searches recursively

### Web server won't start
- Check if port 3000 is already in use
- Set `PORT` environment variable for a different port

### AI chat not working
- **Anthropic**: Run `npm run login` and ensure Claude Code CLI is installed
- **OpenRouter**: Add your API key in Settings and validate it
- Check your internet connection for API calls

### Brain network not showing
- Ensure you've uploaded conversation data
- Check browser console for errors
- Try refreshing the page

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Contributing

This is a personal fork with custom enhancements. For issues related to the original project, please refer to the [upstream repository](https://github.com/paulhshort/claude-explorer).

---

## Author

**Malyaj Nailwal** - Enhanced fork with OpenRouter integration, brain visualization, multi-provider support, and extensive UI/UX improvements.

---

Made with ❤️ by [Paul Short](https://github.com/paulhshort) | Enhanced by [Malyaj Nailwal](https://github.com/malyajnailwal)
