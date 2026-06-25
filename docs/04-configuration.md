# Configuration Guide

This guide covers all configuration options available in Suthep's `suthep.yml` file.

## Configuration File Structure

The `suthep.yml` file uses YAML format and consists of several sections:

```yaml
project:
  # Project metadata

services:
  # Service definitions

nginx:
  # Nginx configuration

certbot:
  # SSL certificate configuration

deployment:
  # Deployment strategy settings
```

## Project Configuration

The `project` section contains metadata about your project:

```yaml
project:
  name: my-app        # Project name
  version: 1.0.0      # Project version
```

### Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Unique identifier for your project |
| `version` | Yes | Project version (for tracking) |

## Services Configuration

The `services` array defines all services to deploy. Each service can have multiple configurations.

### Basic Service

```yaml
services:
  - name: api
    port: 3000
    domains:
      - api.example.com
```

### Service Fields

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `name` | Yes | string | Unique service identifier |
| `port` | Yes | number | Port number the service runs on (host port) |
| `domains` | Yes | array | Array of domain names for this service |
| `path` | No | string | URL path prefix (default: `/`) |
| `docker` | No | object | Docker configuration (see below) |
| `healthCheck` | No | object | Health check configuration (see below) |
| `environment` | No | object | Environment variables as key-value pairs |

### Docker Configuration

Configure Docker container deployment:

```yaml
services:
  - name: webapp
    port: 8080
    docker:
      image: nginx:latest        # Docker image to pull
      container: webapp-container # Container name
      port: 80                    # Container internal port
```

#### Docker Fields

| Field | Required | Description |
|-------|----------|-------------|
| `image` | No* | Docker image to pull and run |
| `container` | Yes | Name for the Docker container |
| `port` | Yes | Internal port the container listens on |

\* `image` is optional if connecting to an existing container.

#### Connect to Existing Container

To connect to an already running container, omit the `image` field:

```yaml
services:
  - name: database-proxy
    port: 5432
    docker:
      container: postgres-container
      port: 5432
```

### Health Check Configuration

Configure health monitoring for your service:

```yaml
services:
  - name: api
    healthCheck:
      path: /health      # Health check endpoint
      interval: 30       # Check interval in seconds
```

#### Health Check Fields

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `path` | Yes | - | HTTP endpoint path for health checks |
| `interval` | No | 30 | Time between health checks (seconds) |

### Environment Variables

Set environment variables for your service:

```yaml
services:
  - name: api
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://localhost:5432/mydb
      API_KEY: your-api-key
```

#### Environment Variable Substitution

Suthep supports environment variable substitution in configuration files using `${VAR_NAME}` syntax. You can also use `.env` files to store sensitive values.

**Using .env Files:**

Suthep automatically loads `.env` files from the same directory as your configuration file. It searches for files in this order (later files override earlier ones):

1. `.env.local` (highest priority, should be gitignored)
2. `.env`

Example `.env` file:

```bash
# .env
DATABASE_URL=postgresql://localhost:5432/mydb
API_KEY=secret-key-123
DOMAIN=example.com
```

**Variable Substitution Syntax:**

You can use environment variables in your configuration file with the following syntax:

```yaml
services:
  - name: api
    port: 3000
    domains:
      - ${DOMAIN}
      - api.${DOMAIN}
    environment:
      DATABASE_URL: ${DATABASE_URL}
      API_KEY: ${API_KEY}
      NODE_ENV: ${NODE_ENV:-production}  # With default value
```

**Supported Syntax:**

- `${VAR_NAME}` - Replaced with the value of `VAR_NAME` from `.env` files or `process.env`
- `${VAR_NAME:-default}` - Uses `default` if `VAR_NAME` is not set
- Variables are substituted recursively throughout the configuration

**Priority Order:**

Environment variables are resolved in this order (highest to lowest priority):

1. CLI environment variables (via `-e` or `--env` flag)
2. Service-specific environment variables (from `environment` section)
3. Variables from `.env` files
4. System environment variables (`process.env`)

**Example:**

```yaml
# suthep.yml
services:
  - name: api
    port: ${API_PORT:-3000}
    domains:
      - ${API_DOMAIN:-api.example.com}
    environment:
      NODE_ENV: ${NODE_ENV:-production}
      DATABASE_URL: ${DATABASE_URL}
```

```bash
# .env
API_PORT=3001
API_DOMAIN=api.myapp.com
DATABASE_URL=postgresql://localhost:5432/mydb
```

