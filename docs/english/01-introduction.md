# Introduction to Suthep

## What is Suthep?

Suthep is a command-line tool designed to simplify the deployment of web applications and services. It automates the complex process of setting up reverse proxies, SSL certificates, and managing deployments with zero downtime.

## Why Use Suthep?

### Simplified Deployment

Traditional deployment processes require manual configuration of:
- Nginx reverse proxy rules
- SSL certificate management
- Docker container orchestration
- Health check monitoring
- Zero-downtime deployment strategies

Suthep handles all of this automatically with a simple YAML configuration file.

### Key Benefits

1. **Time Savings** - Deploy in minutes instead of hours
2. **Reduced Errors** - Automated configuration reduces human error
3. **Zero Downtime** - Rolling deployments ensure continuous service availability
4. **Easy Management** - Simple commands to deploy, update, and manage services
5. **Cost Effective** - Run multiple services on a single server efficiently

## How It Works

Suthep follows a simple workflow:

1. **Configure** - Create a `suthep.yml` configuration file
2. **Setup** - Install prerequisites (Nginx, Certbot) with `suthep setup`
3. **Deploy** - Deploy your services with `suthep deploy`

Behind the scenes, Suthep:
- Generates Nginx configuration files
- Obtains SSL certificates from Let's Encrypt
- Manages Docker containers
- Performs health checks
- Handles zero-downtime deployments

## Use Cases

Suthep is ideal for:

- **Small to Medium Applications** - Deploy multiple services on a single server
- **Microservices** - Manage multiple services with different domains
- **Docker Applications** - Deploy containerized applications easily
- **API Services** - Set up reverse proxies for API endpoints
- **Web Applications** - Deploy web apps with automatic HTTPS

## What You'll Learn

In this guide, you'll learn:

- How to install and set up Suthep
- How to create and configure deployment files
- How to use all available commands
- How to deploy different types of services
- How to troubleshoot common issues
- Advanced configuration options

## Prerequisites

Before using Suthep, you should have:

- **Node.js 16+** installed
- **sudo/administrator access** on your server
- **Domain names** pointing to your server (for HTTPS)
- **Basic knowledge** of YAML configuration files
- **Docker** (optional, only if deploying Docker containers)

## Next Steps

Ready to get started? Continue to:

- [Installation Guide](./02-installation.md) - Install Suthep on your system
- [Quick Start Guide](./03-quick-start.md) - Deploy your first service

---

**Previous:** [README](./README.md) | **Next:** [Installation →](./02-installation.md)

