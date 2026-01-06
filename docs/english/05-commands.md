# Commands Reference

This guide covers all available Suthep commands and their options.

## Command Overview

Suthep provides the following commands:

- `suthep init` - Initialize configuration file
- `suthep setup` - Setup prerequisites
- `suthep deploy` - Deploy services
- `suthep down` - Stop services
- `suthep up` - Start services
- `suthep restart` - Restart services
- `suthep list` - List all services and their status
- `suthep logs` - View service logs

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
| `service-name` | Name or index (1-based) of the service to deploy (optional, deploys all services if not specified). Use `suthep list` to see available services with indices. |

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

# Deploy a specific service by name
suthep deploy api

# Deploy a specific service by index (see indices with `suthep list`)
suthep deploy 1

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
| `service-name` | Name or index (1-based) of the service to bring down (optional). Use `suthep list` to see available services with indices. |

### Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--file` | `-f` | Configuration file path | `suthep.yml` |
| `--all` | - | Bring down all services | `false` |

### Examples

```bash
# Bring down a specific service by name
suthep down api

# Bring down a specific service by index
suthep down 1

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
| `service-name` | Name or index (1-based) of the service to bring up (optional). Use `suthep list` to see available services with indices. |

### Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--file` | `-f` | Configuration file path | `suthep.yml` |
| `--all` | - | Bring up all services | `false` |
| `--no-https` | - | Skip HTTPS setup | `false` |
| `--no-nginx` | - | Skip Nginx configuration | `false` |

### Examples

```bash
# Bring up a specific service by name
suthep up api

# Bring up a specific service by index
suthep up 1

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

## suthep restart

Restart services (stop and start containers, update Nginx configs).

### Usage

```bash
suthep restart [service-name] [options]
```

### Arguments

| Argument | Description |
|----------|-------------|
| `service-name` | Name or index (1-based) of the service to restart (optional). Use `suthep list` to see available services with indices. |

### Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--file` | `-f` | Configuration file path | `suthep.yml` |
| `--all` | - | Restart all services | `false` |
| `--no-https` | - | Skip HTTPS setup | `false` |
| `--no-nginx` | - | Skip Nginx configuration | `false` |

### Examples

```bash
# Restart a specific service by name
suthep restart api

# Restart a specific service by index
suthep restart 1

# Restart all services
suthep restart --all

# Restart without HTTPS
suthep restart api --no-https

# Restart without Nginx updates
suthep restart api --no-nginx

# Restart with custom config
suthep restart api -f production.yml
```

### What It Does

1. **Stops Docker containers** (if running)
2. **Starts Docker containers** again
3. **Waits for health checks** (if configured)
4. **Updates Nginx configurations**
5. **Sets up HTTPS** (if enabled)
6. **Reloads Nginx** to apply changes

## suthep list

List all services and their status (running, stopped, container status, Nginx configuration).

### Usage

```bash
suthep list [options]
# or
suthep ls [options]
```

### Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--file` | `-f` | Configuration file path | `suthep.yml` |

### Examples

```bash
# List all services
suthep list

# Use the alias
suthep ls

# List with custom config file
suthep list -f production.yml
```

### What It Does

1. **Loads configuration** from `suthep.yml`
2. **Checks Docker container status** for each service (if configured)
3. **Checks Nginx configuration status** for each service
4. **Displays a formatted table** showing:
   - Service index number (1, 2, 3...)
   - Service name
   - Overall status (Running/Stopped/Partial)
   - Port number
   - Container name and status
   - Nginx configuration status
   - Domain names
5. **Shows summary statistics** (running, stopped, total)

### Notes

- **Service indices**: The index numbers shown in the list can be used with other commands (e.g., `suthep restart 1` instead of `suthep restart api`)
- **Index-based selection**: All service commands (`deploy`, `up`, `down`, `restart`, `logs`) support both service names and indices

### Output Format

The command displays a color-coded table:

- **● Running** (green) - Service is fully operational (container running + Nginx enabled)
- **○ Stopped** (red) - Service is stopped (container stopped + Nginx disabled)
- **⚠ Partial** (yellow) - Mixed state (e.g., container running but Nginx disabled)

### Status Indicators

- **Container Status**: Shows if Docker containers are running or stopped
- **Nginx Status**: Shows if Nginx configuration is enabled, disabled, or not configured
- **Overall Status**: Combines container and Nginx status to show the complete service state

### Notes

- **Docker services**: Status depends on both container and Nginx configuration
- **Non-Docker services**: Status depends only on Nginx configuration
- **Partial status**: Indicates a service that's partially configured (e.g., container running but Nginx not enabled)
- The command checks actual container and file system state, not just configuration

## suthep logs

View logs for Docker services running in your project.

### Usage

```bash
suthep logs [service-name] [options]
```

### Arguments

| Argument | Description |
|----------|-------------|
| `service-name` | Name or index (1-based) of the service to show logs for (optional, shows all services if not specified). Use `suthep list` to see available services with indices. |

### Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--file` | `-f` | Configuration file path | `suthep.yml` |
| `--follow` | - | Follow log output (like `tail -f`) | `false` |
| `--tail` | - | Number of lines to show from the end of logs | `100` |

### Examples

```bash
# Show logs for all services (last 100 lines)
suthep logs

# Show logs for a specific service by name
suthep logs api

# Show logs for a specific service by index
suthep logs 1

# Follow logs for all services (real-time streaming)
suthep logs --follow

# Follow logs for a specific service
suthep logs api --follow

# Show last 50 lines for a specific service
suthep logs api --tail 50

# Follow logs with custom tail
suthep logs api --follow --tail 200
```

### What It Does

1. **Loads configuration** from `suthep.yml`
2. **Filters Docker services** (only Docker services have container logs)
3. **Checks container status** (only shows logs for running containers)
4. **Displays logs**:
   - In non-follow mode: Shows recent logs and exits
   - In follow mode: Streams logs in real-time until interrupted (Ctrl+C)
5. **Color-codes output** by service name for easy identification

### Notes

- **Docker services only**: Logs are only available for services with Docker configuration. Non-Docker services are skipped with a warning.
- **Running containers only**: Only shows logs for containers that are currently running. Stopped containers are listed separately.
- **Follow mode**: Use `--follow` to stream logs in real-time. Press `Ctrl+C` to stop.
- **Multiple services**: When viewing logs for multiple services, each log line is prefixed with the service name in a unique color.
- **Tail option**: The `--tail` option controls how many lines to show from the end of the log file. This applies to both follow and non-follow modes.

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

# Or simply restart a service
suthep restart api
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

