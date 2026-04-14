import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export class ProcessManager {

    /**
     * Checks if a process matching the pattern is running.
     * Using 'pgrep -f' searches the full command line, which is useful 
     * for finding servers started via 'node' or 'python'.
     */
    static async isProcessRunning(processPattern) {
        try {
            await execAsync(`pgrep -f "${processPattern}"`);
            return true;
        } catch {
            return false;
        }
    }

     /**
     * Starts the MCP server if it isn't already running.
     */
    static async startMCPServer(startCommand) {
        const isRunning = await this.isProcessRunning('mcp-server');
        if (!isRunning) {
            console.log("Starting MCP Server...");
            exec(startCommand);
        }
    }

     /**
     * Polls the process list until the server is detected or timeout is hit.
     */
    static async waitForServer(processPattern = 'mcp-server', timeout = 5000) {
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            if (await this.isProcessRunning(processPattern)) {
                return true;
            }
            // Wait 100ms before checking again.
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        throw new Error(`Server "${processPattern}" failed to start within ${timeout}ms`);
    }
}
