import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ConnectionManager } from "../connection-manager.js";

export function registerOrganizationTools(server: McpServer, connectionManager: ConnectionManager) {
  server.tool(
    "list_organizations",
    "Lists all available Azure DevOps organizations from the configuration",
    {},
    async () => {
      const orgs = connectionManager.getAvailableOrganizations();
      return {
        content: [{ type: "text", text: JSON.stringify(orgs, null, 2) }],
      };
    }
  );

  server.tool(
    "list_projects",
    "Lists all projects in an Azure DevOps organization",
    {
      organization: z.string().describe("The name of the Azure DevOps organization"),
    },
    async ({ organization }) => {
      try {
        const connection = await connectionManager.getConnection(organization);
        const coreApi = await connection.getCoreApi();
        const projects = await coreApi.getProjects();
        return {
          content: [{ type: "text", text: JSON.stringify(projects, null, 2) }],
        };
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Error: ${error.message}` }],
          isError: true,
        };
      }
    }
  );
}
