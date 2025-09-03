# Nexus Docker Compose Setup

This Docker Compose setup provides a complete observability stack for Nexus with metrics collection and visualization.

## Services

- **Nexus**: AI router aggregating MCP servers and LLMs
- **OpenTelemetry Collector**: Collects and exports metrics to ClickHouse
- **ClickHouse**: Time-series database for storing metrics
- **Grafana**: Metrics visualization with pre-configured dashboard
- **Redis**: Distributed rate limiting backend

## Prerequisites

- Docker and Docker Compose installed
- API keys for LLM providers (optional)

## Quick Start

1. Set up environment variables (optional):
```bash
export OPENAI_API_KEY="your-openai-key"
export ANTHROPIC_API_KEY="your-anthropic-key"
export GOOGLE_API_KEY="your-google-key"
export AWS_REGION="us-east-1"  # For Bedrock
```

2. Start the services:
```bash
docker compose up -d
```

3. Wait for services to be healthy:
```bash
docker compose ps
```

4. Access the services:
- **Nexus API**: http://localhost:8000
- **Grafana Dashboard**: http://localhost:3000 (admin/admin)
- **ClickHouse**: http://localhost:8123

## Grafana Dashboard

The pre-configured dashboard shows:

### HTTP Metrics
- Request rate by route
- Request latency (p50, p95, p99)

### LLM Metrics
- Operations rate by model
- Operation latency percentiles
- Input/output token usage
- Time to first token (streaming)
- Error analysis by type

### MCP Metrics
- Tool call rate
- Tool call latency
- Error analysis

## Configuration

The Nexus configuration is in `docker/nexus.toml`. Key features:

- **Telemetry**: Exports metrics to OpenTelemetry Collector
- **Rate Limiting**: Redis-backed distributed rate limiting
- **LLM Providers**: OpenAI, Anthropic, Google, AWS Bedrock
- **MCP**: Enabled at `/mcp` endpoint
- **Health Check**: Available at `/health`

## Testing the Setup

1. Test health endpoint:
```bash
curl http://localhost:8000/health
```

2. List available LLM models:
```bash
curl http://localhost:8000/llm/models
```

3. Test LLM completion (requires API key):
```bash
curl -X POST http://localhost:8000/llm/completions \
  -H "Content-Type: application/json" \
  -H "x-client-id: test-client" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

4. View metrics in Grafana:
   - Navigate to http://localhost:3000
   - Login with admin/admin
   - Open "Nexus Metrics Dashboard"

## Troubleshooting

### Check service logs
```bash
docker compose logs nexus
docker compose logs otel-collector
docker compose logs grafana
```

### Verify metrics are being collected
```bash
# Check if metrics are in ClickHouse
docker compose exec clickhouse clickhouse-client \
  -q "SELECT count(*) FROM otel.otel_metrics_histogram"
```

### Rebuild Nexus image
```bash
docker compose build nexus
docker compose up -d nexus
```

## Stopping the Services

```bash
docker compose down
```

To also remove volumes (data):
```bash
docker compose down -v
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key | No |
| `ANTHROPIC_API_KEY` | Anthropic API key | No |
| `GOOGLE_API_KEY` | Google AI API key | No |
| `AWS_REGION` | AWS region for Bedrock | No |
| `AWS_ACCESS_KEY_ID` | AWS access key | No |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | No |

## Metrics Reference

See the main [README.md](../README.md#metrics) for details on available metrics and their attributes.