**Note:** Always add `.env.local` to your `.gitignore` file to keep sensitive values secure.

### Path-Based Routing

Route different services on the same domain using paths:

```yaml
services:
  # API service on /api path
  - name: api
    port: 3001
    path: /api
    domains:
      - example.com

  # UI service on root path
  - name: ui
    port: 3000
    path: /
    domains:
      - example.com
```

## Nginx Configuration

Configure Nginx settings:

```yaml
nginx:
  configPath: /etc/nginx/sites-available
  reloadCommand: sudo nginx -t && sudo systemctl reload nginx
```

### Nginx Fields

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `configPath` | No | `/etc/nginx/sites-available` | Path where Nginx configs are stored |
| `reloadCommand` | No | `sudo nginx -t && sudo systemctl reload nginx` | Command to reload Nginx |

## Certbot Configuration

Configure SSL certificate settings:

```yaml
certbot:
  email: admin@example.com  # Email for Let's Encrypt
  staging: false            # Use staging environment (for testing)
```

### Certbot Fields

| Field | Required | Description |
|-------|----------|-------------|
| `email` | Yes | Email address for Let's Encrypt notifications |
| `staging` | No | Use staging environment (default: `false`) |

**Note:** Use `staging: true` for testing to avoid rate limits.

## Deployment Configuration

Configure deployment strategy:

```yaml
deployment:
  strategy: rolling              # Deployment strategy
  healthCheckTimeout: 30000      # Health check timeout (ms)
```

### Deployment Fields

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `strategy` | No | `rolling` | Deployment strategy (`rolling` or `blue-green`) |
| `healthCheckTimeout` | No | `30000` | Maximum time to wait for health check (milliseconds) |

### Deployment Strategies

#### Rolling Deployment

Gradually replaces old containers with new ones:

```yaml
deployment:
  strategy: rolling
```

#### Blue-Green Deployment

Creates new containers, switches traffic, then removes old containers:

```yaml
deployment:
  strategy: blue-green
```

## Complete Configuration Example

Here's a complete example with all options:

```yaml
project:
  name: my-app
  version: 1.0.0

services:
  # Simple API service
  - name: api
    port: 3000
    domains:
      - api.example.com
    healthCheck:
      path: /health
      interval: 30
    environment:
      NODE_ENV: production

  # Docker webapp
  - name: webapp
    port: 8080
    docker:
      image: nginx:latest
      container: webapp-container
      port: 80
    domains:
      - example.com
      - www.example.com
    healthCheck:
      path: /
      interval: 30

  # Multiple services on same domain
  - name: api-v2
    port: 3001
    path: /api
    domains:
      - example.com
    docker:
      image: myapp/api:latest
      container: api-v2-container
      port: 3001

nginx:
  configPath: /etc/nginx/sites-available
  reloadCommand: sudo nginx -t && sudo systemctl reload nginx

certbot:
  email: admin@example.com
  staging: false

deployment:
  strategy: rolling
  healthCheckTimeout: 30000
```

## Configuration Best Practices

### 1. Use Descriptive Service Names

```yaml
# Good
- name: user-api
- name: payment-service

# Avoid
- name: service1
- name: app
```

### 2. Set Appropriate Health Check Intervals

```yaml
# For critical services
healthCheck:
  interval: 15  # Check every 15 seconds

# For less critical services
healthCheck:
  interval: 60  # Check every minute
```

### 3. Use Staging for Testing

```yaml
certbot:
  staging: true  # Use staging for testing
```

### 4. Organize Services by Domain

Group related services together in your configuration:

```yaml
services:
  # API services
  - name: api
    domains: [api.example.com]
  - name: api-v2
    domains: [api-v2.example.com]

  # Web services
  - name: webapp
    domains: [example.com, www.example.com]
```

## Validation

Suthep validates your configuration before deployment. Common validation errors:

- **Missing required fields** - Ensure all required fields are present
- **Invalid port numbers** - Ports must be between 1 and 65535
- **Duplicate service names** - Each service must have a unique name
- **Invalid domain format** - Domains must be valid hostnames

## Next Steps

- [Commands Reference](./05-commands.md) - Learn about all available commands
- [Examples](./06-examples.md) - See real-world configuration examples

---

**Previous:** [Quick Start](./03-quick-start.md) | **Next:** [Commands Reference →](./05-commands.md)

