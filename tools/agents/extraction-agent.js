import { GoogleGenerativeAI } from "@google/generative-ai";
import { mvpJobSchema } from "../schemas/mvp-job-schema.js";
import { GeminiHelper } from "../utils/gemini-helper.js";

export class ExtractionAgent {
  constructor(apiKey) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: mvpJobSchema,
      },
    });
  }

  async process(naturalLanguageInput) {
    const today = new Date().toISOString().split('T')[0];
    const followUpDate = this.calculateFollowUpDate(today, 14); // 2 weeks default

    const extractionPrompt = `
    You are a meticulous Job Application Extraction Specialist.

  Today's date is ${today}.

  Parse this job application description and extract structured information:
  "${naturalLanguageInput}"

  EXTRACTION GUIDELINES:

  1. COMPANY NORMALIZATION:
    - Extract exact company name as mentioned
    - For Company_normalized: Remove "Inc.", "LLC", "Corp", etc. and convert to title case
    - Example: "acme corp" → Company: "Acme Corp", Company_normalized: "Acme"

  2. ROLE TITLE EXTRACTION:
    - Role_title: Extract the exact role title mentioned
    - Normalize variations: "Sr." → "Senior", "Dev" → "Developer", "Eng" → "Engineer"

  3. STATUS SETTING:
    - Default Status: "applied" (unless user mentions contacting someone directly)
    - If user mentions "reached out", "contacted", "talked to": use "reached_out"
    - If user mentions "interview" or "scheduled": use "interview_scheduled"

  4. PRIORITY CALCULATION:
    - "high": Dream companies, referrals, or urgent deadlines mentioned
    - "medium": Good companies, roles that match well
    - "low": Default for standard applications

  5. DATE HANDLING:
    - Date applied: Use today (${today}) if not specified
    - Follow-up date: Set to ${followUpDate} (2 weeks from today)
    - Last_updated: Always set to today (${today})

  6. CONTACT DETECTION:
    - Contacted recruiter?: true if recruiter name mentioned or "talked to recruiter"
    - Contacted engineer?: true if engineer/employee name mentioned

  7. NOTES ENHANCEMENT:
    - Include any names mentioned (recruiters, employees, contacts)
    - Add specific details about the role, company, or process
    - Mention any unique circumstances or context

  8. SMART DEFAULTS:
     - Careers page link: If not provided, generate from company name (e.g., "apple.com/careers")
     - Notes: If minimal input, add "Application submitted - consider adding more details later"
     - Role link: Use "Not provided - check company careers page"

  9. DATA QUALITY HINTS:
     - If important fields are missing, mention in Notes what to follow up on
     - Example: "Missing: recruiter contact, job posting URL"

  IMPORTANT:
  - Be precise with company and role names - preserve exact spelling
  - Don't hallucinate information not provided
  - Use "applied" status unless clear evidence of further action
  - Set reasonable follow-up dates based on application type

  Return structured JSON matching the schema.
  `;

    try {
      const result = await GeminiHelper.callWithRetry(this.model, extractionPrompt);
      const structured = result.response.text();
      const parsed = JSON.parse(structured);

      // Convert boolean fields to Yes/No for sheet compatibility
      parsed["Contacted recruiter?"] = parsed["Contacted recruiter?"] ? "Yes" : "No";
      parsed["Contacted engineer?"] = parsed["Contacted engineer?"] ? "Yes" : "No";

      // Validate and set defaults
      parsed.Status = parsed.Status || "applied";
      parsed.Priority = parsed.Priority || "medium";
      parsed.Last_updated = today;

      return {
        success: true,
        data: parsed,
        agent: "extraction",
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        agent: "extraction",
        timestamp: new Date().toISOString()
      };
    }
  }

  calculateFollowUpDate(startDate, daysToAdd) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + daysToAdd);
    return date.toISOString().split('T')[0];
  }

  // Utility method to normalize company names for duplicate detection
  normalizeCompany(companyName) {
    return companyName
      .toLowerCase()
      .replace(/\b(inc|llc|corp|corporation|ltd|limited|co)\b\.?/g, '')
      .replace(/[^\w\s]/g, '')
      .trim()
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // Utility method to normalize role titles
  normalizeRole(roleTitle) {
    const normalizations = {
      'sr': 'senior',
      'sr.': 'senior',
      'dev': 'developer',
      'eng': 'engineer',
      'engr': 'engineer',
      'swe': 'software engineer',
      'fe': 'frontend',
      'be': 'backend',
      'fs': 'fullstack',
      'full stack': 'fullstack',
      'full-stack': 'fullstack'
    };

    let normalized = roleTitle.toLowerCase();

    Object.entries(normalizations).forEach(([key, value]) => {
      const regex = new RegExp(`\\b${key}\\b`, 'g');
      normalized = normalized.replace(regex, value);
    });

    return normalized
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
