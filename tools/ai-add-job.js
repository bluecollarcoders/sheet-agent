import { execFile } from "node:child_process";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '.env');

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const GOOGLE_AI_KEY = process.env.GOOGLE_AI_KEY;
const genAI = new GoogleGenerativeAI(GOOGLE_AI_KEY);

// 1. UPDATED SCHEMA: Use keys that match your Google Sheet headers exactly.
const schema = {
  description: "Job application details",
  type: SchemaType.OBJECT,
  properties: {
    "Company": { type: SchemaType.STRING },
    "Careers page link": { type: SchemaType.STRING },
    "Role link": { type: SchemaType.STRING },
    "Date applied": { type: SchemaType.STRING },
    "Contacted recruiter?": { type: SchemaType.BOOLEAN },
    "Contacted engineer?": { type: SchemaType.BOOLEAN },
    "Notes": { type: SchemaType.STRING },
    "Follow-up date": { type: SchemaType.STRING },
  },
  required: ["Company", "Date applied"],
};

async function run() {
  // Using the model you confirmed works
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash", 
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });

  const userInput = process.argv.slice(2).join(" ");
  if (!userInput) return console.error("Please provide job details.");

  // 2. BEEFED UP PROMPT: Provide today's date context (April 12, 2026)
  const today = new Date().toISOString().split('T')[0];
  const prompt = `Today's date is ${today}. Extract job info from: "${userInput}". 
    Include names of recruiters or specific details in the "Notes" field.
    Ensure "Contacted recruiter" is true if a recruiter name is mentioned.`;

  try {
    const result = await model.generateContent(prompt);
    const structured = result.response.text();

    const parsed = JSON.parse(structured);

    parsed["Contacted recruiter?"] =
    parsed["Contacted recruiter?"] ? "Yes" : "No";

    parsed["Contacted engineer?"] =
    parsed["Contacted engineer?"] ? "Yes" : "No";

    const normalized = JSON.stringify(parsed);

    console.log("Structured row:");
    console.log(normalized);

    execFile("append-row", [normalized], (err, stdout, stderr) => {
    if (err) {
        console.error("Append error:", err.message);
        return;
    }

    console.log("Row added ✔");
    });

  } catch (err) {
    console.error("Extraction failed:", err.message);
  }
}

run();
