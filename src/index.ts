import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ConnectionManager } from "./connection-manager.js";
import { registerTools } from "./tools/index.js";

async function main() {
  const server = new McpServer({
    name: "azure-devops-multi-org",
    version: "1.0.0",
  });

  const connectionManager = new ConnectionManager();

  registerTools(server, connectionManager);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error("Azure DevOps Multi-Org MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main loop:", error);
  process.exit(1);
});
