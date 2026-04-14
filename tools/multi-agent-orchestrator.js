import { ExtractionAgent } from "./agents/extraction-agent.js";
import { DuplicateAgent } from "./agents/duplication-agent.js";
import { execFile } from "node:child_process";

class MultiOrchestratorAgent {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.extractionAgent = new ExtractionAgent(apiKey);
        this.duplicateAgent = new DuplicateAgent(apiKey);
    }

    async readExistingJobs() {
        return new Promise((resolve, reject) => {
           execFile("read-sheet", ["default", "Sheet1!A:Z"], (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            try {
                const jobs = JSON.parse(stdout);
                resolve(jobs);
            } catch (parseError) {
                reject(parseError);
            }
           });
        })
        
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
