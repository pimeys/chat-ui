# Nexus LLM Chat UI

A test chat interface for testing Nexus LLM with integrated MCP (Model Context Protocol) support.

## Quick Start Options

### Option 1: Docker Setup (Recommended)

This repository provides a complete Docker Compose setup for running [Nexus](https://nexusrouter.com/) with the chat UI and observability through Grafana, ClickHouse, and OpenTelemetry.

#### Components

- **Nexus Chat UI**: Interactive web interface for testing LLM providers
- **Nexus**: AI routing proxy for LLM providers  
- **ClickHouse**: Time-series database for storing metrics
- **Grafana**: Visualization and monitoring dashboard
- **OpenTelemetry Collector**: Metrics collection and processing
- **Redis**: Optional caching and rate limiting support

#### Prerequisites

- Docker and Docker Compose installed
- At least one LLM provider API key (OpenAI, Anthropic, Google, or AWS)

#### Setup

1. **Set up environment variables:**
   
   Create a `.env` file in the root directory with your API keys:
   ```bash
   # LLM Provider API Keys (at least one required)
   OPENAI_API_KEY=sk-...
   ANTHROPIC_API_KEY=sk-ant-...
   GOOGLE_API_KEY=...
   AWS_ACCESS_KEY_ID=...
   AWS_SECRET_ACCESS_KEY=...
   AWS_REGION=us-east-1

   # Required for GitHub MCP Server: GitHub Personal Access Token
   # Create at: https://github.com/settings/tokens
   # Required scopes: repo, read:org, read:user
   GITHUB_TOKEN=ghp_...

   # Optional: Grafana admin password (default: admin)
   GRAFANA_PASSWORD=admin

   # Optional: Logging level
   RUST_LOG=info,nexus=debug,mcp=debug,llm=debug
   ```

2. **Start all services:**
   ```bash
   docker compose up -d
   ```

3. **Verify services are running:**
   ```bash
   docker compose ps
   ```

#### Accessing Services

| Service | URL | Default Credentials |
|---------|-----|-------------------|
| **Chat UI** | http://localhost:5173 | N/A |
| **Nexus API** | http://localhost:8080 | N/A |
| **Grafana Dashboard** | http://localhost:3001 | admin / admin |
| **ClickHouse** | http://localhost:8123 | default / (no password) |
| **OpenTelemetry Collector** | http://localhost:4317 (gRPC)<br>http://localhost:4318 (HTTP) | N/A |
| **Redis** | localhost:6379 | N/A |

### Option 2: Local Development

#### Prerequisites

Set up your API keys as environment variables:
```bash
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
export GOOGLE_API_KEY="..."
```

#### Running the System

1. Start Nexus with the API keys:
```bash
nexus
```

2. In another terminal, install dependencies and run the UI:
```bash
npm install
npm run dev
```

3. Open http://localhost:5173 in your browser

## Features

### MCP Integration
The chat UI includes full support for Nexus's MCP (Model Context Protocol) capabilities:

- **Dynamic Tool Discovery**: Automatically fetches available tools from the MCP server
- **GitHub Integration**: Built-in GitHub MCP server for repository operations
- **Real-time Tool Execution**: Tools are executed automatically when requested by the LLM
- **Tool Response Handling**: Properly formats and displays tool execution results

### Supported LLM Providers
- OpenAI (GPT-4, GPT-3.5-turbo, etc.)
- Anthropic (Claude models)
- Google (Gemini models)
- AWS Bedrock (various models)

### GitHub MCP Server
The setup includes the official GitHub MCP server with capabilities for:
- Search repositories, issues, and pull requests
- Read file contents from repositories  
- Create issues, pull requests, and comments
- Fork repositories
- Get user and organization information

## Usage Examples

### Test with GitHub Integration
```
Search for popular Rust web frameworks on GitHub
```

### Read Repository Files
```
Read the README from grafbase/nexus repository
```

### General LLM Queries
```
Explain the differences between REST and GraphQL APIs
```

## Configuration

### Nexus Configuration
The Nexus configuration is located at `docker/nexus.toml` and includes:
- LLM provider settings
- MCP server configurations  
- CORS settings for web access
- OpenTelemetry export settings

### Adding LLM Providers
Edit `docker/nexus.toml` to enable additional providers:

```toml
[llm.providers.openai]
type = "openai"
api_key = "{{ env.OPENAI_API_KEY }}"

[llm.providers.openai.models."gpt-4"]
[llm.providers.openai.models."gpt-3.5-turbo"]
```

## Monitoring

1. **Access Grafana** at http://localhost:3001
2. **Login** with admin/admin (or your configured password)  
3. **View dashboards** - Nexus metrics dashboard is pre-configured
4. **Metrics include:**
   - Request rates and latencies
   - Token usage
   - Error rates  
   - Provider-specific metrics

## Troubleshooting

### Check service logs
```bash
# View logs for specific services
docker compose logs chat-ui
docker compose logs nexus
docker compose logs clickhouse

# Follow logs in real-time
docker compose logs -f nexus
```

### Common Issues
1. **Chat UI won't connect**: Ensure Nexus is running on port 8080
2. **Nexus won't start**: Check that at least one LLM provider API key is set in `.env`
3. **MCP tools not working**: Verify GITHUB_TOKEN is set with proper scopes
4. **CORS errors**: Update `allow_origins` in `docker/nexus.toml`

## Directory Structure

```
chat-ui/
├── compose.yaml                 # Docker Compose configuration
├── Dockerfile                   # Chat UI container build
├── .env                         # Environment variables (create this)
├── index.html                   # Main chat interface
├── app.js                       # Chat logic with MCP integration
├── styles.css                   # UI styling
├── favicon.svg                  # Cat favicon
└── docker/
    ├── nexus.toml              # Nexus configuration
    ├── clickhouse/             # ClickHouse setup
    ├── grafana/                # Grafana dashboards
    └── otel/                   # OpenTelemetry config
```
