# Implementation Phase One: MVP Multi-Agent Job Tracker with MCP Integration

## Overview

Phase One creates an MVP that transforms the basic sheet-agent into a multi-agent system with MCP server integration, enabling any AI assistant to process job applications through natural language prompts.

**Target User Experience:**
```
User to any AI (Claude, Gemini, etc.): "I just applied to Stripe for the full stack developer position. The website is stripe.com"
→ AI calls MCP tool
→ Automatic extraction, duplicate detection, and sheet update
→ User gets confirmation with any duplicate warnings
```

## MVP Scope & Decisions

### Architecture Decisions
- **MCP Design:** Hybrid approach - main `process-job-application` tool + individual tools for flexibility
- **Agent Pipeline:** Two-agent system (extraction + conservative duplicate detection)
- **Duplicate Strategy:** Conservative matching (company name + role similarity)
- **Response Format:** Hybrid JSON (structured data + human-readable messages)
- **Timeline:** Ship today

### Core Features
1. ✅ Two-agent pipeline (extraction + duplicate detection)
2. ✅ MCP server with hybrid tool design
3. ✅ Conservative duplicate detection (exact company + similar role)
4. ✅ Enhanced data schema with status tracking
5. ✅ Integration with existing Google Sheets workflow

## Two-Agent Pipeline Architecture

```
Natural Language Input
    ↓
┌─────────────────────────────────────────┐
│ Agent 1: Enhanced Extraction Specialist │
│ - Parse job application details         │
│ - Extract structured information        │
│ - Validate and normalize data           │
│ - Set initial status and dates          │
└─────────────┬───────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ Agent 2: Conservative Duplicate Detector│
│ - Read existing applications            │
│ - Compare company names (exact match)   │
│ - Compare role titles (similarity)      │
│ - Flag potential duplicates             │
└─────────────┬───────────────────────────┘
              ↓
    Decision & Sheet Update
```

## Enhanced Data Schema

### Updated Job Tracker Columns
```javascript
const mvpJobSchema = {
  // Existing columns (unchanged)
  "Company": { type: "string", required: true },
  "Careers page link": { type: "string" },
  "Role link": { type: "string" },
  "Date applied": { type: "string" },
  "Contacted recruiter?": { type: "boolean" → "Yes/No" },
  "Contacted engineer?": { type: "boolean" → "Yes/No" },
  "Notes": { type: "string" },
  "Follow-up date": { type: "string" },

  // New MVP columns
  "Status": {
    type: "string",
    enum: ["applied", "reached_out", "phone_screen", "interviewed", "rejected"],
    default: "applied"
  },
  "Duplicate_check": {
    type: "string",
    description: "Confidence level of duplicate detection"
  },
  "Last_updated": { type: "string", format: "ISO date" }
};
```

## File Structure

### Phase One Implementation
```
sheet-agent/
├── tools/
│   ├── ai-add-job.js                 # Enhanced with two-agent pipeline
│   ├── multi-agent-processor.js      # Core orchestration logic
│   ├── agents/
│   │   ├── extraction-agent.js       # Enhanced extraction with status
│   │   └── duplicate-agent.js        # Conservative duplicate detection
│   ├── schemas/
│   │   └── mvp-job-schema.js         # Updated schema definition
│   └── utils/
│       ├── sheet-helpers.js          # Sheet operation utilities
│       └── duplicate-matcher.js      # Duplicate detection logic
├── mcp-server/
│   ├── server.js                     # MCP server implementation
│   ├── package.json                  # MCP-specific dependencies
│   └── tools/
│       ├── process-job-application.js # Main MCP tool
│       ├── get-job-applications.js   # Read applications
│       └── update-job-status.js      # Status management
├── config/
│   ├── sheets.json                   # User's sheet configuration (gitignored)
│   ├── sheets.json.example           # Template for setup
│   └── agent-prompts.js              # Agent persona definitions
└── README.md                         # Updated setup instructions
```

## Implementation Timeline

### Phase 1A: Two-Agent Pipeline (4-5 hours)
**Step 1:** Enhanced Extraction Agent (1.5 hours)
- Extend existing `ai-add-job.js` with status setting
- Add initial application status ("applied")
- Set follow-up date (2 weeks from application)
- Normalize company names and role titles

