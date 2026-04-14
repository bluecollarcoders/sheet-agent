# Implementation Phase Two: Multi-Agent Job Search Enhancement

## Overview

Phase Two transforms the sheet-agent from a simple extraction tool into an intelligent job search management system with multi-agent orchestration, duplicate detection, and status workflow management.

## Features to Implement

### 1. Duplicate Detection (Option 2)
- Prevent duplicate job applications
- Fuzzy matching on company + role combinations
- Interactive confirmation prompts
- Confidence scoring for matches

### 2. Status Tracking Workflow (Option 3)
- Application status management (applied, contacted, interview_scheduled, etc.)
- Follow-up scheduling and reminders
- Next action recommendations
- Overdue application tracking

### 3. Multi-Agent Orchestration
- Four specialized AI agents using Gemini Flash
- Sequential pipeline processing
- Role-based prompting for specialized tasks
- Enhanced data enrichment through agent collaboration

### 4. Interactive Data Quality Enhancement
- Detect missing critical information during extraction
- Prompt user for additional details when appropriate
- Optional fields: recruiter contact, job posting URL, interview details
- Smart suggestions based on incomplete data patterns

## Multi-Agent Architecture

```
User Input: "Applied to Stripe for backend engineer role"
    ↓
┌─────────────────────────────────────────────────────────┐
│ Agent 1: Data Extraction Specialist                     │
│ - Parse natural language input                          │
│ - Extract structured job information                    │
│ - Validate required fields                              │
└─────────────────┬───────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────────────────┐
│ Agent 2: Duplicate Detection Expert                     │
│ - Compare with existing applications                    │
│ - Calculate similarity confidence                       │
│ - Flag potential duplicates                             │
└─────────────────┬───────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────────────────┐
│ Agent 3: Career Strategy Advisor                        │
│ - Analyze company/role context                          │
│ - Recommend follow-up timeline                          │
│ - Suggest next actions                                  │
└─────────────────┬───────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────────────────┐
│ Agent 4: Status & Scheduling Manager                    │
│ - Set initial application status                        │
│ - Calculate follow-up dates                             │
│ - Create actionable reminders                           │
└─────────────────┬───────────────────────────────────────┘
                  ↓
            Google Sheets Update
```

## Enhanced Data Schema

### New Columns Added to Job Tracker
```javascript
const enhancedJobSchema = {
  // Existing columns
  "Company": { type: "string", required: true },
  "Careers page link": { type: "string" },
  "Role link": { type: "string" },
  "Date applied": { type: "string" },
  "Contacted recruiter?": { type: "boolean" },
  "Contacted engineer?": { type: "boolean" },
  "Notes": { type: "string" },
  "Follow-up date": { type: "string" },

  // New Phase Two columns
  "Status": {
    type: "string",
    enum: ["applied", "reached_out", "phone_screen", "interview_scheduled",
           "interviewed", "final_round", "offer", "rejected", "withdrawn"]
  },
  "Next_action": { type: "string" },
  "Priority": {
    type: "string",
    enum: ["high", "medium", "low"]
  },
  "Duplicate_confidence": { type: "number", range: "0-1" },
  "Strategy_notes": { type: "string" },
  "Last_updated": { type: "string", format: "ISO date" }
};
```

## Implementation Files Structure

```
sheet-agent/
├── tools/
│   ├── ai-add-job.js                    # Enhanced with orchestrator
│   ├── multi-agent-orchestrator.js      # Core orchestration logic
│   ├── agents/
│   │   ├── extraction-agent.js          # Data extraction specialist
│   │   ├── duplicate-agent.js           # Duplicate detection expert
│   │   ├── strategy-agent.js            # Career strategy advisor
│   │   └── status-agent.js              # Status & scheduling manager
│   ├── status-manager.js                # Status workflow commands
│   ├── duplicate-detector.js            # Fuzzy matching logic
│   └── schemas/
│       ├── enhanced-job-schema.js       # Updated data schema
│       ├── agent-response-schemas.js    # Agent output validation
│       └── status-workflow-schema.js    # Status transition rules
├── bin/
│   ├── add-job                          # Enhanced with multi-agent
│   ├── update-job-status               # NEW: Status management
│   ├── check-followups                 # NEW: Follow-up tracking
│   └── job-insights                    # NEW: Application analytics
└── config/
    └── agent-prompts.json              # Agent persona definitions
```

