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

### 2. Context Window Optimization
Standard Azure DevOps API responses are extremely verbose, often containing full orchestration plans, logs, and deep nesting. This implementation intercepts these responses in tools like `pipelines_get_builds` and `pipelines_get_build_definitions` to:
- **Limit Results**: Defaults to top 20/50 items instead of hundreds.
- **Flatten Objects**: Maps complex objects to simple key-value pairs (e.g., `{ requestedFor: { displayName: "User" } }` becomes just the display name).
- **Strip Noise**: Removes unused URLs, large configuration blobs, and system metadata.

## 📦 Configuration

### 1. Prerequisites
- Node.js (v16 or higher)
- Azure DevOps Personal Access Tokens (PAT) with **Read & Execute** permissions for Pipelines/Builds.

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

### 4. Claude Desktop Configuration
Add the server to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "azure-devops-multi": {
      "command": "node",
      "args": [
        "/absolute/path/to/sitefinity-cloud-ai-agent/dist/index.js"
      ]
    }
  }
}
```

## 🧰 Available Tools

### Organization & Projects
- `list_organizations`: View all configured organizations in `config.json`.
- `list_projects`: List all projects within a specific organization.

### Pipelines & Builds
- `pipelines_get_builds`: List recent builds (optimized for context).
- `pipelines_get_build_definitions`: List build definitions (optimized for context).
- `pipelines_get_build_status`: Get detailed report for a specific build.
- `pipelines_get_build_log`: Retrieve logs for a build.
- `pipelines_run_pipeline`: Trigger a new pipeline run.
- `pipelines_get_run` / `pipelines_list_runs`: Inspect pipeline runs.
