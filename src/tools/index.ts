import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ConnectionManager } from "../connection-manager.js";
import { BuildQueryOrder, DefinitionQueryOrder, StageUpdateType } from "azure-devops-node-api/interfaces/BuildInterfaces.js";

// Helper functions
function getEnumKeys(enumObject: any): [string, ...string[]] {
    const keys = Object.keys(enumObject).filter((key) => isNaN(Number(key)));
    if (keys.length === 0) {
        return ["Values"]; 
    }
    return [keys[0], ...keys.slice(1)];
}

function safeEnumConvert<T>(enumObject: any, key?: string): T | undefined {
    if (!key) return undefined;
    return enumObject[key];
}

export function registerTools(server: McpServer, connectionManager: ConnectionManager) {

  // --- Organization & Project Tools ---

  server.tool(
    "list_organizations",
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

  // --- Pipeline Tools ---

  server.tool(
    "pipelines_get_build_definitions",
    {
        organization: z.string().describe("The name of the Azure DevOps organization"),
        project: z.string().describe("Project ID or name to get build definitions for"),
        repositoryId: z.string().optional().describe("Repository ID to filter build definitions"),
        repositoryType: z.enum(["TfsGit", "GitHub", "BitbucketCloud"]).optional().describe("Type of repository to filter build definitions"),
        name: z.string().optional().describe("Name of the build definition to filter"),
        path: z.string().optional().describe("Path of the build definition to filter"),
        queryOrder: z
            .enum(getEnumKeys(DefinitionQueryOrder))
            .optional()
            .describe("Order in which build definitions are returned"),
        top: z.number().optional().describe("Maximum number of build definitions to return"),
        continuationToken: z.string().optional().describe("Token for continuing paged results"),
        minMetricsTime: z.string().optional().describe("Minimum metrics time to filter build definitions (ISO 8601 string)"),
        definitionIds: z.array(z.number()).optional().describe("Array of build definition IDs to filter"),
        builtAfter: z.string().optional().describe("Return definitions that have builds after this date (ISO 8601 string)"),
        notBuiltAfter: z.string().optional().describe("Return definitions that do not have builds after this date (ISO 8601 string)"),
        includeAllProperties: z.boolean().optional().describe("Whether to include all properties in the results"),
        includeLatestBuilds: z.boolean().optional().describe("Whether to include the latest builds for each definition"),
        taskIdFilter: z.string().optional().describe("Task ID to filter build definitions"),
        processType: z.number().optional().describe("Process type to filter build definitions"),
        yamlFilename: z.string().optional().describe("YAML filename to filter build definitions"),
    },
    async ({ organization, project, repositoryId, repositoryType, name, path, queryOrder, top, continuationToken, minMetricsTime, definitionIds, builtAfter, notBuiltAfter, includeAllProperties, includeLatestBuilds, taskIdFilter, processType, yamlFilename }) => {
        const connection = await connectionManager.getConnection(organization);
        const buildApi = await connection.getBuildApi();
        
        // Default top to 50 to prevent massive responses
        const limit = top || 50;

        const buildDefinitions = await buildApi.getDefinitions(
            project, 
            name, 
            repositoryId, 
            repositoryType, 
            safeEnumConvert(DefinitionQueryOrder, queryOrder), 
            limit, 
            continuationToken, 
            minMetricsTime ? new Date(minMetricsTime) : undefined, 
            definitionIds, 
            path, 
            builtAfter ? new Date(builtAfter) : undefined, 
            notBuiltAfter ? new Date(notBuiltAfter) : undefined, 
            includeAllProperties, 
            includeLatestBuilds, 
            taskIdFilter, 
            processType, 
            yamlFilename
        );

        // Simplify the output
        const simplifiedDefinitions = buildDefinitions.map(d => ({
            id: d.id,
            name: d.name,
            path: d.path,
            type: d.type,
            queueStatus: d.queueStatus,
            revision: d.revision,
            url: d.url
        }));

        return {
            content: [{ type: "text", text: JSON.stringify(simplifiedDefinitions, null, 2) }],
        };
    }
  );

  server.tool(
    "pipelines_get_build_definition_revisions",
    {
        organization: z.string().describe("The name of the Azure DevOps organization"),
        project: z.string().describe("Project ID or name to get the build definition revisions for"),
        definitionId: z.number().describe("ID of the build definition to get revisions for"),
    },
    async ({ organization, project, definitionId }) => {
        const connection = await connectionManager.getConnection(organization);
        const buildApi = await connection.getBuildApi();
        const revisions = await buildApi.getDefinitionRevisions(project, definitionId);
        return {
            content: [{ type: "text", text: JSON.stringify(revisions, null, 2) }],
        };
    }
  );

  server.tool(
    "pipelines_get_builds",
    {
        organization: z.string().describe("The name of the Azure DevOps organization"),
        project: z.string().describe("Project ID or name to get builds for"),
        definitions: z.array(z.number()).optional().describe("Array of build definition IDs to filter builds"),
        queues: z.array(z.number()).optional().describe("Array of queue IDs to filter builds"),
        buildNumber: z.string().optional().describe("Build number to filter builds"),
        minTime: z.string().optional().describe("Minimum finish time to filter builds (ISO 8601 string)"),
        maxTime: z.string().optional().describe("Maximum finish time to filter builds (ISO 8601 string)"),
        requestedFor: z.string().optional().describe("User ID or name who requested the build"),
        reasonFilter: z.number().optional().describe("Reason filter for the build (see BuildReason enum)"),
        statusFilter: z.number().optional().describe("Status filter for the build (see BuildStatus enum)"),
        resultFilter: z.number().optional().describe("Result filter for the build (see BuildResult enum)"),
        tagFilters: z.array(z.string()).optional().describe("Array of tags to filter builds"),
        properties: z.array(z.string()).optional().describe("Array of property names to include in the results"),
        top: z.number().optional().describe("Maximum number of builds to return"),
        continuationToken: z.string().optional().describe("Token for continuing paged results"),
        maxBuildsPerDefinition: z.number().optional().describe("Maximum number of builds per definition"),
        deletedFilter: z.number().optional().describe("Filter for deleted builds (see QueryDeletedOption enum)"),
        queryOrder: z
            .enum(getEnumKeys(BuildQueryOrder))
            .default("QueueTimeDescending")
            .optional()
            .describe("Order in which builds are returned"),
        branchName: z.string().optional().describe("Branch name to filter builds"),
        buildIds: z.array(z.number()).optional().describe("Array of build IDs to retrieve"),
        repositoryId: z.string().optional().describe("Repository ID to filter builds"),
        repositoryType: z.enum(["TfsGit", "GitHub", "BitbucketCloud"]).optional().describe("Type of repository to filter builds"),
    },
    async ({ organization, project, definitions, queues, buildNumber, minTime, maxTime, requestedFor, reasonFilter, statusFilter, resultFilter, tagFilters, properties, top, continuationToken, maxBuildsPerDefinition, deletedFilter, queryOrder, branchName, buildIds, repositoryId, repositoryType }) => {
        const connection = await connectionManager.getConnection(organization);
        const buildApi = await connection.getBuildApi();

        // Default to a summary view if properties are not specified to avoid hitting token limits
        // We select key fields that are most useful for status checks
        const defaultProperties = [
            "id", 
            "buildNumber", 
            "status", 
            "result", 
            "queueTime", 
            "startTime", 
            "finishTime", 
            "url", 
            "definition", 
            "project", 
            "sourceBranch", 
            "requestedFor"
        ];
        const selectedProperties = properties || defaultProperties;
        
        // Default top to 20 if not specified to prevent massive responses
        const limit = top || 20;

        const builds = await buildApi.getBuilds(
            project, 
            definitions, 
            queues, 
            buildNumber, 
            minTime ? new Date(minTime) : undefined, 
            maxTime ? new Date(maxTime) : undefined, 
            requestedFor, 
            reasonFilter, 
            statusFilter, 
            resultFilter, 
            tagFilters, 
            selectedProperties, 
            limit, 
            continuationToken, 
            maxBuildsPerDefinition, 
            deletedFilter, 
            safeEnumConvert(BuildQueryOrder, queryOrder), 
            branchName, 
            buildIds, 
            repositoryId, 
            repositoryType
        );

        // Simplify the output to reduce token usage
        const simplifiedBuilds = builds.map(b => ({
            id: b.id,
            buildNumber: b.buildNumber,
            status: b.status,
            result: b.result,
            queueTime: b.queueTime,
            startTime: b.startTime,
            finishTime: b.finishTime,
            definition: b.definition ? { id: b.definition.id, name: b.definition.name } : undefined,
            sourceBranch: b.sourceBranch,
            requestedFor: b.requestedFor ? { displayName: b.requestedFor.displayName } : undefined,
            url: b.url
        }));

        return {
            content: [{ type: "text", text: JSON.stringify(simplifiedBuilds, null, 2) }],
        };
    }
  );

  server.tool(
    "pipelines_get_build_log",
    {
        organization: z.string().describe("The name of the Azure DevOps organization"),
        project: z.string().describe("Project ID or name to get the build log for"),
        buildId: z.number().describe("ID of the build to get the log for"),
    },
    async ({ organization, project, buildId }) => {
        const connection = await connectionManager.getConnection(organization);
        const buildApi = await connection.getBuildApi();
        const logs = await buildApi.getBuildLogs(project, buildId);
        return {
            content: [{ type: "text", text: JSON.stringify(logs, null, 2) }],
        };
    }
  );

  server.tool(
    "pipelines_get_build_log_by_id",
    {
        organization: z.string().describe("The name of the Azure DevOps organization"),
        project: z.string().describe("Project ID or name to get the build log for"),
        buildId: z.number().describe("ID of the build to get the log for"),
        logId: z.number().describe("ID of the log to retrieve"),
        startLine: z.number().optional().describe("Starting line number for the log content, defaults to 0"),
        endLine: z.number().optional().describe("Ending line number for the log content, defaults to the end of the log"),
    },
    async ({ organization, project, buildId, logId, startLine, endLine }) => {
        const connection = await connectionManager.getConnection(organization);
        const buildApi = await connection.getBuildApi();
        const logLines = await buildApi.getBuildLogLines(project, buildId, logId, startLine, endLine);
        return {
            content: [{ type: "text", text: JSON.stringify(logLines, null, 2) }],
        };
    }
  );

  server.tool(
    "pipelines_get_build_changes",
    {
        organization: z.string().describe("The name of the Azure DevOps organization"),
        project: z.string().describe("Project ID or name to get the build changes for"),
        buildId: z.number().describe("ID of the build to get changes for"),
        continuationToken: z.string().optional().describe("Continuation token for pagination"),
        top: z.number().default(100).describe("Number of changes to retrieve, defaults to 100"),
        includeSourceChange: z.boolean().optional().describe("Whether to include source changes in the results, defaults to false"),
    },
    async ({ organization, project, buildId, continuationToken, top, includeSourceChange }) => {
        const connection = await connectionManager.getConnection(organization);
        const buildApi = await connection.getBuildApi();
        const changes = await buildApi.getBuildChanges(project, buildId, continuationToken, top, includeSourceChange);
        return {
            content: [{ type: "text", text: JSON.stringify(changes, null, 2) }],
        };
    }
  );

  server.tool(
    "pipelines_get_run",
    {
        organization: z.string().describe("The name of the Azure DevOps organization"),
        project: z.string().describe("Project ID or name to run the build in"),
        pipelineId: z.number().describe("ID of the pipeline to run"),
        runId: z.number().describe("ID of the run to get"),
    },
    async ({ organization, project, pipelineId, runId }) => {
        const connection = await connectionManager.getConnection(organization);
        const pipelinesApi = await connection.getPipelinesApi();
        const pipelineRun = await pipelinesApi.getRun(project, pipelineId, runId);
        return {
            content: [{ type: "text", text: JSON.stringify(pipelineRun, null, 2) }],
        };
    }
  );

  server.tool(
    "pipelines_list_runs",
    {
        organization: z.string().describe("The name of the Azure DevOps organization"),
        project: z.string().describe("Project ID or name to run the build in"),
        pipelineId: z.number().describe("ID of the pipeline to run"),
    },
    async ({ organization, project, pipelineId }) => {
        const connection = await connectionManager.getConnection(organization);
        const pipelinesApi = await connection.getPipelinesApi();
        const pipelineRuns = await pipelinesApi.listRuns(project, pipelineId);
        return {
            content: [{ type: "text", text: JSON.stringify(pipelineRuns, null, 2) }],
        };
    }
  );

  const variableSchema = z.object({
    value: z.string().optional(),
    isSecret: z.boolean().optional(),
  });

  const resourcesSchema = z.object({
    builds: z
        .record(z.string().describe("Name of the build resource."), z.object({
        version: z.string().optional().describe("Version of the build resource."),
    }))
        .optional(),
    containers: z
        .record(z.string().describe("Name of the container resource."), z.object({
        version: z.string().optional().describe("Version of the container resource."),
    }))
        .optional(),
    packages: z
        .record(z.string().describe("Name of the package resource."), z.object({
        version: z.string().optional().describe("Version of the package resource."),
    }))
        .optional(),
    pipelines: z.record(z.string().describe("Name of the pipeline resource."), z.object({
        runId: z.number().describe("Id of the source pipeline run that triggered or is referenced by this pipeline run."),
        version: z.string().optional().describe("Version of the source pipeline run."),
    })),
    repositories: z
        .record(z.string().describe("Name of the repository resource."), z.object({
        refName: z.string().describe("Reference name, e.g., refs/heads/main."),
        token: z.string().optional(),
        tokenType: z.string().optional(),
        version: z.string().optional().describe("Version of the repository resource, git commit sha."),
    }))
        .optional(),
  });

  server.tool(
    "pipelines_run_pipeline",
    {
        organization: z.string().describe("The name of the Azure DevOps organization"),
        project: z.string().describe("Project ID or name to run the build in"),
        pipelineId: z.number().describe("ID of the pipeline to run"),
        pipelineVersion: z.number().optional().describe("Version of the pipeline to run. If not provided, the latest version will be used."),
        previewRun: z.boolean().optional().describe("If true, returns the final YAML document after parsing templates without creating a new run."),
        resources: resourcesSchema.optional().describe("A dictionary of resources to pass to the pipeline."),
        stagesToSkip: z.array(z.string()).optional().describe("A list of stages to skip."),
        templateParameters: z.record(z.string(), z.string()).optional().describe("Custom build parameters as key-value pairs"),
        variables: z.record(z.string(), variableSchema).optional().describe("A dictionary of variables to pass to the pipeline."),
        yamlOverride: z.string().optional().describe("YAML override for the pipeline run."),
    },
    async ({ organization, project, pipelineId, pipelineVersion, previewRun, resources, stagesToSkip, templateParameters, variables, yamlOverride }) => {
        if (!previewRun && yamlOverride) {
            throw new Error("Parameter 'yamlOverride' can only be specified together with parameter 'previewRun'.");
        }
        const connection = await connectionManager.getConnection(organization);
        const pipelinesApi = await connection.getPipelinesApi();
        const runRequest = {
            previewRun: previewRun,
            resources: {
                ...resources,
            },
            stagesToSkip: stagesToSkip,
            templateParameters: templateParameters,
            variables: variables,
            yamlOverride: yamlOverride,
        };
        const pipelineRun = await pipelinesApi.runPipeline(runRequest as any, project, pipelineId, pipelineVersion);
        return {
            content: [{ type: "text", text: JSON.stringify(pipelineRun, null, 2) }],
        };
    }
  );

  server.tool(
    "pipelines_get_build_status",
    {
        organization: z.string().describe("The name of the Azure DevOps organization"),
        project: z.string().describe("Project ID or name to get the build status for"),
        buildId: z.number().describe("ID of the build to get the status for"),
    },
    async ({ organization, project, buildId }) => {
        const connection = await connectionManager.getConnection(organization);
        const buildApi = await connection.getBuildApi();
        const build = await buildApi.getBuildReport(project, buildId);
        return {
            content: [{ type: "text", text: JSON.stringify(build, null, 2) }],
        };
    }
  );

  server.tool(
    "pipelines_update_build_stage",
    {
        organization: z.string().describe("The name of the Azure DevOps organization"),
        project: z.string().describe("Project ID or name to update the build stage for"),
        buildId: z.number().describe("ID of the build to update"),
        stageName: z.string().describe("Name of the stage to update"),
        status: z.enum(getEnumKeys(StageUpdateType)).describe("New status for the stage"),
        forceRetryAllJobs: z.boolean().default(false).describe("Whether to force retry all jobs in the stage."),
    },
    async ({ organization, project, buildId, stageName, status, forceRetryAllJobs }) => {
        // Placeholder for now as it requires direct API call or token access which is not currently exposed by ConnectionManager
        throw new Error("Tool pipelines_update_build_stage is not fully implemented yet.");
    }
  );
}
