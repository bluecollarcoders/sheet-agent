import { SchemaType } from "@google/generative-ai";

// Enhanced schema for Phase 1 MVP
export const mvpJobSchema = {
  description: "Enhanced job application details with status tracking",
  type: SchemaType.OBJECT,
  properties: {
    // Existing columns (unchanged)
    "Company": { type: SchemaType.STRING },
    "Careers page link": { type: SchemaType.STRING },
    "Role link": { type: SchemaType.STRING },
    "Date applied": { type: SchemaType.STRING },
    "Contacted recruiter?": { type: SchemaType.BOOLEAN },
    "Contacted engineer?": { type: SchemaType.BOOLEAN },
    "Notes": { type: SchemaType.STRING },
    "Follow-up date": { type: SchemaType.STRING },

    // New Phase 1 columns
    "Status": { type: SchemaType.STRING },
    "Priority": { type: SchemaType.STRING },
    "Role_title": { type: SchemaType.STRING }, // Normalized role title for duplicate detection
    "Company_normalized": { type: SchemaType.STRING }, // Normalized company name
    "Last_updated": { type: SchemaType.STRING }
  },
  required: ["Company", "Date applied", "Status"],
};

// Response schema for duplicate detection
export const duplicateResponseSchema = {
  description: "Duplicate detection analysis result",
  type: SchemaType.OBJECT,
  properties: {
    "isDuplicate": { type: SchemaType.BOOLEAN },
    "confidence": { type: SchemaType.NUMBER },
    "matchedJob": { type: SchemaType.OBJECT },
    "reason": { type: SchemaType.STRING },
    "recommendation": { type: SchemaType.STRING }
  },
  required: ["isDuplicate", "confidence", "reason", "recommendation"]
};

// Status enum for validation
export const validStatuses = [
  "applied",
  "reached_out",
  "phone_screen",
  "interview_scheduled",
  "interviewed",
  "final_round",
  "offer",
  "rejected",
  "withdrawn"
];

// Priority levels
export const validPriorities = ["high", "medium", "low"];