import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ConnectionManager } from "../connection-manager.js";
import { GitQueryCommitsCriteria, GitVersionType, PullRequestStatus } from "azure-devops-node-api/interfaces/GitInterfaces.js";
import { getEnumKeys, safeEnumConvert } from "./common.js";

export function registerRepositoryTools(server: McpServer, connectionManager: ConnectionManager) {
  
  // --- Repository Tools ---

  server.tool(
    "git_list_repositories",
    "Lists all Git repositories in a project",
    {
      organization: z.string().describe("The name of the Azure DevOps organization"),
      project: z.string().describe("Project ID or name"),
      includeHidden: z.boolean().optional().describe("Include hidden repositories"),
    },
    async ({ organization, project, includeHidden }) => {
      const connection = await connectionManager.getConnection(organization);
      const gitApi = await connection.getGitApi();
      const repos = await gitApi.getRepositories(project, includeHidden);
      
      const simplified = repos.map(r => ({
        id: r.id,
        name: r.name,
        url: r.url,
        defaultBranch: r.defaultBranch,
        remoteUrl: r.remoteUrl
      }));

      return {
        content: [{ type: "text", text: JSON.stringify(simplified, null, 2) }],
      };
    }
  );

  // --- Pull Request Tools ---

  server.tool(
    "git_get_pull_requests",
    "Gets a list of pull requests in a repository with filtering options",
    {
      organization: z.string().describe("The name of the Azure DevOps organization"),
      project: z.string().describe("Project ID or name"),
      repositoryId: z.string().describe("The repository ID or name"),
      status: z.enum(getEnumKeys(PullRequestStatus)).optional().describe("Filter by PR status (Active, Abandoned, Completed, All)"),
      creatorId: z.string().optional().describe("Filter by creator ID"),
      reviewerId: z.string().optional().describe("Filter by reviewer ID"),
      sourceRefName: z.string().optional().describe("Filter by source branch name (e.g. refs/heads/feature/1)"),
      targetRefName: z.string().optional().describe("Filter by target branch name (e.g. refs/heads/main)"),
      top: z.number().optional().describe("Number of results to return"),
    },
    async ({ organization, project, repositoryId, status, creatorId, reviewerId, sourceRefName, targetRefName, top }) => {
      const connection = await connectionManager.getConnection(organization);
      const gitApi = await connection.getGitApi();
      
      const searchCriteria: any = {
        status: safeEnumConvert<PullRequestStatus>(PullRequestStatus, status),
        creatorId,
        reviewerId,
        sourceRefName,
        targetRefName
      };

      const prs = await gitApi.getPullRequests(
        repositoryId, 
        searchCriteria, 
        project, 
        undefined, 
        undefined, 
        top || 20
      );

      const simplified = prs.map(pr => ({
        pullRequestId: pr.pullRequestId,
        title: pr.title,
        description: pr.description,
        status: pr.status,
        creationDate: pr.creationDate,
        createdBy: pr.createdBy?.displayName,
        sourceRefName: pr.sourceRefName,
        targetRefName: pr.targetRefName,
        url: pr.url
      }));

      return {
        content: [{ type: "text", text: JSON.stringify(simplified, null, 2) }],
      };
    }
  );

  server.tool(
    "git_get_pull_request",
    "Gets details of a specific pull request by ID",
    {
      organization: z.string().describe("The name of the Azure DevOps organization"),
      project: z.string().describe("Project ID or name"),
      pullRequestId: z.number().describe("The ID of the pull request"),
    },
    async ({ organization, project, pullRequestId }) => {
      const connection = await connectionManager.getConnection(organization);
      const gitApi = await connection.getGitApi();
      const pr = await gitApi.getPullRequestById(pullRequestId, project);
      
      return {
        content: [{ type: "text", text: JSON.stringify(pr, null, 2) }],
      };
    }
  );

  server.tool(
    "git_create_pull_request",
    "Creates a new pull request in a repository",
    {
      organization: z.string().describe("The name of the Azure DevOps organization"),
      project: z.string().describe("Project ID or name"),
      repositoryId: z.string().describe("The repository ID or name"),
      sourceRefName: z.string().describe("Source branch name (e.g. refs/heads/feature/my-feature)"),
      targetRefName: z.string().describe("Target branch name (e.g. refs/heads/main)"),
      title: z.string().describe("Title of the pull request"),
      description: z.string().optional().describe("Description of the pull request"),
      isDraft: z.boolean().optional().describe("Create as a draft PR"),
    },
    async ({ organization, project, repositoryId, sourceRefName, targetRefName, title, description, isDraft }) => {
      const connection = await connectionManager.getConnection(organization);
      const gitApi = await connection.getGitApi();
      
      const prToCreate = {
        sourceRefName,
        targetRefName,
        title,
        description,
        isDraft
      };

      const pr = await gitApi.createPullRequest(prToCreate, repositoryId, project);
      
      return {
        content: [{ type: "text", text: JSON.stringify(pr, null, 2) }],
      };
    }
  );

  // --- File Content Tools ---

  server.tool(
    "git_get_item",
    "Gets a file or folder from a Git repository with optional content and version control",
    {
      organization: z.string().describe("The name of the Azure DevOps organization"),
      project: z.string().describe("Project ID or name"),
      repositoryId: z.string().describe("The repository ID or name"),
      path: z.string().describe("Path to the file or folder"),
      scopePath: z.string().optional().describe("Scope path to filter items"),
      recursionLevel: z.string().optional().describe("Recursion level (None, OneLevel, Full, OneLevelPlusNestedEmptyFolders)"),
      includeContentMetadata: z.boolean().optional().describe("Include content metadata"),
      latestProcessedChange: z.boolean().optional().describe("Include latest commit that changed this item"),
      download: z.boolean().optional().describe("Set Content-Disposition header for download"),
      versionDescriptor: z.object({
        version: z.string().describe("Version string (branch name, commit SHA, tag)"),
        versionType: z.enum(getEnumKeys(GitVersionType)).describe("Type of version (Branch, Commit, Tag)"),
      }).optional().describe("Version descriptor"),
      includeContent: z.boolean().optional().describe("Include file content (text only)"),
      resolveLfs: z.boolean().optional().describe("Resolve LFS pointer files to actual content"),
      sanitize: z.boolean().optional().describe("Sanitize HTML content"),
    },
    async ({ organization, project, repositoryId, path, scopePath, recursionLevel, includeContentMetadata, latestProcessedChange, download, versionDescriptor, includeContent, resolveLfs, sanitize }) => {
      const connection = await connectionManager.getConnection(organization);
      const gitApi = await connection.getGitApi();
      
      let azVersionDescriptor: any = undefined;
      if (versionDescriptor) {
        azVersionDescriptor = {
          version: versionDescriptor.version,
          versionType: safeEnumConvert<GitVersionType>(GitVersionType, versionDescriptor.versionType)
        };
      }

      const item = await gitApi.getItem(
        repositoryId, 
        path, 
        project, 
        scopePath,
        recursionLevel as any,
        includeContentMetadata,
        latestProcessedChange,
        download,
        azVersionDescriptor,
        includeContent,
        resolveLfs,
        sanitize
      );

      return {
        content: [{ type: "text", text: JSON.stringify(item, null, 2) }],
      };
    }
  );
}
