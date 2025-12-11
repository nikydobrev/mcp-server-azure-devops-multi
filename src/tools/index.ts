import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ConnectionManager } from "../connection-manager.js";
import { registerOrganizationTools } from "./organizations.js";
import { registerPipelineTools } from "./pipelines.js";
import { registerRepositoryTools } from "./repositories.js";

export function registerTools(server: McpServer, connectionManager: ConnectionManager) {
  registerOrganizationTools(server, connectionManager);
  registerPipelineTools(server, connectionManager);
  registerRepositoryTools(server, connectionManager);
}
