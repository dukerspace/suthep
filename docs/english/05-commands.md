# Commands Reference

This guide covers all available Suthep commands and their options.

## Command Overview

Suthep provides the following commands:

- `suthep init` - Initialize configuration file
- `suthep setup` - Setup prerequisites
- `suthep deploy` - Deploy services
- `suthep down` - Stop services
- `suthep up` - Start services

## suthep init

Initialize a new deployment configuration file with interactive prompts.

### Usage

```bash
suthep init [options]
```

### Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--file` | `-f` | Configuration file path | `suthep.yml` |

### Examples

```bash
# Create default configuration file
suthep init

# Create custom configuration file
suthep init -f my-config.yml
```

### Interactive Prompts

The `init` command will prompt you for:

1. **Project Information**
   - Project name
   - Project version

2. **Service Configuration** (for each service)
   - Service name
   - Service port
   - Domain names (comma-separated)
   - Docker usage
   - Docker image (if using Docker)
   - Container name
   - Container port
   - Health check configuration
   - Health check path
   - Health check interval

3. **SSL Certificate**
   - Email for Let's Encrypt
   - Staging environment (for testing)

## suthep setup

Install and configure Nginx and Certbot on your system.

### Usage

```bash
suthep setup [options]
```

### Options

| Option | Description |
|--------|-------------|
| `--nginx-only` | Only install and configure Nginx |
| `--certbot-only` | Only install and configure Certbot |

### Examples

```bash
# Setup both Nginx and Certbot
suthep setup

# Setup only Nginx
suthep setup --nginx-only

# Setup only Certbot
suthep setup --certbot-only
```

### What It Does

1. **Checks for existing installations**
2. **Installs missing components:**
   - Nginx (via apt-get, yum, or Homebrew)
   - Certbot (via apt-get, yum, or Homebrew)
3. **Starts and enables services**

**Note:** Requires sudo privileges.

## suthep deploy

Deploy your project using the configuration file.

### Usage

```bash
suthep deploy [service-name] [options]
```

### Arguments

| Argument | Description |
|----------|-------------|
| `service-name` | Name of the service to deploy (optional, deploys all services if not specified) |

### Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--file` | `-f` | Configuration file path | `suthep.yml` |
| `--no-https` | - | Skip HTTPS/SSL certificate setup | `false` |
| `--no-nginx` | - | Skip Nginx configuration | `false` |
| `--env` | `-e` | Set environment variables (can be used multiple times, e.g., `-e KEY1=value1 -e KEY2=value2`) | - |

### Examples

```bash
# Deploy all services with default configuration
suthep deploy

# Deploy a specific service
suthep deploy api

# Deploy with custom config file
suthep deploy -f production.yml

# Deploy a specific service without HTTPS (for testing)
suthep deploy api --no-https

# Deploy without Nginx (for testing)
suthep deploy --no-nginx

# Deploy without both
suthep deploy --no-https --no-nginx

# Deploy with environment variables
suthep deploy api -e NODE_ENV=production -e API_KEY=secret123

# Deploy with environment variables and custom config
suthep deploy -f production.yml -e DATABASE_URL=postgres://localhost/db -e REDIS_URL=redis://localhost
```

### What It Does

1. **Loads configuration** from `suthep.yml`
2. **Starts Docker containers** (if configured)
3. **Configures Nginx** reverse proxy
4. **Obtains SSL certificates** (if enabled)
5. **Updates Nginx** with HTTPS configuration
6. **Reloads Nginx** to apply changes
7. **Performs health checks** (if configured)

## suthep down

Bring down services (stop containers and disable Nginx configs).

### Usage

```bash
suthep down [service-name] [options]
```

### Arguments

| Argument | Description |
|----------|-------------|
| `service-name` | Name of the service to bring down (optional) |

### Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--file` | `-f` | Configuration file path | `suthep.yml` |
| `--all` | - | Bring down all services | `false` |

### Examples

```bash
# Bring down a specific service
suthep down api

# Bring down all services
suthep down --all

# Bring down with custom config
suthep down api -f production.yml
```

### What It Does

1. **Stops Docker containers** (if configured)
2. **Disables Nginx configurations**
3. **Reloads Nginx** to apply changes

## suthep up

Bring up services (start containers and enable Nginx configs).

### Usage

```bash
suthep up [service-name] [options]
```

### Arguments

| Argument | Description |
|----------|-------------|
| `service-name` | Name of the service to bring up (optional) |

### Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--file` | `-f` | Configuration file path | `suthep.yml` |
| `--all` | - | Bring up all services | `false` |
| `--no-https` | - | Skip HTTPS setup | `false` |
| `--no-nginx` | - | Skip Nginx configuration | `false` |

### Examples

```bash
# Bring up a specific service
suthep up api

# Bring up all services
suthep up --all

# Bring up without HTTPS
suthep up api --no-https
```

### What It Does

1. **Starts Docker containers** (if configured)
2. **Enables Nginx configurations**
3. **Sets up HTTPS** (if enabled)
4. **Reloads Nginx** to apply changes

## Global Options

All commands support:

- `--help` or `-h` - Show help message
- `--version` or `-V` - Show version number

### Examples

```bash
# Show help for deploy command
suthep deploy --help

# Show version
suthep --version
```

## Command Workflow

### Typical Deployment Workflow

```bash
# 1. Initialize configuration
suthep init

# 2. Setup prerequisites (first time only)
suthep setup

# 3. Deploy services
suthep deploy
```

### Update Workflow

```bash
# 1. Edit suthep.yml
nano suthep.yml

# 2. Redeploy (bring down and deploy again)
suthep down api && suthep deploy api

# Or redeploy all services
suthep down --all && suthep deploy
```

### Maintenance Workflow

```bash
# Stop services for maintenance
suthep down --all

# ... perform maintenance ...

# Start services again
suthep up --all
```

## Exit Codes

Suthep uses the following exit codes:

- `0` - Success
- `1` - Error (configuration error, deployment failure, etc.)

## Error Handling

If a command fails:

1. **Check the error message** - It usually indicates what went wrong
2. **Verify configuration** - Ensure `suthep.yml` is valid
3. **Check prerequisites** - Ensure Nginx and Certbot are installed
4. **Review logs** - Check Nginx and Docker logs for details

## Next Steps

- [Examples](./06-examples.md) - See commands in action
- [Troubleshooting](./07-troubleshooting.md) - Common issues and solutions

---

**Previous:** [Configuration Guide](./04-configuration.md) | **Next:** [Examples →](./06-examples.md)

