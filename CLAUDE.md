# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

sheet-agent is a multi-agent Node.js system that integrates Google Sheets with AI-powered job application tracking via MCP (Model Context Protocol). It features a two-agent pipeline (extraction + duplicate detection) with MCP server integration, enabling any AI assistant to process job applications through natural language prompts. The system uses Google's Generative AI (Gemini 2.5 Flash) with enhanced schemas, conservative duplicate detection, and automatic Google Sheets management.

## Development Commands

### Setup and Installation
```bash
# Install main dependencies
npm install

# Install MCP server dependencies
cd mcp-server && npm install && cd ..

# Configure environment
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/google-sheets.json
export GOOGLE_AI_KEY=your_google_ai_api_key

# Initialize job tracker with enhanced schema
node tools/sheets.js setup-tracker [sheetAliasOrId]

# Start MCP server (for AI assistant integration)
node mcp-server/server.js
```

### Core CLI Commands
```bash
# AI-powered job entry addition (with multi-agent pipeline and duplicate detection)
node tools/ai-add-job.js "Applied to Acme Corp for senior engineer role, contacted recruiter John"

# Manual sheet operations (unchanged)
node tools/sheets.js read <sheetAliasOrId> <range>
node tools/sheets.js append <sheetAliasOrId> <jsonObject>
node tools/sheets.js update <sheetAliasOrId> <range> <json2DArray>

# Using executable shortcuts (when bin/ is in PATH)
add-job "job description"
read-sheet default 'Sheet1!A1:H10'
append-row default '{"Company": "Acme", "Status": "applied", "Priority": "medium"}'

# MCP server management
node mcp-server/server.js  # Start MCP server for AI assistant integration
```

### MCP Integration Commands
```bash
# Example MCP tool calls (via Claude Desktop or other AI assistants):
# process_job_application: "I just applied to Stripe for the full stack developer position"
# get_job_applications: Retrieve recent job applications (limit: 10)
```

### Testing Individual Components
```bash
# Test Google Sheets API connection
node tools/sheets.js read default 'Sheet1!A1:A1'

# Test individual agents
node -e "
import('./tools/agents/extraction-agent.js').then(module => {
  const agent = new module.ExtractionAgent();
  agent.process('Applied to Stripe for backend engineer');
});
"

# Test multi-agent orchestrator
node -e "
import('./tools/multi-agent-orchestrator.js').then(module => {
  const orchestrator = new module.MultiOrchestratorAgent();
  orchestrator.process('Applied to Google for SWE role');
});
"

# Test MCP server connection
curl -X POST -H 'Content-Type: application/json' \
  --data '{"description": "Applied to Stripe for backend engineer"}' \
  http://localhost:3000/process_job_application
```

## Architecture

