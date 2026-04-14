# Sheet Agent

AI-powered job application tracker with Google Sheets integration and multi-agent orchestration. Transform natural language job descriptions into structured tracking data with intelligent duplicate detection.

## Overview

Sheet Agent bridges the gap between AI assistants and job search management by providing:

- **Natural Language Processing**: Convert "I just applied to Stripe for a backend engineer role" into structured job data
- **Multi-Agent Intelligence**: Two specialized AI agents handle extraction and duplicate detection
- **MCP Server Integration**: Any AI assistant (Claude, Gemini, etc.) can use the job tracker via MCP protocol
- **Google Sheets Backend**: Automatic updates to your job application spreadsheet
- **Duplicate Prevention**: Conservative duplicate detection prevents embarrassing repeat applications

## Quick Start

### Prerequisites

- Node.js 18+
- Google Cloud service account with Sheets API access
- Google AI API key (Gemini)
- GitHub CLI (optional, for setup)

### Installation

1. **Clone and install:**
```bash
git clone https://github.com/bluecollarcoders/sheet-agent.git
cd sheet-agent
npm install
```

2. **Configure Google Sheets:**
```bash
# Copy example configuration
cp config/sheets.json.example config/sheets.json

# Edit with your Google Sheet ID
# Get sheet ID from URL: docs.google.com/spreadsheets/d/{SHEET_ID}/edit
```

3. **Set up credentials:**
```bash
# Set environment variables
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/service-account.json
export GOOGLE_AI_KEY=your_google_ai_api_key

# Or create tools/.env file:
echo "GOOGLE_AI_KEY=your_api_key_here" > tools/.env
```

4. **Initialize job tracker:**
```bash
node tools/sheets.js setup-tracker
```

## Usage

### Direct CLI Usage

```bash
# Add job application with AI extraction
node tools/ai-add-job.js "Applied to Stripe for senior backend engineer role"

# Manual sheet operations
node tools/sheets.js read default 'Sheet1!A1:H10'
node tools/sheets.js append default '{"Company": "Acme", "Role": "Engineer"}'
```

### MCP Server Integration (Claude Desktop)

The MCP server automatically starts when needed and integrates with Claude Desktop:

```bash
# Configure Claude Desktop (claude_desktop_config.json)
{
  "mcpServers": {
    "sheet-agent": {
      "command": "/Users/YOUR_USERNAME/.nvm/versions/node/v22.20.0/bin/node",
      "args": ["/Users/YOUR_USERNAME/sheet-agent/mcp-server/server.js"]
    }
  }
}

# Then in Claude Desktop, simply say:
# "I just applied to Anthropic for AI Safety Engineer position"
# The system will automatically extract, check duplicates, and update your sheet!
```

## Features

### Core Features (Production Ready)
- ✅ **Multi-Agent Intelligence**: Two specialized AI agents (extraction + duplicate detection)
- ✅ **Claude Desktop Integration**: Full MCP protocol support for seamless AI assistant access
- ✅ **Smart Duplicate Prevention**: Conservative algorithm prevents embarrassing repeat applications
- ✅ **Google Sheets Backend**: Real-time updates with enhanced job tracking schema
- ✅ **Natural Language Processing**: Convert casual descriptions into structured data
- ✅ **Auto-Start Architecture**: MCP server management with process detection and recovery
- ✅ **Cross-Platform Compatibility**: Node.js environment resolution and ES module support

### Phase 1 MVP (✅ Completed)
- ✅ Multi-agent pipeline (extraction + duplicate detection)
- ✅ MCP server for AI assistant integration
- ✅ Conservative duplicate detection with confidence scoring
- ✅ Enhanced data schema with status tracking
- ✅ Hybrid response format (JSON + human messages)
- ✅ Claude Desktop integration via MCP protocol
- ✅ Auto-start process management
- ✅ Cross-platform Node.js environment compatibility

### Phase 2 Roadmap
- 📋 Advanced status workflow management
- 📋 Follow-up scheduling and reminders
- 📋 Application analytics and insights
- 📋 Multi-agent orchestration with strategy advisor
- 📋 Company research integration

## Architecture

### Current System
```
Natural Language Input
    ↓
Google Generative AI (Gemini 2.5 Flash)
    ↓
Structured JSON Extraction
    ↓
Google Sheets API
    ↓
Job Tracker Spreadsheet
```

### Production Multi-Agent Pipeline
```
Claude Desktop / Natural Language Input
    ↓
MCP Protocol (JSON-RPC)
    ↓
Auto-Start Process Manager
    ↓
┌─────────────────────────────────┐
│ Agent 1: Extraction Specialist │ → Extract company, role, date, status
└─────────┬───────────────────────┘
          ↓
┌─────────────────────────────────┐
│ Agent 2: Duplicate Detective    │ → Compare with existing applications
└─────────┬───────────────────────┘
          ↓
Google Sheets API Update + Response to Claude
```

## Data Schema

### Job Tracker Columns
| Column | Type | Description |
|--------|------|-------------|
| Company | String | Company name (normalized) |
| Careers page link | String | Company careers URL |
| Role link | String | Specific job posting URL |
| Date applied | String | Application date |
| Contacted recruiter? | Yes/No | Recruiter outreach status |
| Contacted engineer? | Yes/No | Engineer outreach status |
| Notes | String | Additional context |
| Follow-up date | String | Next action date |