**Step 2:** Duplicate Detection Agent (2 hours)
- Create conservative matching algorithm
- Compare company names (exact match, case-insensitive)
- Compare role titles (fuzzy matching with high threshold)
- Return confidence scores and recommendations

**Step 3:** Multi-Agent Orchestrator (1.5 hours)
- Create pipeline to chain agents sequentially
- Handle agent communication and data flow
- Implement error handling and fallback logic
- Add logging and debugging output

### Phase 1B: MCP Server Integration (3-4 hours)
**Step 4:** MCP Server Framework (2 hours)
- Set up MCP server with auto-assigned port
- Implement tool discovery and registration
- Create connection handling and error management
- Add server lifecycle management

**Step 5:** MCP Tools Implementation (2 hours)
- `process-job-application`: Main natural language tool
- `get-job-applications`: Read existing applications
- `update-job-status`: Individual status updates
- Implement hybrid response format (JSON + human messages)

## Detailed Implementation

### Agent 1: Enhanced Extraction Specialist

**Enhanced Responsibilities:**
```javascript
// tools/agents/extraction-agent.js
class ExtractionAgent {
  async process(naturalLanguageInput) {
    const extractionPrompt = `
    You are a meticulous Job Application Extraction Specialist.

    Parse this job application description and extract structured information:
    "${naturalLanguageInput}"

    Requirements:
    - Set initial status as "applied"
    - Calculate follow-up date (2 weeks from today)
    - Normalize company names (proper case, no "Inc.", "LLC", etc.)
    - Extract role title exactly as mentioned
    - Infer application date if not specified (use today)
    - Fill in available links and contact information

    Return JSON matching the job tracker schema.
    `;

    return await this.callGemini(extractionPrompt, mvpJobSchema);
  }
}
```

### Agent 2: Conservative Duplicate Detector

**Duplicate Detection Logic:**
```javascript
// tools/agents/duplicate-agent.js
class DuplicateAgent {
  async checkDuplicates(newJob, existingJobs) {
    const duplicatePrompt = `
    You are a Conservative Duplicate Detection Expert.

    New application: ${JSON.stringify(newJob)}
    Existing applications: ${JSON.stringify(existingJobs)}

    Detection criteria:
    - Company name must match exactly (case-insensitive)
    - Role title should be similar (>80% similarity)
    - Consider role variations: "Engineer"="Developer", "Sr."="Senior"

    Be conservative - only flag obvious duplicates to avoid false positives.

    Return JSON: {
      "isDuplicate": boolean,
      "confidence": 0.0-1.0,
      "matchedJob": {...} or null,
      "reason": "explanation"
    }
    `;

    return await this.callGemini(duplicatePrompt, duplicateSchema);
  }
}
```

### MCP Tool: Process Job Application

**Main MCP Tool Implementation:**
```javascript
// mcp-server/tools/process-job-application.js
export const processJobApplication = {
  name: "process_job_application",
  description: "Process a natural language job application description, extract data, check for duplicates, and update Google Sheets",
  inputSchema: {
    type: "object",
    properties: {
      description: {
        type: "string",
        description: "Natural language description of job application (e.g., 'I just applied to Stripe for the full stack developer position. The website is stripe.com')"
      }
    },
    required: ["description"]
  },

  async execute({ description }) {
    try {
      // Run two-agent pipeline
      const result = await multiAgentProcessor.process(description);

      return {
        success: true,
        data: {
          jobData: result.extractedJob,
          duplicateCheck: result.duplicateStatus,
          sheetRowId: result.rowNumber,
          status: result.finalStatus
        },
        message: result.duplicateStatus.isDuplicate
          ? `⚠️ Potential duplicate detected (${result.duplicateStatus.confidence * 100}% confidence): ${result.duplicateStatus.reason}. Application ${result.finalStatus === 'added' ? 'added anyway' : 'not added'}.`
          : `✅ Successfully added ${result.extractedJob.Company} - ${result.extractedJob.Role} application to job tracker.`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: `❌ Failed to process job application: ${error.message}`
      };
    }
  }
};
```

## Testing Strategy