## New CLI Commands

### Enhanced Job Addition
```bash
# Multi-agent job processing
add-job "Applied to Stripe for senior backend engineer, talked to recruiter Sarah"

# Output example:
# ✓ Extracted job data (Agent 1)
# ⚠ Potential duplicate found: Stripe Backend Engineer (85% confidence)
#   Previous application: 2024-03-15
#   Continue anyway? [y/N]: n
# ✗ Application not added due to duplicate detection
```

### Status Management
```bash
# Update application status
update-job-status "Stripe" "interview_scheduled"
update-job-status "Google" "rejected" --notes "Role filled internally"

# Interactive status update
update-job-status "Acme Corp"
# → Current status: applied
# → Select new status:
#   1) reached_out  2) phone_screen  3) interview_scheduled
#   4) interviewed  5) rejected      6) withdrawn

# Bulk status updates
update-job-status --interactive  # Update multiple jobs at once
```

### Follow-up Tracking
```bash
# Check what needs attention today
check-followups --today
# Output:
# 📋 Follow-ups for 2024-04-13:
# • Stripe (Backend Engineer) - Send thank you email
# • Google (SRE) - Follow up on application status
# • Acme Corp (Frontend) - Schedule technical interview

# Check overdue items
check-followups --overdue
# Output:
# ⚠️  Overdue follow-ups:
# • Meta (Data Scientist) - 3 days overdue: Follow up with recruiter
# • Netflix (ML Engineer) - 1 week overdue: Send application status inquiry

# Show all upcoming follow-ups
check-followups --week
check-followups --all
```

### Application Analytics
```bash
# Basic statistics and insights
job-insights

# Output example:
# 📊 Job Application Analytics
# ═══════════════════════════════════
# Total Applications: 23
# Response Rate: 8/23 (35%)
# Average Response Time: 5.2 days
#
# 📈 Status Breakdown:
# • Applied: 12 (52%)
# • Phone Screen: 3 (13%)
# • Interview Scheduled: 2 (9%)
# • Interviewed: 4 (17%)
# • Rejected: 2 (9%)
#
# 🎯 Top Performing Sectors:
# • Fintech: 60% response rate (3/5)
# • AI/ML: 40% response rate (2/5)
# • Healthcare: 33% response rate (1/3)
#
# ⚡ Recommendations:
# • Focus on fintech companies (highest response rate)
# • 3 applications need follow-up this week
# • Consider reaching out to engineers at non-responsive companies
```

## Agent Prompt Engineering

### Agent 1: Data Extraction Specialist
```javascript
const extractionAgentPrompt = `
You are a meticulous Data Extraction Specialist for job application tracking.

Your role:
- Parse natural language job application descriptions
- Extract structured information with high accuracy
- Identify missing critical information
- Maintain consistency across extractions

Focus on:
- Company name (exact spelling)
- Role title (preserve specific wording)
- Application date (infer if not explicit)
- Contact information mentioned
- Any specific details about the role or process

Be precise but don't hallucinate missing information.
`;
```

### Agent 2: Duplicate Detection Expert
```javascript
const duplicateAgentPrompt = `
You are a Duplicate Detection Expert specializing in job application analysis.

Your role:
- Identify potential duplicate job applications
- Calculate confidence scores for matches
- Consider various matching scenarios:
  * Same company, similar role titles
  * Role title variations (Senior/Sr., Engineer/Developer)
  * Different application dates (reapplications vs duplicates)
  * Different teams within same company

Scoring guidelines:
- 0.9+: Almost certainly duplicate
- 0.7-0.89: Likely duplicate, needs review
- 0.5-0.69: Possible duplicate, flag for awareness
- <0.5: Different applications

Provide clear reasoning for your confidence score.
`;
```

### Agent 3: Career Strategy Advisor
```javascript
const strategyAgentPrompt = `
You are a Career Strategy Advisor with expertise in job search optimization.

Your role:
- Analyze job applications for strategic follow-up planning
- Consider company culture and hiring practices
- Recommend timing for follow-up actions
- Suggest personalized outreach strategies