### Phase 1 Additions
| Column | Type | Description |
|--------|------|-------------|
| Status | Enum | Application status (applied, interviewed, etc.) |
| Duplicate_check | String | Duplicate detection confidence |
| Last_updated | ISO Date | Last modification timestamp |

## Configuration

### Google Sheets Setup

1. **Create Google Cloud Project:**
   - Enable Google Sheets API
   - Create service account
   - Download credentials JSON

2. **Create Job Tracker Spreadsheet:**
   - Create new Google Sheet
   - Share with service account email (Editor access)
   - Copy sheet ID from URL

3. **Update Configuration:**
```json
// config/sheets.json
{
  "default": "1Y_wNrYKTYujw6TEVb1VI7DHsnCjSdPmhxEzpt9J31hI",
  "leads": "another_sheet_id_for_leads",
  "interviews": "sheet_id_for_interview_tracking"
}
```

### Environment Variables
```bash
# Required
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
GOOGLE_AI_KEY=your_google_generative_ai_key

# Optional (loaded from tools/.env if present)
# GOOGLE_AI_KEY can also be set in tools/.env file
```

## CLI Commands

### Executable Scripts (when bin/ is in PATH)
```bash
add-job "Applied to Acme Corp for engineering role"
setup-job-tracker
read-sheet default 'Sheet1!A1:H10'
append-row default '{"Company": "Stripe", "Notes": "Interesting role"}'
update-cell default 'Sheet1!A1' 'New Value'
```

### Direct Node.js Usage
```bash
# Setup job tracker headers
node tools/sheets.js setup-tracker [sheetAlias]

# Read data
node tools/sheets.js read <sheetAlias> <range>

# Append data
node tools/sheets.js append <sheetAlias> <jsonData>

# Update cells
node tools/sheets.js update <sheetAlias> <range> <json2DArray>

# AI-powered job addition
node tools/ai-add-job.js "job description"
```

## Development

### Project Structure
```
sheet-agent/
├── bin/                    # Executable CLI scripts
├── tools/                  # Core Node.js implementation
│   ├── sheets.js          # Google Sheets operations
│   ├── ai-add-job.js      # AI extraction pipeline
│   └── .env               # Local environment variables
├── config/                # Configuration files
│   ├── sheets.json        # Sheet ID mappings (gitignored)
│   └── sheets.json.example # Configuration template
├── secrets/               # Credentials (gitignored)
├── mcp-server/           # MCP server implementation (Phase 1)
└── docs/                 # Implementation plans
```

### Running Tests
```bash
# Test Google Sheets connection
node tools/sheets.js read default 'Sheet1!A1:A1'

# Test AI extraction
node tools/ai-add-job.js "Applied to test company for test role"

# Test MCP server (Phase 1)
node mcp-server/server.js
```

### Contributing

1. **Fork the repository**
2. **Create feature branch:** `git checkout -b feature/amazing-feature`
3. **Make changes and test thoroughly**
4. **Commit with clear messages:** `git commit -m 'Add amazing feature'`
5. **Push to branch:** `git push origin feature/amazing-feature`
6. **Open Pull Request**

## Technology Stack

- **Runtime:** Node.js with ES modules
- **AI:** Google Generative AI (Gemini 2.5 Flash)
- **Sheets:** Google Sheets API v4
- **Authentication:** Google service account
- **Dependencies:** googleapis, @google/generative-ai, dotenv
- **Protocol:** MCP (Model Context Protocol) for AI integration

## Cost Analysis

### Free Tier Usage
- **Google Sheets API:** Free (100 requests/100 seconds)
- **Gemini 2.5 Flash:** Free tier (15 RPM, 1M TPM)
- **Typical usage (50 jobs/month):** ~25,000 tokens = $0

### Infrastructure
- **MCP Server:** Local process, no hosting costs
- **Google Cloud:** Service account and API usage only
- **Total monthly cost:** $0 for typical personal use

## Troubleshooting

### Common Issues

**"Missing GOOGLE_APPLICATION_CREDENTIALS"**
```bash
# Set the environment variable
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

**"Permission denied" on Google Sheets**
```bash
# Verify service account has Editor access to the sheet
# Check that sheet ID in config/sheets.json is correct
```

**"API key not valid" errors**
```bash
# Verify Google AI API key is correct
# Check that Generative AI API is enabled in Google Cloud Console
```

**Empty sheet after setup-tracker**
```bash
# Verify sheet ID points to correct sheet
# Check service account permissions
node tools/sheets.js read default 'Sheet1!A1:H1'
```

### Debug Mode
```bash
# Enable verbose logging
DEBUG=* node tools/ai-add-job.js "test job"
```

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Roadmap

- **Phase 1:** Multi-agent pipeline with MCP integration
- **Phase 2:** Advanced workflow management and analytics
- **Phase 3:** Company research and market intelligence
- **Phase 4:** Interview scheduling and preparation assistance

## Support

- **Issues:** [GitHub Issues](https://github.com/bluecollarcoders/sheet-agent/issues)
- **Discussions:** [GitHub Discussions](https://github.com/bluecollarcoders/sheet-agent/discussions)
- **Documentation:** See [CLAUDE.md](CLAUDE.md) for development guidance