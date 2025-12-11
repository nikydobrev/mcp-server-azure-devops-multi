# Azure DevOps Multi-Organization MCP Server

This is a specialized Model Context Protocol (MCP) server for Azure DevOps, designed to overcome the limitations of single-organization bindings found in standard implementations.

## 🚀 Value Proposition & Comparison

The primary value of this implementation is **Multi-Organization Support** and **Context Optimization**.

| Feature | Standard / Official AzDO MCP | This Implementation | User Value |
| :--- | :--- | :--- | :--- |
| **Scope** | Single Organization (bound via `AZURE_DEVOPS_ORG` env var) | **Multi-Organization** (Dynamic Routing) | Seamlessly work across `org-1`, `org-2`, and other orgs in a single chat session without restarting the server. |
| **Authentication** | Single PAT in `.env` | **Multiple PATs** in `config.json` | Securely manages distinct credentials for different organizations. |
| **Context Usage** | Returns raw, verbose API responses | **LLM-Optimized Responses** | Aggressively flattens and simplifies JSON output (e.g., removing huge log objects from list views) to prevent "Maximum Length" errors in Claude. |
| **Tool Signature** | `(project, ...args)` | `(organization, project, ...args)` | Explicit control over the target organization for every action. |

## 🛠 Architecture

### 1. The Connection Manager Pattern
Instead of initializing a single connection at startup, this server uses a `ConnectionManager` class.
- **Lazy Loading**: Connections to Azure DevOps are established only when a tool is requested.
- **Caching**: Authenticated connections are cached to ensure performance for subsequent requests.
- **Routing**: Every tool schema includes an `organization` argument. The manager uses this to look up the corresponding Personal Access Token (PAT) from `config.json`.

### 2. Modular Tool Structure
Tools are organized into separate modules for maintainability:
- **`tools/organizations.ts`**: Organization and project discovery tools
- **`tools/pipelines.ts`**: CI/CD pipeline operations (builds, definitions, runs, logs)
- **`tools/repositories.ts`**: Git repository and pull request management
- **`tools/common.ts`**: Shared utilities for enum handling and type conversions
- **`tools/index.ts`**: Central registration orchestrator

### 3. Context Window Optimization
Standard Azure DevOps API responses are extremely verbose, often containing full orchestration plans, logs, and deep nesting. This implementation intercepts these responses in tools like `pipelines_get_builds` and `pipelines_get_build_definitions` to:
- **Limit Results**: Defaults to top 20/50 items instead of hundreds.
- **Flatten Objects**: Maps complex objects to simple key-value pairs (e.g., `{ requestedFor: { displayName: "User" } }` becomes just the display name).
- **Strip Noise**: Removes unused URLs, large configuration blobs, and system metadata.

### 4. Dual Transport Support
- **Stdio Transport**: For local usage with Claude Desktop and VS Code (default)
- **SSE Transport**: For cloud deployment with HTTP endpoints (activated via `PORT` env var)

## 📦 Configuration

### 1. Prerequisites
- Node.js (v18 or higher)
- Azure DevOps Personal Access Tokens (PAT) with appropriate permissions:
  - **Code (Read)**: For repository and pull request operations
  - **Build (Read & Execute)**: For pipeline and build operations
  - **Project and Team (Read)**: For organization and project listing

### 2. Setup `config.json`
Create a `config.json` file in the root directory. This file maps your Organization names (as they appear in the URL, e.g., `dev.azure.com/{org}`) to their PATs.

```json
{
  "org-1": "your-pat-token-here",
  "org-2": "another-pat-token-here"
}
```

### 3. Build & Run
```bash
npm install
npm run build
```

### 4. Claude Desktop Configuration (Local - Stdio)
Add the server to your `claude_desktop_config.json` for local usage:

```json
{
  "mcpServers": {
    "azure-devops-multi": {
      "command": "node",
      "args": [
        "/absolute/path/to/mcp-server-azure-devops-multi/dist/index.js"
      ]
    }
  }
}
```

### 5. VS Code Configuration (Local - Stdio)
Add the server to your VS Code settings for use with GitHub Copilot Chat:

1. Open VS Code Settings (JSON)
2. Add to `github.copilot.chat.mcp.servers`:

```json
{
  "github.copilot.chat.mcp.servers": {
    "Azure DevOps Multi": {
      "command": "node",
      "args": [
        "/absolute/path/to/mcp-server-azure-devops-multi/dist/index.js"
      ]
    }
  }
}
```

### 6. Cloud Deployment (HTTP/SSE)
The server supports SSE (Server-Sent Events) transport for cloud deployment:

#### Docker Build & Run
```bash
docker build -t azdo-mcp-server .
docker run -p 3000:3000 -v /path/to/config.json:/app/config.json azdo-mcp-server
```

#### Azure Container Apps
```bash
az containerapp create \
  --name azdo-mcp-server \
  --resource-group <your-rg> \
  --environment <your-env> \
  --image <your-acr>.azurecr.io/azdo-mcp-server:latest \
  --target-port 3000 \
  --ingress external \
  --env-vars PORT=3000
```

The server automatically switches to SSE transport when `PORT` environment variable is set, exposing:
- `GET /sse` - SSE connection endpoint
- `POST /messages` - Message handling endpoint

## 🧰 Available Tools (18 Total)

### Organization & Projects (2 Tools)
- `list_organizations`: View all configured organizations in `config.json`.
- `list_projects`: List all projects within a specific organization.

### Pipelines & Builds (13 Tools)
- `pipelines_get_builds`: List recent builds with filtering options (optimized for context).
- `pipelines_get_build_definitions`: List build definitions with query options (optimized for context).
- `pipelines_get_build_status`: Get detailed report for a specific build.
- `pipelines_get_build_log`: Retrieve logs for a specific build.
- `pipelines_get_build_timeline`: Get timeline entries for a build.
- `pipelines_run_pipeline`: Trigger a new pipeline run with parameters and variables.
- `pipelines_get_run`: Get details for a specific pipeline run.
- `pipelines_list_runs`: List pipeline runs with filtering options.
- `pipelines_get_run_stage`: Get information about a specific stage in a pipeline run.
- `pipelines_get_run_log`: Get log content for a specific pipeline run.
- `pipelines_update_build_stage`: Update a stage in a build (placeholder - not yet implemented).
- `pipelines_get_definition`: Get a specific build definition by ID.
- `pipelines_get_definition_yaml`: Get the YAML content of a pipeline definition.

### Git Repositories & Pull Requests (5 Tools)
- `git_list_repositories`: List all Git repositories in a project.
- `git_get_repository`: Get details for a specific repository.
- `git_get_pull_requests`: Search and list pull requests with filtering options.
- `git_create_pull_request`: Create a new pull request with title, description, and reviewers.
- `git_get_item`: Get file or folder content from a repository with version control options.