### Unit Tests for Two-Agent Pipeline
```bash
# Test extraction agent
node test/agents/test-extraction.js
# Input: "Applied to Google for SWE role"
# Expected: Structured job data with status "applied"

# Test duplicate detection
node test/agents/test-duplicates.js
# Input: New job + existing jobs array
# Expected: Duplicate confidence and reasoning

# Test full pipeline
node test/test-pipeline.js
# Input: Various natural language descriptions
# Expected: Complete processed job data
```

### MCP Server Testing
```bash
# Start MCP server
node mcp-server/server.js

# Test tool registration
curl http://localhost:3000/tools

# Test job processing
curl -X POST http://localhost:3000/tools/process_job_application \
  -H "Content-Type: application/json" \
  -d '{"description": "Applied to Stripe for backend engineer"}'
```

### Integration Testing Scenarios
1. **First Application:** Clean extraction and sheet append
2. **Duplicate Detection:** Same company/role triggers warning
3. **False Positive:** Similar but different roles don't trigger
4. **Error Handling:** Invalid sheet config, API failures
5. **MCP Integration:** AI assistant calling through MCP protocol

## Configuration Setup

### User Setup Process
1. **Install Dependencies:**
```bash
npm install
cd mcp-server && npm install && cd ..
```

2. **Configure Sheets:**
```bash
cp config/sheets.json.example config/sheets.json
# Edit with actual Google Sheet ID
```

3. **Set Environment Variables:**
```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
export GOOGLE_AI_KEY=your_gemini_api_key
```

4. **Initialize Job Tracker:**
```bash
node tools/sheets.js setup-tracker
```

5. **Start MCP Server:**
```bash
node mcp-server/server.js
# Server starts on auto-assigned port, displays connection details
```

### MCP Client Configuration
AI assistants connect via:
```json
{
  "mcpServers": {
    "job-tracker": {
      "command": "node",
      "args": ["/path/to/sheet-agent/mcp-server/server.js"]
    }
  }
}
```

## Success Metrics

### Functional Requirements
- ✅ Natural language job descriptions processed correctly
- ✅ Duplicate applications detected with >90% accuracy
- ✅ False positive rate <10% on duplicate detection
- ✅ Sheet updates complete within 5 seconds
- ✅ MCP tools accessible to AI assistants

### User Experience Requirements
- ✅ Single natural language prompt triggers full workflow
- ✅ Clear feedback on duplicates with actionable options
- ✅ Structured data available for follow-up operations
- ✅ Error messages are helpful and actionable
- ✅ No manual sheet formatting required

### Technical Requirements
- ✅ MCP server starts reliably and handles connections
- ✅ Two-agent pipeline processes jobs consistently
- ✅ Google Sheets API integration remains stable
- ✅ Token usage stays within Gemini Flash free tier
- ✅ Configuration is environment-agnostic

## Cost Analysis

### Token Usage Per Job (Two Agents)
```
Agent 1 (Enhanced Extraction): ~250 tokens
Agent 2 (Duplicate Detection): ~200 tokens
Total per job: ~450 tokens

Daily usage (10 jobs): 4,500 tokens
Monthly usage (300 jobs): 135,000 tokens
Cost: $0 (within Gemini Flash free tier)
```

### Infrastructure Costs
- MCP Server: Local process, no hosting costs
- Google Sheets API: Free tier (100 requests/100 seconds)
- Google AI API: Free tier (15 RPM, 1M TPM)
- Total monthly cost: $0

## Next Steps After MVP

### Immediate Enhancements (Phase 1.5)
- Interactive duplicate handling in MCP responses
- Basic status update workflow
- Simple follow-up date calculations
- Error recovery and retry logic

### Phase Two Integration
- Additional agents (strategy, status management)
- Advanced duplicate detection with fuzzy matching
- Follow-up tracking and reminder system
- Application analytics and insights

## Risk Mitigation

### Technical Risks
- **API Rate Limits:** Implement backoff and queuing
- **Sheet Access Issues:** Validate credentials on startup
- **Agent Inconsistency:** Add response validation and retries
- **MCP Connection Failures:** Graceful error handling and reconnection

### User Experience Risks
- **False Duplicate Flags:** Conservative thresholds and clear reasoning
- **Incomplete Extractions:** Validation prompts and manual review options
- **Configuration Complexity:** Clear setup documentation and error messages
- **Sheet Format Changes:** Schema validation and migration helpers