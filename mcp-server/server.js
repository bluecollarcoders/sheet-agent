#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { z } from 'zod';
import { MultiOrchestratorAgent } from "../tools/multi-agent-orchestrator.js";

// Intialize Mcp Server.
const server = new McpServer({
    name: "sheet-agent",
    version: "1.0.0",
});

// Register tools using high-level API.
server.registerTool(
    "process_job_application",
    {
        description: "Extract data, check duplicate, and update sheets from natural language",
        inputSchema: z.object({
            description: z.string().describe("Natural language description of job application"),
        })
    },
    async ({ description }) => {
        const apiKey = process.env.GOOGLE_AI_KEY;
        if (!apiKey) {
            return {
                content: [{type: "text", text: "Error: GOOGLE_AI_KEY not set" }],
                isError: true
            };
        }

        const orchestrator = new MultiOrchestratorAgent(apiKey);
        try {
            const result = await orchestrator.process(description);
            const message = result.success
            ? `✅ Processed ${result.newJob?.Company || 'Unknown'}` +
            (result.isDuplicate ? `\n⚠️ Duplicate: ${result.duplicateDetails?.reason}` : '')
            : `❌ Failed: ${result.error}`;

            return {
                content: [
                    { type: "text", text: message },
                    { type: "text", text: `\n📊 Results:\n${JSON.stringify(result, null, 2)}` }
                ]
            };
        } catch (error) {
            return {
                content: [{ type: "text", text: `Orchestrator error: ${error.message}`}],
                isError: true,
            };
        }
    }
);

server.registerTool(
    "get_job_applications",
    {
        description: "Retrieve existing job applications from the tracker",
        inputSchema: z.object({
            limit: z.number().default(10).describe("Max applications to return"),
        })
    },
    async({ limit }) => {
        return{
            content: [{ type: "text", text: `📋 Feature coming soon for last ${limit} jobs.` }]
        };
    }
);

// Connect using standard transport.
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Sheet Agent MCP Server running on stdio");
}

main().catch(console.error);
