import { ExtractionAgent } from "./agents/extraction-agent.js";
import { DuplicateAgent } from "./agents/duplication-agent.js";
import { execFile as execFilePromise } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const readSheetPath = path.resolve(__dirname, "../bin/read-sheet");
const appendRowPath = path.resolve(__dirname, "../bin/append-row");
const execFileCb = promisify(execFilePromise);

class MultiOrchestratorAgent {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.extractionAgent = new ExtractionAgent(apiKey);
        this.duplicateAgent = new DuplicateAgent(apiKey);
    }

    async readExistingJobs() {

       try {
        const { stdout, stderr } = await execFileCb(readSheetPath, ["default", "Sheet1!A:Z"]);

        if (stderr) console.warn("Script Warning:", stderr);

        return JSON.parse(stdout);
       } catch (error) {
        console.error("Failed to read jobs:", error.message);
        throw error;
        
       }
        
    }

    async appendNewJob(newJob = []) {

        const jobData = JSON.stringify(newJob);

        try {
            const { stdout, stderr } = await execFileCb(appendRowPath, ["default", jobData]);
            if (stderr) console.warn("Write Warning:", stderr);

            return JSON.parse(stdout);
        } catch (error) {
            console.error("Failed to read jobs:", error.message);
            throw error;
        }
    }

    async process(naturalLanguageInput) {

        try {
        const extractedResult = await this.extractionAgent.process(naturalLanguageInput);

        if (!extractedResult.success) {
            return extractedResult;
        } 

        const existingJobs = await this.readExistingJobs();

        const newJob = extractedResult.data;

        const duplicateResult= await this.duplicateAgent.checkDuplicates(newJob, existingJobs);

        if (!duplicateResult.data?.isDuplicate) {
            await this.appendNewJob(newJob);
        }

        return {
            success: true,
            newJob: newJob,
            isDuplicate: duplicateResult.data?.isDuplicate || false,
            duplicateDetails: duplicateResult.data,
            timeStamp: new Date().toISOString()
        };
        } catch (error) {
            return {
            success: false,
            error: `Orchestrator error: ${error.message}`,
            agent: "orchestrator",
            timeStamp: new Date().toISOString()
            };
        }
    }
}

export {MultiOrchestratorAgent};