Consider:
- Company size (startup vs enterprise response times)
- Industry norms (tech vs finance vs healthcare)
- Role seniority (entry vs senior vs executive)
- Application channel (direct vs recruiter vs referral)

Provide actionable, realistic recommendations with appropriate timelines.
`;
```

### Agent 4: Status & Scheduling Manager
```javascript
const statusAgentPrompt = `
You are a Task Management Specialist focused on job search workflow optimization.

Your role:
- Set appropriate initial statuses for applications
- Calculate realistic follow-up dates
- Create specific, actionable next steps
- Prioritize applications based on strategic value

Status assignment logic:
- "applied": Standard online application
- "reached_out": Contacted recruiter/employee directly
- "phone_screen": Initial screening scheduled/completed
- "interview_scheduled": Technical/behavioral interview set

Follow-up timing:
- Initial applications: 1-2 weeks
- After phone screen: 3-5 days
- Post-interview: 1 week
- Rejected/no response: 1 month (for similar roles)

Make recommendations concrete and time-bound.
`;
```

## Implementation Timeline

### Day 1: Core Multi-Agent Framework
**Morning (4 hours):**
- Create `multi-agent-orchestrator.js`
- Implement four agent classes with Gemini Flash integration
- Design agent prompt templates
- Create enhanced data schema

**Afternoon (4 hours):**
- Implement duplicate detection logic
- Create fuzzy matching algorithms
- Add interactive confirmation prompts
- Test agent pipeline with sample data

### Day 2: Status Workflow & CLI Commands
**Morning (4 hours):**
- Build status management system
- Create follow-up scheduling logic
- Implement `update-job-status` command
- Add status transition validation

**Afternoon (4 hours):**
- Create `check-followups` command
- Implement `job-insights` analytics
- Add enhanced CLI outputs with formatting
- Integration testing and bug fixes

## Testing Strategy

### Unit Tests
```bash
# Test individual agents
node test/agents/extraction-agent.test.js
node test/agents/duplicate-agent.test.js
node test/agents/strategy-agent.test.js
node test/agents/status-agent.test.js

# Test orchestration
node test/multi-agent-orchestrator.test.js

# Test duplicate detection
node test/duplicate-detector.test.js
```

### Integration Tests
```bash
# End-to-end job processing
node test/e2e/job-pipeline.test.js

# Status workflow testing
node test/e2e/status-management.test.js

# Follow-up tracking
node test/e2e/followup-system.test.js
```

### Manual Testing Scenarios
1. **Duplicate Detection:** Add same job twice, verify detection
2. **Status Progression:** Test typical application workflow
3. **Follow-up Management:** Verify date calculations and reminders
4. **Agent Responses:** Check consistency across multiple runs
5. **Edge Cases:** Handle malformed input, API failures, empty sheets

## Cost Analysis

### Token Usage Per Job Application
```
Agent 1 (Extraction): ~200 tokens
Agent 2 (Duplicate Check): ~150 tokens
Agent 3 (Strategy): ~100 tokens
Agent 4 (Status Management): ~50 tokens
Total: ~500 tokens per job

Monthly estimate (50 applications): 25,000 tokens
Cost with Gemini Flash free tier: $0.00
```

### API Rate Limits
- Gemini Flash Free Tier: 15 RPM, 1M TPM
- Batch processing: Handle multiple jobs efficiently
- Error handling: Graceful degradation on rate limits

## Success Metrics

### Functional Goals
- ✅ Zero duplicate applications submitted
- ✅ 100% applications have follow-up schedules
- ✅ Status updates completed within 24 hours of changes
- ✅ All overdue follow-ups flagged daily

### User Experience Goals
- ✅ Job addition process feels intelligent and helpful
- ✅ Status management is effortless
- ✅ Follow-up system prevents missed opportunities
- ✅ Analytics provide actionable insights

### Technical Goals
- ✅ Multi-agent pipeline processes jobs in <10 seconds
- ✅ 99%+ uptime with graceful error handling
- ✅ Agent responses are consistent and reliable
- ✅ System scales to hundreds of applications

## Future Enhancement Opportunities

### Phase Three Possibilities
- Company research integration (funding, news, glassdoor ratings)
- Email integration for automatic status updates
- Calendar integration for interview scheduling
- Network analysis (LinkedIn connections at target companies)
- Application optimization (A/B testing different approaches)
- Salary negotiation guidance based on market data

