# Suthep

A powerful CLI tool for deploying projects with automatic Nginx reverse proxy setup, HTTPS with Certbot, and zero-downtime deployments.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Commands](#commands)
- [Examples](#examples)
- [Requirements](#requirements)
- [Benefits](#benefits)
- [License](#license)

## Features

- ✅ **Automatic Nginx Reverse Proxy** - Configures Nginx automatically for your services
- ✅ **Automatic HTTPS** - Sets up SSL/TLS certificates with Let's Encrypt via Certbot
- ✅ **Zero-Downtime Deployment** - Rolling deployment strategy ensures continuous availability
- ✅ **Docker Support** - Deploy Docker containers or connect to existing containers
- ✅ **Multiple Domains** - Support for multiple domains and subdomains per service
- ✅ **Health Checks** - Built-in health check monitoring for service reliability
- ✅ **YAML Configuration** - Simple, declarative configuration file format

## Installation

Install Suthep globally using your preferred package manager:

```bash
npm install -g suthep
# or
yarn global add suthep
# or
pnpm add -g suthep
```

> **Note:** The tool uses `tsx` to run TypeScript directly, so no build step is required for development. For production builds, you can optionally compile to JavaScript using `npm run build`.

## Quick Start

### 1. Initialize Configuration

Create a new configuration file interactively:

```bash
suthep init
```

This will create a `suthep.yml` file with interactive prompts, or you can use an example configuration:

```bash
cp example/suthep.yml suthep.yml
# Edit suthep.yml with your settings
```

### 2. Setup Prerequisites

Install and configure Nginx and Certbot on your system:

```bash
suthep setup
```

This command will:
- Install Nginx (if not already installed)
- Install Certbot (if not already installed)
- Configure system dependencies

### 3. Deploy Your Project

Deploy your project using the configuration file:

```bash
suthep deploy
```

## Configuration

The configuration file (`suthep.yml`) uses a YAML format to define your deployment. Here's the complete structure:

```yaml
project:
  name: my-app
  version: 1.0.0

services:
  - name: api
    port: 3000
    domains:
      - api.example.com
      - www.api.example.com
    healthCheck:
      path: /health
      interval: 30
    environment:
      NODE_ENV: production

  - name: webapp
    port: 8080
    docker:
      image: nginx:latest
      container: webapp-container
      port: 80
    domains:
      - example.com
      - www.example.com

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

### Service Configuration

Each service in the `services` array can have the following properties:

| Property | Required | Description |
|----------|----------|-------------|
| `name` | ✅ Yes | Unique identifier for the service |
| `port` | ✅ Yes | Port number the service runs on (host port) |
| `domains` | ✅ Yes | Array of domain names or subdomains to route to this service |
| `docker` | ❌ No | Docker configuration (see below) |
| `healthCheck` | ❌ No | Health check configuration (see below) |
| `environment` | ❌ No | Environment variables as key-value pairs |

#### Docker Configuration

When deploying Docker containers, use the `docker` object:

- **`image`**: Docker image to pull and run (e.g., `nginx:latest`)
- **`container`**: Name for the Docker container
- **`port`**: Internal port the container listens on (mapped to the service `port`)

#### Health Check Configuration

Configure health monitoring for your service:

- **`path`**: HTTP endpoint path for health checks (e.g., `/health`)
- **`interval`**: Time between health checks in seconds (default: 30)

## Commands

### `suthep init`

Initialize a new deployment configuration file with interactive prompts.

```bash
suthep init [-f suthep.yml]
```

**Options:**
- `-f, --file`: Configuration file path (default: `suthep.yml`)

### `suthep setup`

Install and configure Nginx and Certbot on your system. This command checks for existing installations and sets up any missing components.

```bash
suthep setup [--nginx-only] [--certbot-only]
```

**Options:**
- `--nginx-only`: Only install and configure Nginx
- `--certbot-only`: Only install and configure Certbot

### `suthep deploy`

Deploy your project using the configuration file. This command will:
1. Configure Nginx reverse proxy for all services
2. Obtain SSL certificates via Certbot (if enabled)
3. Deploy services with zero-downtime strategy

```bash
suthep deploy [service-name] [-f suthep.yml] [--no-https] [--no-nginx] [-e KEY=VALUE ...]
```

**Options:**
- `service-name`: Name of the service to deploy (optional, deploys all services if not specified)
- `-f, --file`: Configuration file path (default: `suthep.yml`)
- `--no-https`: Skip HTTPS/SSL certificate setup
- `--no-nginx`: Skip Nginx configuration (useful for testing)
- `-e, --env`: Set environment variables (can be used multiple times, e.g., `-e KEY1=value1 -e KEY2=value2`)

## Examples

### Example 1: Simple Node.js API Service

Deploy a Node.js API service with health checks:

```yaml
project:
  name: my-api
  version: 1.0.0

services:
  - name: api
    port: 3000
    domains:
      - api.example.com
    healthCheck:
      path: /health
      interval: 30
    environment:
      NODE_ENV: production

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

### Example 2: Docker Container Service

Deploy a web application using a Docker container:

```yaml
services:
  - name: webapp
    port: 8080
    docker:
      image: myapp/webapp:latest
      container: webapp-container
      port: 80
    domains:
      - example.com
      - www.example.com
```

### Example 3: Multiple Domains for Single Service

Route multiple domains to the same service:

```yaml
services:
  - name: dashboard
    port: 5000
    domains:
      - dashboard.example.com
      - admin.example.com
      - app.example.com
    healthCheck:
      path: /api/health
```

### Example 4: Connect to Existing Docker Container

Connect to an already running Docker container:

```yaml
services:
  - name: database-proxy
    port: 5432
    docker:
      container: postgres-container
      port: 5432
    domains:
      - db.example.com
```

> **Note:** When connecting to an existing container, omit the `image` field. The tool will use the existing container.

## Requirements

### System Requirements

- **Node.js** 16 or higher
- **Nginx** (installed automatically via `suthep setup`)
- **Certbot** (installed automatically via `suthep setup`)
- **Docker** (optional, required only for Docker-based services)
- **sudo access** (required for Nginx and Certbot operations)

### Permissions

Suthep requires sudo privileges to:
- Install system packages (Nginx, Certbot)
- Modify Nginx configuration files
- Reload Nginx service
- Obtain SSL certificates from Let's Encrypt

## Benefits

### Cost Optimization

Suthep helps optimize infrastructure costs by:

- **Multi-Service Management** - Run multiple services on a single server efficiently
- **Automated Configuration** - Eliminates manual Nginx and SSL setup, saving time and reducing errors
- **Zero-Downtime Deployments** - Rolling deployment strategy ensures continuous service availability
- **Health Monitoring** - Built-in health checks help maintain service reliability and catch issues early

### Developer Experience

- **Simple Configuration** - YAML-based configuration is easy to understand and maintain
- **One Command Deployment** - Deploy entire infrastructure with a single command
- **Automatic SSL** - HTTPS certificates are obtained and renewed automatically
- **Docker Integration** - Seamless support for containerized applications

## License

[MIT](LICENSE)