### Project Structure
- **bin/**: Executable bash wrappers for CLI commands (updated with absolute Node.js paths)
- **tools/**: Core Node.js implementation
  - `sheets.js`: Google Sheets API operations and CLI handler (unchanged)
  - `ai-add-job.js`: Multi-agent orchestrator integration with MCP server auto-start
  - `multi-agent-orchestrator.js`: Two-agent pipeline coordination
  - **agents/**: Individual AI agents
    - `extraction-agent.js`: Enhanced extraction specialist with normalization
    - `duplication-agent.js`: Conservative duplicate detection agent
  - **schemas/**: Data validation schemas
    - `mvp-job-schema.js`: Enhanced job tracker schema with new fields
  - **utils/**: Utility modules
    - `gemini-helper.js`: API retry logic with exponential backoff
    - `process-manager.js`: MCP server lifecycle management
- **mcp-server/**: MCP (Model Context Protocol) integration
  - `server.js`: MCP server implementation with tool registration
  - `package.json`: MCP-specific dependencies (@modelcontextprotocol/sdk, zod)
- **config/sheets.json**: Sheet ID mappings and aliases
- **secrets/google-sheets.json**: Google service account credentials (not in git)

### Core Components

#### Multi-Agent Pipeline (tools/multi-agent-orchestrator.js)
- **Two-Agent Architecture**: Sequential processing with extraction → duplicate detection
- **Agent 1 (ExtractionAgent)**: Enhanced data extraction with normalization and status setting
- **Agent 2 (DuplicateAgent)**: Conservative duplicate detection with confidence scoring
- **Pipeline Flow**: Natural language → structured data → duplicate check → sheet update
- **Error Resilience**: Exponential backoff, retry logic, process management

#### MCP Server Integration (mcp-server/server.js)
- **Model Context Protocol**: Enables AI assistants to call job tracker tools
- **Registered Tools**:
  - `process_job_application`: Main natural language processing tool
  - `get_job_applications`: Retrieve recent applications (placeholder)
- **Transport**: stdio communication for Claude Desktop and other AI clients
- **Response Format**: Hybrid JSON + human-readable messages
- **Auto-Start**: Managed by ProcessManager in ai-add-job.js

#### Enhanced AI Agents

**ExtractionAgent (tools/agents/extraction-agent.js):**
- Parses natural language job descriptions with advanced normalization
- Sets application status, priority, and follow-up dates automatically
- Company normalization (removes "Inc", "LLC", "Corp", etc.)
- Role title expansion ("Sr" → "Senior", "Dev" → "Developer")
- Detects contacted recruiters/engineers from input
- Uses GeminiHelper for retry resilience

**DuplicateAgent (tools/agents/duplication-agent.js):**
- Conservative duplicate detection to avoid false positives
- Company matching: exact match after normalization
- Role matching: similarity threshold (>80% recommended)
- Confidence scoring (0.0-1.0) with reasoning
- Reads existing jobs via sheets.js integration
- Returns recommendations (safe to add/likely duplicate)

#### Google Sheets Integration (tools/sheets.js)
- **Unchanged core functionality**: CRUD operations via Google Sheets API v4
- Enhanced schema support with new Phase 1 columns
- Supports sheet aliases through config/sheets.json
- Commands: setup-tracker, read, append, update
- Flexible input parsing (arrays, objects, JSON strings)

#### Enhanced Job Extraction (tools/ai-add-job.js)
- **Multi-agent integration**: Uses MultiOrchestratorAgent instead of direct API calls
- **MCP server auto-start**: Checks and starts MCP server if needed via ProcessManager
- **Duplicate detection warnings**: Displays confidence scores and recommendations
- **Sheet integration**: Results piped to append-row command after processing
- **Environment requirements**: GOOGLE_AI_KEY for Gemini API access

#### Configuration System
- **config/sheets.json**: Maps aliases to Google Sheet IDs (unchanged)
- **mcp-server/package.json**: MCP-specific dependencies isolated from main project
- **tools/.env**: Local environment file for GOOGLE_AI_KEY (loaded by dotenv)
- **Environment variables**: GOOGLE_APPLICATION_CREDENTIALS, GOOGLE_AI_KEY
- **Credentials**: Google service account JSON with Sheets API scope

### Data Flow

#### Two-Agent Pipeline Flow
```
Natural Language Input ("Applied to Stripe for backend engineer")
    ↓
[MCP Server] process_job_application tool (if called via AI assistant)
    ↓
[MultiOrchestratorAgent] Pipeline coordination
    ↓
[Agent 1: ExtractionAgent]
    → Parse and extract structured data
    → Normalize company name: "Stripe"
    → Normalize role title: "Backend Engineer"
    → Set status: "applied", priority: "medium"
    → Calculate follow-up date: +2 weeks
    ↓
[Agent 2: DuplicateAgent]
    → Read existing jobs from Google Sheets
    → Compare company names (exact match)
    → Compare role titles (similarity check)
    → Calculate confidence score (0.0-1.0)
    → Generate recommendation
    ↓
[Decision & Sheet Update]
    → Process duplicate warnings
    → Execute append-row command via sheets.js
    → Update Google Sheets with new entry
    ↓
[Response]
    → Success/failure status
    → Extracted job data
    → Duplicate detection results
    → Human-readable messages
```

#### MCP Integration Flow
```
Claude Desktop / AI Assistant
    ↓
MCP Client → MCP Server (stdio transport)
    ↓
Tool: process_job_application
    ↓
Multi-Agent Pipeline (above)
    ↓
Hybrid Response (JSON + messages)
    ↓
AI Assistant → User
```

## Key Implementation Details

### Enhanced Job Tracker Schema (Phase 1)

#### Original Columns (Preserved)
```javascript
["Company", "Careers page link", "Role link", "Date applied",
 "Contacted recruiter?", "Contacted engineer?", "Notes", "Follow-up date"]
```

#### New Phase 1 Columns
```javascript
// Additional columns added in Phase 1
["Status", "Priority", "Role_title", "Company_normalized", "Last_updated"]
```

#### Complete Enhanced Schema
```javascript
const mvpJobSchema = {
  // Original columns (unchanged)
  "Company": { type: "string", required: true },
  "Careers page link": { type: "string" },
  "Role link": { type: "string" },
  "Date applied": { type: "string", format: "YYYY-MM-DD" },
  "Contacted recruiter?": { type: "boolean" → "Yes/No" },
  "Contacted engineer?": { type: "boolean" → "Yes/No" },
  "Notes": { type: "string" },
  "Follow-up date": { type: "string", format: "YYYY-MM-DD" },

  // Phase 1 enhancements
  "Status": {
    type: "enum",
    values: ["applied", "reached_out", "phone_screen", "interview_scheduled",
             "interviewed", "final_round", "offer", "rejected", "withdrawn"],
    default: "applied"
  },
  "Priority": {
    type: "enum",
    values: ["high", "medium", "low"],
    default: "medium"
  },
  "Role_title": {
    type: "string",
    description: "Normalized role title for duplicate detection"
  },
  "Company_normalized": {
    type: "string",
    description: "Normalized company name for matching"
  },
  "Last_updated": {
    type: "string",
    format: "ISO 8601 timestamp"
  }
};
```

### Sheet Resolution Logic
- First checks config/sheets.json for alias mapping
- Falls back to direct Google Sheet ID if no alias found
- Uses "default" entry when no sheet specified

### Multi-Agent Processing Logic

#### Agent Coordination
- **Sequential processing**: Extraction agent → Duplicate agent
- **Conditional execution**: Duplicate agent only runs if extraction succeeds
- **Error isolation**: Agent failures don't crash entire pipeline
- **Result aggregation**: Combined output from both agents

#### Duplicate Detection Algorithm
```javascript
// Conservative matching strategy
function checkDuplicate(newJob, existingJobs) {
  // Step 1: Exact company match (case-insensitive, normalized)
  const companyMatches = existingJobs.filter(job =>
    normalizeCompany(job.Company) === normalizeCompany(newJob.Company)
  );

  // Step 2: Role similarity check (>80% threshold recommended)
  const roleMatches = companyMatches.filter(job =>
    calculateSimilarity(job.Role_title, newJob.Role_title) > 0.8
  );

  // Step 3: Confidence scoring
  if (roleMatches.length > 0) {
    return {
      isDuplicate: true,
      confidence: calculateConfidence(roleMatches[0], newJob),
      matchedJob: roleMatches[0],
      reason: "Exact company match with similar role title"
    };
  }

  return { isDuplicate: false, confidence: 0.0 };
}
```

#### AI Schema Enforcement
- **Zod validation**: MCP server uses Zod schemas for input validation
- **SchemaType validation**: Gemini agents use Google's SchemaType for structured output
- **Required fields**: Company, Date applied, Status (with defaults)
- **Type coercion**: Boolean → "Yes"/"No", dates → ISO strings
- **Field normalization**: Company names and role titles automatically normalized

#### Enhanced Error Handling
- **API Resilience**: GeminiHelper with exponential backoff (2s, 4s, 8s delays)
- **Process Management**: ProcessManager auto-starts MCP server if crashed
- **Agent Isolation**: Individual agent failures return error responses without crashing pipeline
- **Graceful Degradation**: Missing credentials show clear setup instructions
- **Network Issues**: Retry logic for rate limits (429) and service unavailable (503)
- **Validation Errors**: Clear field-level error messages for schema violations

## Environment Configuration

### Required Environment Variables
```bash
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
GOOGLE_AI_KEY=your_google_generative_ai_key
```

### Optional Configuration
- **tools/.env**: Local environment file loaded by dotenv (GOOGLE_AI_KEY)
- **config/sheets.json**: Sheet alias mappings (unchanged from original)
- **mcp-server/package.json**: Isolated MCP dependencies (@modelcontextprotocol/sdk, zod)

### Google Service Account Setup
The service account JSON must have:
- Google Sheets API enabled
- Editor access to target spreadsheets
- Scopes: `https://www.googleapis.com/auth/spreadsheets`

## Technology Stack

- **Runtime**: Node.js with ES modules (`"type": "module"`)
- **APIs**: Google Sheets API v4, Google Generative AI, Model Context Protocol (MCP)
- **Main Dependencies**: googleapis (^171.4.0), @google/generative-ai (^0.24.1), dotenv (^17.4.1)
- **MCP Dependencies**: @modelcontextprotocol/sdk (^1.29.0), zod (^4.3.6)
- **AI Model**: Gemini 2.5 Flash for structured data extraction (two-agent pipeline)
- **Authentication**: Google service account with JSON key file
- **Architecture**: Multi-agent system with MCP server integration

## Common Patterns

### Adding New MCP Tools
1. **Create tool definition** in mcp-server/server.js
2. **Define input schema** using Zod validation
3. **Implement execute function** with error handling
4. **Register tool** in MCP server tool list
5. **Test via AI assistant** or direct MCP client calls

Example:
```javascript
const newTool = {
  name: "update_job_status",
  description: "Update the status of a job application",
  inputSchema: {
    type: "object",
    properties: {
      company: { type: "string" },
      status: { type: "string", enum: ["applied", "interviewed", "offer", "rejected"] }
    },
    required: ["company", "status"]
  },
  async execute({ company, status }) {
    // Implementation here
  }
};
```

### Adding New AI Agents
1. **Create agent file** in tools/agents/
2. **Implement agent class** with process() method
3. **Add to orchestrator** in tools/multi-agent-orchestrator.js
4. **Update schema** in tools/schemas/mvp-job-schema.js if needed
5. **Test individually** before integration

Example agent structure:
```javascript
import { GeminiHelper } from '../utils/gemini-helper.js';

export class NewAgent {
  constructor() {
    this.geminiHelper = new GeminiHelper();
  }

  async process(input) {
    const prompt = `Your agent prompt here: ${input}`;
    return await this.geminiHelper.callWithRetry(prompt, schema);
  }
}
```

### Modifying Enhanced Schema
1. **Update schema definition** in tools/schemas/mvp-job-schema.js
2. **Update Google Sheets headers** via setup-tracker command
3. **Modify extraction agent** prompts to handle new fields
4. **Test data type conversions** (especially booleans to "Yes"/"No")
5. **Update MCP tool schemas** if they use new fields

### Adding Sheet Operations
1. **Extend CLI parsing** in tools/sheets.js (unchanged pattern)
2. **Add Google Sheets API calls** with error handling
3. **Update usage() function** with new command syntax
4. **Create executable wrapper** in bin/ if needed
5. **Ensure absolute Node.js paths** in bin/ scripts for NVM compatibility

### Managing MCP Server Lifecycle
```javascript
// Check if MCP server is running
const isRunning = await ProcessManager.isProcessRunning("mcp-server");

// Start server if needed
if (!isRunning) {
  await ProcessManager.startMCPServer(`node ${serverPath}`);
  await ProcessManager.waitForServer("mcp-server", 5000);
}
```

### Error Recovery Patterns
```javascript
// API retry with exponential backoff
try {
  return await GeminiHelper.callWithRetry(prompt, schema, maxRetries=3);
} catch (error) {
  return { success: false, error: error.message };
}

// Graceful agent pipeline failure
const extractionResult = await extractionAgent.process(input);
if (!extractionResult.success) {
  return { success: false, stage: "extraction", error: extractionResult.error };
}
```

### Sheet Configuration Management
- **Add sheet aliases** to config/sheets.json (unchanged)
- **Use descriptive aliases** (e.g., "leads", "applications", "interviews")
- **Maintain "default" entry** for operations without sheet specification
- **Test sheet access** with service account credentials before deployment

### Claude Desktop MCP Configuration
```json
{
  "mcpServers": {
    "sheet-agent": {
      "command": "node",
      "args": ["/Users/username/sheet-agent/mcp-server/server.js"]
    }
  }
}
```

## Phase 1 Implementation (Complete)

### Multi-Agent System Features
- ✅ **Two-Agent Pipeline**: ExtractionAgent + DuplicateAgent working sequentially
- ✅ **MCP Server Integration**: Full protocol support with tool registration
- ✅ **Conservative Duplicate Detection**: Company + role matching with confidence scores
- ✅ **Enhanced Schema**: Status, Priority, normalized fields, timestamps
- ✅ **Auto-Start Mechanism**: ProcessManager handles MCP server lifecycle
- ✅ **Retry Logic**: GeminiHelper with exponential backoff for API resilience
- ✅ **Hybrid Responses**: JSON data + human-readable messages for AI assistants

### Current Capabilities
```bash
# Example workflow:
User to Claude: "I just applied to Stripe for the full stack developer position"
→ Claude calls MCP tool: process_job_application
→ ExtractionAgent extracts: Company="Stripe", Role="Full Stack Developer", Status="applied"
→ DuplicateAgent checks existing jobs, finds no duplicates
→ Data written to Google Sheets with enhanced fields
→ User receives: "✅ Successfully added Stripe - Full Stack Developer application"
```

### Testing and Validation
- **Individual Agents**: Test extraction and duplicate detection separately
- **Pipeline Integration**: Multi-agent orchestrator handles sequential processing
- **MCP Protocol**: Server responds to stdio transport from AI assistants
- **Error Recovery**: API failures, process crashes, and invalid inputs handled gracefully
- **Sheet Integration**: Enhanced schema works with existing Google Sheets setup

### Implementation Status
- **Commit d83e845**: "Completion of phase one. MCP server integration, helper methods refactored shell scripts."
- **Files Created**: 8 new files (agents, orchestrator, schemas, utils, MCP server)
- **Files Modified**: 3 existing files (ai-add-job.js, bin scripts, README.md)
- **Dependencies Added**: @modelcontextprotocol/sdk, zod (isolated in mcp-server/)
- **Backward Compatibility**: All original CLI commands and sheets.js functionality preserved