# Quick Start Guide

This guide will help you deploy your first service with Suthep in just a few minutes.

## Step 1: Initialize Configuration

Create a new configuration file interactively:

```bash
suthep init
```

This command will prompt you for:
- Project name and version
- Service details (name, port, domains)
- Docker configuration (if needed)
- Health check settings
- SSL certificate email

Alternatively, you can copy the example configuration:

```bash
cp suthep.example.yml suthep.yml
```

Then edit `suthep.yml` with your settings.

## Step 2: Setup Prerequisites

Install and configure Nginx and Certbot:

```bash
suthep setup
```

This will:
- Install Nginx (if not already installed)
- Install Certbot (if not already installed)
- Configure system dependencies

**Note:** This command requires sudo privileges.

## Step 3: Deploy Your Service

Deploy your project:

```bash
suthep deploy
```

This command will:
1. Configure Nginx reverse proxy for all services
2. Obtain SSL certificates via Certbot (if enabled)
3. Deploy services with zero-downtime strategy

## Example: Deploying a Simple API

Let's walk through deploying a Node.js API service:

### 1. Create Configuration

Create `suthep.yml`:

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

### 2. Setup Prerequisites

```bash
suthep setup
```

### 3. Deploy

```bash
suthep deploy
```

### 4. Verify Deployment

After deployment, Suthep will display service URLs:

```
📋 Service URLs:
   api: https://api.example.com
```

Visit the URL in your browser to verify the service is running.

## Example: Deploying a Docker Container

To deploy a Docker container:

```yaml
services:
  - name: webapp
    port: 8080
    docker:
      image: nginx:latest
      container: webapp-container
      port: 80
    domains:
      - example.com
      - www.example.com
```

Then run:

```bash
suthep deploy
```

## Common Commands

### Check Service Status

```bash
# List all services and their status
suthep list

# Or use the alias
suthep ls

# View Nginx configuration
sudo nginx -t

# Check running containers
docker ps

# View service logs
docker logs <container-name>
```

### Update Configuration

1. Edit `suthep.yml`
2. Redeploy (bring down and deploy again):
   ```bash
   suthep down <service-name> && suthep deploy <service-name>
   # Or using index (see indices with `suthep list`):
   suthep down 1 && suthep deploy 1
   # Or for all services:
   suthep down --all && suthep deploy
   ```
3. Or simply restart a service:
   ```bash
   suthep restart <service-name>
   # Or using index:
   suthep restart 1
   # Or restart all services:
   suthep restart --all
   ```

### Stop Services

```bash
# Stop a specific service
suthep down <service-name>

# Stop all services
suthep down --all
```

### Start Services

```bash
# Start a specific service
suthep up <service-name>

# Start all services
suthep up --all
```

## What Happens During Deployment?

When you run `suthep deploy`, Suthep:

1. **Loads Configuration** - Reads your `suthep.yml` file
2. **Starts Docker Containers** - If Docker is configured, starts containers
3. **Configures Nginx** - Generates and writes Nginx configuration files
4. **Enables Sites** - Creates symlinks to enable Nginx sites
5. **Obtains SSL Certificates** - Requests certificates from Let's Encrypt
6. **Updates Nginx for HTTPS** - Adds SSL configuration to Nginx
7. **Reloads Nginx** - Applies all changes
8. **Performs Health Checks** - Verifies services are running correctly

## Troubleshooting Quick Start

### Domain Not Resolving

Ensure your domain points to your server:

```bash
# Check DNS
nslookup api.example.com

# Verify server IP matches
curl -I http://api.example.com
```

### Port Already in Use

If you get a "port already in use" error:

1. **Find what's using the port:**
   ```bash
   sudo lsof -i :3000
   ```

2. **Stop the conflicting service** or **change the port** in `suthep.yml`

### SSL Certificate Issues

If SSL certificate creation fails:

1. **Check domain DNS** - Ensure domain points to your server
2. **Use staging mode** for testing:
   ```yaml
   certbot:
     staging: true
   ```

3. **Check firewall** - Ensure ports 80 and 443 are open

### Nginx Configuration Errors

If Nginx fails to reload:

```bash
# Test Nginx configuration
sudo nginx -t

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

## Next Steps

Now that you've deployed your first service:

- [Configuration Guide](./04-configuration.md) - Learn about all configuration options
- [Commands Reference](./05-commands.md) - Explore all available commands
- [Examples](./06-examples.md) - See more deployment examples

---

**Previous:** [Installation](./02-installation.md) | **Next:** [Configuration Guide →](./04-configuration.md)

