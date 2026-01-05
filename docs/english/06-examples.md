# Examples

This guide provides real-world examples of deploying different types of services with Suthep.

## Example 1: Simple Node.js API

Deploy a Node.js API service with health checks.

### Configuration

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
      PORT: 3000

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

### Deployment

```bash
suthep setup
suthep deploy
```

### Result

- Service available at `https://api.example.com`
- Health checks performed every 30 seconds
- Automatic SSL certificate from Let's Encrypt

## Example 2: Docker Web Application

Deploy a web application using a Docker container.

### Configuration

```yaml
project:
  name: webapp
  version: 1.0.0

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
    healthCheck:
      path: /
      interval: 30

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

### Deployment

```bash
suthep deploy
```

### Result

- Docker container running on port 8080
- Service available at `https://example.com` and `https://www.example.com`
- Automatic container management

## Example 3: Multiple Services on Same Domain

Route multiple services on the same domain using path-based routing.

### Configuration

```yaml
project:
  name: fullstack-app
  version: 1.0.0

services:
  # API service on /api path
  - name: api
    port: 3001
    path: /api
    domains:
      - example.com
    docker:
      image: myapp/api:latest
      container: api-container
      port: 3001
    healthCheck:
      path: /api/health
      interval: 30

  # UI service on root path
  - name: ui
    port: 3000
    path: /
    domains:
      - example.com
    docker:
      image: myapp/ui:latest
      container: ui-container
      port: 3000
    healthCheck:
      path: /
      interval: 30

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

### Deployment

```bash
suthep deploy
```

### Result

- API available at `https://example.com/api`
- UI available at `https://example.com`
- Both services share the same domain

## Example 4: Multiple Domains for Single Service

Route multiple domains to the same service.

### Configuration

```yaml
project:
  name: dashboard
  version: 1.0.0

services:
  - name: dashboard
    port: 5000
    domains:
      - dashboard.example.com
      - admin.example.com
      - app.example.com
    healthCheck:
      path: /api/health
      interval: 60
    environment:
      DATABASE_URL: postgresql://localhost:5432/dashboard
      REDIS_URL: redis://localhost:6379

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

### Deployment

```bash
suthep deploy
```

### Result

- Service available at:
  - `https://dashboard.example.com`
  - `https://admin.example.com`
  - `https://app.example.com`
- All domains route to the same service

## Example 5: Connect to Existing Docker Container

Connect to an already running Docker container.

### Configuration

```yaml
project:
  name: database-proxy
  version: 1.0.0

services:
  - name: database-proxy
    port: 5432
    docker:
      container: postgres-container
      port: 5432
    domains:
      - db.example.com

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

### Deployment

```bash
# Ensure container is running
docker start postgres-container

# Deploy
suthep deploy
```

### Result

- Nginx configured to proxy to existing container
- No new container created

## Example 6: Microservices Architecture

Deploy multiple microservices with different domains.

### Configuration

```yaml
project:
  name: microservices-platform
  version: 1.0.0

services:
  # User service
  - name: user-service
    port: 3001
    domains:
      - users.api.example.com
    docker:
      image: myapp/user-service:latest
      container: user-service-container
      port: 3001
    healthCheck:
      path: /health
      interval: 30

  # Product service
  - name: product-service
    port: 3002
    domains:
      - products.api.example.com
    docker:
      image: myapp/product-service:latest
      container: product-service-container
      port: 3002
    healthCheck:
      path: /health
      interval: 30

  # Order service
  - name: order-service
    port: 3003
    domains:
      - orders.api.example.com
    docker:
      image: myapp/order-service:latest
      container: order-service-container
      port: 3003
    healthCheck:
      path: /health
      interval: 30

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

### Deployment

```bash
suthep deploy
```

### Result

- Each microservice has its own subdomain
- Independent deployment and scaling
- All services have automatic HTTPS

## Example 7: Development Environment

Deploy with staging SSL certificates for testing.

### Configuration

```yaml
project:
  name: dev-app
  version: 0.1.0

services:
  - name: api
    port: 3000
    domains:
      - api.dev.example.com
    healthCheck:
      path: /health
      interval: 60

nginx:
  configPath: /etc/nginx/sites-available
  reloadCommand: sudo nginx -t && sudo systemctl reload nginx

certbot:
  email: dev@example.com
  staging: true  # Use staging for testing

deployment:
  strategy: rolling
  healthCheckTimeout: 30000
```

### Deployment

```bash
suthep deploy
```

### Result

- Uses Let's Encrypt staging environment
- No rate limits for testing
- Can test SSL without affecting production

## Example 8: Blue-Green Deployment

Use blue-green deployment strategy for zero downtime.

### Configuration

```yaml
project:
  name: production-app
  version: 2.0.0

services:
  - name: api
    port: 3000
    domains:
      - api.example.com
    docker:
      image: myapp/api:v2.0.0
      container: api-container
      port: 3000
    healthCheck:
      path: /health
      interval: 30

nginx:
  configPath: /etc/nginx/sites-available
  reloadCommand: sudo nginx -t && sudo systemctl reload nginx

certbot:
  email: admin@example.com
  staging: false

deployment:
  strategy: blue-green  # Use blue-green deployment
  healthCheckTimeout: 30000
```

### Deployment

```bash
suthep deploy
```

### Result

- Creates new container alongside old one
- Switches traffic to new container
- Removes old container after switch
- Zero downtime during deployment

## Best Practices from Examples

1. **Use descriptive service names** - Makes configuration easier to understand
2. **Set appropriate health check intervals** - Balance between responsiveness and load
3. **Use staging for development** - Avoid rate limits during testing
4. **Group related services** - Organize by domain or functionality
5. **Use path-based routing** - Efficiently use single domain for multiple services

## Next Steps

- [Troubleshooting](./07-troubleshooting.md) - Common issues and solutions
- [Advanced Topics](./08-advanced.md) - Advanced configuration options

---

**Previous:** [Commands Reference](./05-commands.md) | **Next:** [Troubleshooting →](./07-troubleshooting.md)

