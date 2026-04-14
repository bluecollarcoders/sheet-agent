import { GoogleGenerativeAI } from "@google/generative-ai";
import { duplicateResponseSchema } from "../schemas/mvp-job-schema.js";
import { GeminiHelper } from "../utils/gemini-helper.js";

export class DuplicateAgent {
    constructor(apiKey) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: duplicateResponseSchema,
            },
        });
    }

    async checkDuplicates(newJob, existingJobs) {
        const today = new Date().toISOString().split('T')[0];
        const existingJobData = JSON.stringify(existingJobs);
        const newJobData = JSON.stringify(newJob);

        if (Array.isArray(existingJobs) && existingJobs.length === 0) {
            return {
                isDuplicate: false,
                confidence: 1.0,
                matchedJob: null,
                reason: "No existing jobs found.",
                recommendation: "Safe to add."
            }
        }

        const duplicatePrompt = `
        You are a Conservative Duplicate Detection Expert.
        
        Today's date is ${today}.

        Parse this application and check for duplication information:
        "${newJobData}" "${existingJobData}"

        DUPLICATION GUIDELINES:

        1. COMPANY MATCHING:
            - Remove suffixes: Inc, LLC, Corp, Corporation, Ltd
            - Case insensitive comparison
            - "Apple Inc" matches "apple" matches "APPLE"

        2. ROLE MATCHING:
            - Role_title: Check for the exact match.
            - Normalize variations: "Sr." → "Senior", "Dev" → "Developer", "Eng" → "Engineer"

        3. CONSERVATIVE APPROACH:
            - Only flag obvious duplicates (avoid false positives)
            - Both company AND role must match for high confidence
            - If uncertain, lean toward "not duplicate"
            - Confidence levels:
                - 0.9+ = "Almost certain duplicate"
                - 0.7-0.8 = "Likely duplicate"
                - 0.5-0.6 = "Possible duplicate"
                - Below 0.5 = "Not duplicate"

        4. RESPONSE FORMAT:
            - isDuplicate: true/false
            - confidence: 0.0-1.0 score
            - matchedJob: the matching job object or null
            - reason: clear explanation of your decision
            - recommendation: "Safe to add" or "Review for duplicate"
        
        Return structured JSON matching the schema.
        `;

        try {
            const result = await GeminiHelper.callWithRetry(this.model, duplicatePrompt);
            const structured = result.response.text();
            const parsed = JSON.parse(structured);

            return {
                success: true,
                data: parsed,
                agent: "duplicate",
                timestamp: new Date().toISOString()
            };
 
        } catch (error) {
            return {
                success: false,
                error: error.message,
                agent: "duplicate",
                timestamp: new Date().toISOString()
            }
        }
    }
}
