# Installation Guide

This guide will walk you through installing Suthep on your system.

## System Requirements

Before installing Suthep, ensure your system meets these requirements:

- **Node.js** version 16 or higher
- **npm**, **yarn**, or **pnpm** package manager
- **sudo/administrator privileges** (required for Nginx and Certbot setup)
- **Linux** or **macOS** operating system

## Installing Suthep

Suthep can be installed globally using any Node.js package manager.

### Using npm

```bash
npm install -g suthep
```

### Using yarn

```bash
yarn global add suthep
```

### Using pnpm

```bash
pnpm add -g suthep
```

## Verify Installation

After installation, verify that Suthep is installed correctly:

```bash
suthep --version
```

You should see the version number (e.g., `0.1.0-beta.1`).

You can also check the help menu:

```bash
suthep --help
```

## Installing Prerequisites

Suthep requires Nginx and Certbot to function. You can install these automatically using the `setup` command:

```bash
suthep setup
```

This command will:
- Install Nginx (if not already installed)
- Install Certbot (if not already installed)
- Configure system dependencies

### Manual Installation (Optional)

If you prefer to install prerequisites manually:

#### Nginx Installation

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install -y nginx
```

**CentOS/RHEL:**
```bash
sudo yum install -y nginx
```

**macOS:**
```bash
brew install nginx
```

#### Certbot Installation

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx
```

**CentOS/RHEL:**
```bash
sudo yum install -y certbot python3-certbot-nginx
```

**macOS:**
```bash
brew install certbot
```

## Docker (Optional)

If you plan to deploy Docker containers, install Docker:

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install -y docker.io
sudo systemctl start docker
sudo systemctl enable docker
```

**macOS:**
```bash
brew install docker
```

Or download Docker Desktop from [docker.com](https://www.docker.com/products/docker-desktop).

## Post-Installation

After installation, you're ready to:

1. **Initialize your first configuration:**
   ```bash
   suthep init
   ```

2. **Or continue to the Quick Start guide:**
   See [Quick Start Guide](./03-quick-start.md)

## Troubleshooting Installation

### Command Not Found

If you get a "command not found" error:

1. **Check Node.js installation:**
   ```bash
   node --version
   npm --version
   ```

2. **Verify global bin path:**
   ```bash
   npm config get prefix
   ```

3. **Add npm global bin to PATH** (if needed):
   ```bash
   export PATH="$PATH:$(npm config get prefix)/bin"
   ```

### Permission Errors

If you encounter permission errors:

1. **Use sudo for global installation:**
   ```bash
   sudo npm install -g suthep
   ```

2. **Or configure npm to use a different directory:**
   ```bash
   mkdir ~/.npm-global
   npm config set prefix '~/.npm-global'
   export PATH=~/.npm-global/bin:$PATH
   ```

### Nginx/Certbot Installation Issues

If `suthep setup` fails:

1. **Check your package manager:**
   - Ubuntu/Debian: Ensure `apt-get` is available
   - CentOS/RHEL: Ensure `yum` is available
   - macOS: Ensure Homebrew is installed

2. **Run setup with verbose output:**
   ```bash
   suthep setup --verbose
   ```

3. **Install prerequisites manually** (see Manual Installation above)

## Next Steps

Now that Suthep is installed:

- [Quick Start Guide](./03-quick-start.md) - Deploy your first service
- [Configuration Guide](./04-configuration.md) - Learn about configuration options

---

**Previous:** [Introduction](./01-introduction.md) | **Next:** [Quick Start →](./03-quick-start.md)

