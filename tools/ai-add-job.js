import { MultiOrchestratorAgent } from "./multi-agent-orchestrator.js";
import { execFile } from "node:child_process";
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
const orchestrator = new MultiOrchestratorAgent(GOOGLE_AI_KEY);

async function run() {

  const userInput = process.argv.slice(2).join(" ");
  if (!userInput) return console.error("Please provide job details.");

  try {
    const result = await orchestrator.process(userInput);
    
    console.log("🤖 Multi-Agent Result:");
    console.log(JSON.stringify(result, null, 2));

    if (!result.success) {
        console.error("❌ Processing failed:", result.error);
        return;
    }

    if (result.isDuplicate) {
        console.log("⚠️  Duplicate detected:", result.duplicateDetails.reason);
        console.log("💡 Recommendation:", result.duplicateDetails.recommendation);
    }

    const jobData = JSON.stringify(result.newJob);

    execFile("append-row", [jobData], (err, stdout, stderr) => {
        if (err) {
            console.error("Append error:", err.message);
            return;
        }
        console.log("✅ Job added to tracker!");
    });

  } catch (err) {
    console.error("❌ Orchestration failed:", err.message);
  }
}

run();