### Advanced Agent Capabilities
- Learning from user feedback to improve recommendations
- Seasonal hiring pattern recognition
- Industry-specific strategy customization
- Automated outreach message generation
- Interview preparation based on company/role analysis

## Interactive Data Quality Enhancement (Future Feature)

### Overview
Add intelligent prompting to gather missing information during job application processing, improving data completeness and follow-up effectiveness.

### User Experience Flow
```bash
add-job "Applied to Apple for iOS Developer"

🤖 Processing job application...
✅ Extracted: Apple - iOS Developer position

⚠️  Missing Information Detected:
   • No recruiter contact mentioned
   • No job posting URL provided
   • No interview details

💡 Would you like to add additional details?

🔍 Add recruiter contact? [y/N]: y
   → Enter recruiter name/email: Sarah Johnson - sarah.j@apple.com

🔗 Add job posting URL? [y/N]: y
   → Enter job posting URL: https://jobs.apple.com/ios-dev-12345

📅 Any interview details? [y/N]: n

✅ Enhanced job application saved with additional context!
```

### Implementation Strategy

#### 1. Data Quality Analysis Agent
```javascript
class DataQualityAgent {
  analyzeCompleteness(jobData) {
    const missing = [];
    if (!jobData["Contacted recruiter?"] || jobData["Contacted recruiter?"] === "No") {
      missing.push("recruiter_contact");
    }
    if (!jobData["Role link"]) {
      missing.push("job_posting_url");
    }
    if (!jobData["Notes"] || jobData["Notes"].length < 20) {
      missing.push("additional_context");
    }
    return missing;
  }
}
```

#### 2. Interactive Prompt System
```javascript
import readline from 'readline/promises';

class InteractiveEnhancer {
  async promptForMissingData(missingFields, jobData) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    for (const field of missingFields) {
      const shouldAdd = await rl.question(`Add ${field}? [y/N]: `);
      if (shouldAdd.toLowerCase() === 'y') {
        const value = await rl.question(`Enter ${field}: `);
        this.enhanceJobData(jobData, field, value);
      }
    }

    rl.close();
    return jobData;
  }
}
```

#### 3. Enhanced Orchestrator Integration
```javascript
// In multi-agent-orchestrator.js
async process(naturalLanguageInput, interactive = false) {
  const extractionResult = await this.extractionAgent.process(naturalLanguageInput);

  if (interactive) {
    const missingFields = this.dataQualityAgent.analyzeCompleteness(extractionResult.data);
    if (missingFields.length > 0) {
      extractionResult.data = await this.interactiveEnhancer.promptForMissingData(
        missingFields,
        extractionResult.data
      );
    }
  }

  // Continue with duplicate detection...
}
```

### CLI Integration
```javascript
// Enhanced ai-add-job.js with interactive flag
async function run() {
  const args = process.argv.slice(2);
  const interactiveMode = args.includes('--interactive') || args.includes('-i');
  const userInput = args.filter(arg => !arg.startsWith('-')).join(' ');

  const result = await orchestrator.process(userInput, interactiveMode);
  // Handle result...
}
```

### Usage Examples
```bash
# Standard mode (current behavior)
add-job "Applied to Netflix for ML Engineer"

# Interactive mode with prompts
add-job --interactive "Applied to Netflix for ML Engineer"
add-job -i "Applied to Netflix for ML Engineer"

# Batch mode with predefined data
add-job "Applied to Netflix for ML Engineer" --recruiter "jane@netflix.com" --url "netflix.com/jobs/ml-123"
```

### Benefits
- ✅ **Improved data quality** - more complete job tracking records
- ✅ **Better follow-ups** - contact information readily available
- ✅ **Optional enhancement** - doesn't disrupt existing workflow
- ✅ **User control** - can skip prompts or use non-interactive mode
- ✅ **Richer context** - better insights and tracking over time

### Technical Considerations
- **Performance**: Interactive mode adds 10-30 seconds depending on user input
- **Automation**: Non-interactive mode preserves scripting capabilities
- **Validation**: Input validation and sanitization for enhanced fields
- **Persistence**: Store enhancement preferences per user
- **Rollback**: Option to edit/correct enhanced data post-submission