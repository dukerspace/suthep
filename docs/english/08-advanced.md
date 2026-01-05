# Advanced Topics

This guide covers advanced configuration options and optimization techniques for Suthep.

## Advanced Configuration

### Custom Nginx Configuration

While Suthep generates Nginx configurations automatically, you can customize them by editing the generated files:

```bash
# Edit generated config
sudo nano /etc/nginx/sites-available/example_com.conf
```

**Note:** Manual edits may be overwritten on redeployment. Consider using Nginx includes for custom configurations.

### Environment-Specific Configurations

Use different configuration files for different environments:

```bash
# Development
suthep deploy -f suthep.dev.yml

# Staging
suthep deploy -f suthep.staging.yml

# Production
suthep deploy -f suthep.prod.yml
```

### Multiple Deployment Strategies

Configure different strategies per service (future feature):

```yaml
services:
  - name: api
    deployment:
      strategy: blue-green
  - name: webapp
    deployment:
      strategy: rolling
```

## Performance Optimization

### Health Check Optimization

Optimize health check intervals based on service criticality:

```yaml
# Critical service - frequent checks
services:
  - name: payment-api
    healthCheck:
      interval: 15  # Check every 15 seconds

# Less critical service - less frequent checks
services:
  - name: analytics
    healthCheck:
      interval: 120  # Check every 2 minutes
```

### Deployment Timeout Tuning

Adjust health check timeouts for slow-starting services:

```yaml
deployment:
  healthCheckTimeout: 60000  # 60 seconds for slow services
```

### Resource Management

Monitor and manage resources:

```bash
# Monitor Docker resources
docker stats

# Monitor Nginx connections
sudo nginx -V  # Check worker processes
```

## Security Best Practices

### SSL/TLS Configuration

Ensure strong SSL configuration:

1. **Use Production Certificates**
   ```yaml
   certbot:
     staging: false  # Use production certificates
   ```

2. **Monitor Certificate Expiry**
   ```bash
   sudo certbot certificates
   ```

3. **Set Up Auto-Renewal**
   ```bash
   # Certbot auto-renewal (usually set up automatically)
   sudo certbot renew --dry-run
   ```

### Firewall Configuration

Configure firewall rules:

```bash
# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Deny direct access to service ports
sudo ufw deny 3000/tcp
```

### Container Security

Secure Docker containers:

```yaml
services:
  - name: api
    docker:
      image: myapp/api:latest
      container: api-container
      # Consider adding:
      # - Resource limits
      # - Security options
      # - Network isolation
```

## Monitoring and Logging

### Nginx Access Logs

Monitor access patterns:

```bash
# Real-time access monitoring
sudo tail -f /var/log/nginx/access.log

# Analyze access patterns
sudo cat /var/log/nginx/access.log | grep "GET /api"
```

### Docker Container Logs

Monitor container logs:

```bash
# Follow logs
docker logs -f <container-name>

# View last 100 lines
docker logs --tail 100 <container-name>

# Logs with timestamps
docker logs -t <container-name>
```

### Health Check Monitoring

Monitor health check status:

```bash
# Manual health check
curl http://localhost:3000/health

# Automated monitoring script
while true; do
  curl -f http://localhost:3000/health || echo "Health check failed"
  sleep 30
done
```

## Scaling Strategies

### Horizontal Scaling

Deploy multiple instances:

```yaml
services:
  - name: api
    port: 3000
    instances: 3  # Deploy 3 instances
    domains:
      - api.example.com
```

**Note:** This is a conceptual example. Current implementation manages single instances per service.

### Load Balancing

Use Nginx for load balancing (advanced):

```nginx
upstream api_backend {
    server localhost:3000;
    server localhost:3001;
    server localhost:3002;
}
```

## Backup and Recovery

### Configuration Backup

Backup your configuration:

```bash
# Backup configuration
cp suthep.yml suthep.yml.backup

# Version control
git add suthep.yml
git commit -m "Update deployment configuration"
```

### Nginx Configuration Backup

Backup Nginx configurations:

```bash
# Backup all Nginx configs
sudo tar -czf nginx-configs-backup.tar.gz /etc/nginx/sites-available/
```

### Container Backup

Backup Docker containers:

```bash
# Export container
docker export <container-name> > container-backup.tar

# Or commit to image
docker commit <container-name> backup-image:latest
```

## Automation and CI/CD

### Deployment Scripts

Create deployment scripts:

```bash
#!/bin/bash
# deploy.sh

set -e

echo "Deploying services..."

# Run tests
npm test

# Deploy
suthep deploy

echo "Deployment complete!"
```

### CI/CD Integration

Example GitHub Actions workflow:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: npm install -g suthep
      - run: suthep deploy
        env:
          SSH_KEY: ${{ secrets.SSH_KEY }}
```

## Advanced Docker Usage

### Multi-Stage Builds

Use multi-stage builds for optimized images:

```dockerfile
# Build stage
FROM node:16 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM node:16-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/index.js"]
```

### Docker Compose Integration

Use Docker Compose alongside Suthep:

```yaml
# docker-compose.yml
version: '3'
services:
  database:
    image: postgres:14
    # ... database config
```

Then connect Suthep to the container:

```yaml
services:
  - name: api
    docker:
      container: myapp_database_1  # From docker-compose
      port: 5432
```

## Troubleshooting Advanced Issues

### Performance Debugging

Identify performance bottlenecks:

```bash
# Monitor Nginx performance
sudo nginx -V  # Check compiled modules
sudo nginx -T  # Test and show full config

# Monitor system resources
htop
iostat
```

### Network Debugging

Debug network issues:

```bash
# Check port binding
sudo netstat -tulpn | grep 3000

# Test connectivity
curl -v http://localhost:3000

# Check DNS
dig example.com
nslookup example.com
```

### Container Debugging

Debug container issues:

```bash
# Inspect container
docker inspect <container-name>

# Execute commands in container
docker exec -it <container-name> /bin/sh

# Check container network
docker network ls
docker network inspect bridge
```

## Best Practices Summary

1. **Use Version Control** - Track configuration changes
2. **Test in Staging** - Always test before production
3. **Monitor Health Checks** - Set appropriate intervals
4. **Backup Configurations** - Regular backups
5. **Secure Access** - Use HTTPS, configure firewalls
6. **Optimize Resources** - Monitor and optimize usage
7. **Document Changes** - Keep deployment logs
8. **Automate Deployments** - Use CI/CD pipelines

## Next Steps

- Review [Examples](./06-examples.md) for practical use cases
- Check [Troubleshooting](./07-troubleshooting.md) for common issues
- Refer to [Configuration Guide](./04-configuration.md) for all options

---

**Previous:** [Troubleshooting](./07-troubleshooting.md) | **Back to:** [README](./README.md)

