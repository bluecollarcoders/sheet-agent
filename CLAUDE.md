# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

sheet-agent is a Node.js CLI tool that integrates Google Sheets with AI-powered job application tracking. It uses Google's Generative AI (Gemini 2.5 Flash) to extract structured job data from natural language input and manages Google Sheets operations via the Google Sheets API.

## Development Commands

### Setup and Installation
```bash
npm install
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/google-sheets.json
export GOOGLE_AI_KEY=your_google_ai_api_key
```

### Core CLI Commands
```bash
# Initialize job tracker with predefined headers
node tools/sheets.js setup-tracker [sheetAliasOrId]

# AI-powered job entry addition
node tools/ai-add-job.js "Applied to Acme Corp for senior engineer role, contacted recruiter John"

# Manual sheet operations
node tools/sheets.js read <sheetAliasOrId> <range>
node tools/sheets.js append <sheetAliasOrId> <jsonObject>
node tools/sheets.js update <sheetAliasOrId> <range> <json2DArray>

# Using executable shortcuts (when bin/ is in PATH)
add-job "job description"
setup-job-tracker
read-sheet default 'Sheet1!A1:H10'
append-row default '{"Company": "Acme", "Notes": "Interesting role"}'
```

### Testing Individual Components
```bash
# Test Google Sheets API connection
node tools/sheets.js read default 'Sheet1!A1:A1'

# Test AI extraction without writing to sheet
node -e "
import('./tools/ai-add-job.js').then(module => {
  // Test AI extraction logic without the CLI wrapper
});
"
```

## Architecture

### Project Structure
- **bin/**: Executable bash wrappers for CLI commands
- **tools/**: Core Node.js implementation
  - `sheets.js`: Google Sheets API operations and CLI handler
  - `ai-add-job.js`: AI extraction pipeline with Gemini integration
- **config/sheets.json**: Sheet ID mappings and aliases
- **secrets/google-sheets.json**: Google service account credentials (not in git)

### Core Components

#### Google Sheets Integration (tools/sheets.js)
- Handles all CRUD operations via Google Sheets API v4
- Supports sheet aliases through config/sheets.json
- Predefined job tracker schema with headers: Company, Careers page link, Role link, Date applied, Contacted recruiter?, Contacted engineer?, Notes, Follow-up date
- Commands: setup-tracker, read, append, update
- Flexible input parsing (arrays, objects, JSON strings)

#### AI Job Extraction (tools/ai-add-job.js)
- Uses Google Generative AI (Gemini 2.5 Flash) with structured output
- Converts natural language to JSON matching job tracker schema
- Boolean fields automatically converted to "Yes"/"No" strings
- Integrates with sheets.js via append-row command
- Requires GOOGLE_AI_KEY environment variable

#### Configuration System
- **config/sheets.json**: Maps aliases to Google Sheet IDs
- Supports "default" sheet for operations without explicit sheet selection
- **Environment variables**: GOOGLE_APPLICATION_CREDENTIALS, GOOGLE_AI_KEY
- **Credentials**: Google service account JSON with Sheets API scope

### Data Flow
1. User provides natural language job description
2. AI extraction converts to structured JSON
3. Data validation against predefined schema
4. Automatic append to configured Google Sheet
5. Boolean conversion for sheet compatibility

## Key Implementation Details

### Job Tracker Schema
The application expects these exact column headers in order:
```javascript
["Company", "Careers page link", "Role link", "Date applied",
 "Contacted recruiter?", "Contacted engineer?", "Notes", "Follow-up date"]
```

### Sheet Resolution Logic
- First checks config/sheets.json for alias mapping
- Falls back to direct Google Sheet ID if no alias found
- Uses "default" entry when no sheet specified

### AI Schema Enforcement
- Structured output with SchemaType validation
- Required fields: Company (string)
- Optional fields: All other tracker columns
- Boolean fields converted to "Yes"/"No" strings for Google Sheets compatibility

### Error Handling Patterns
- Missing credentials: Exits with error message
- Invalid sheet references: Google API error propagation
- AI extraction failures: JSON parsing error handling
- Network issues: Relies on googleapis retry logic

## Environment Configuration

### Required Environment Variables
```bash
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
GOOGLE_AI_KEY=your_google_generative_ai_key
```

### Optional Configuration
- **tools/.env**: Local environment file loaded by dotenv
- **config/sheets.json**: Sheet alias mappings

### Google Service Account Setup
The service account JSON must have:
- Google Sheets API enabled
- Editor access to target spreadsheets
- Scopes: `https://www.googleapis.com/auth/spreadsheets`

## Technology Stack

- **Runtime**: Node.js with ES modules (`"type": "module"`)
- **APIs**: Google Sheets API v4, Google Generative AI
- **Dependencies**: googleapis (^171.4.0), @google/generative-ai (^0.24.1), dotenv (^17.4.1)
- **AI Model**: Gemini 2.5 Flash for structured data extraction
- **Authentication**: Google service account with JSON key file

## Common Patterns

### Adding New Sheet Operations
1. Extend the CLI argument parsing in tools/sheets.js
2. Add corresponding function with Google Sheets API calls
3. Update usage() function with new command syntax
4. Create executable wrapper in bin/ if needed

### Modifying AI Extraction Schema
1. Update schema object in tools/ai-add-job.js
2. Ensure field names match Google Sheet headers exactly
3. Handle data type conversions (especially booleans to "Yes"/"No")
4. Test with various natural language inputs

### Sheet Configuration Management
- Add new sheet aliases to config/sheets.json
- Use descriptive aliases (e.g., "leads", "applications", "interviews")
- Always maintain a "default" entry for operations without sheet specification