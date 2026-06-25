# Troubleshooting Guide

This guide helps you resolve common issues when using Suthep.

## Common Issues

### Configuration File Not Found

**Error:**
```
Configuration file not found: suthep.yml
```

**Solution:**
1. Ensure you're in the correct directory
2. Check if `suthep.yml` exists:
   ```bash
   ls -la suthep.yml
   ```
3. Create configuration file:
   ```bash
   suthep init
   ```
4. Or specify custom path:
   ```bash
   suthep deploy -f /path/to/config.yml
   ```

### Port Already in Use

**Error:**
```
Error: Port 3000 is already in use
```

**Solution:**
1. Find what's using the port:
   ```bash
   sudo lsof -i :3000
   # or
   sudo netstat -tulpn | grep 3000
   ```

2. Stop the conflicting service or change the port in `suthep.yml`:
   ```yaml
   services:
     - name: api
       port: 3001  # Changed from 3000
   ```

### SSL Certificate Creation Failed

**Error:**
```
Failed to obtain SSL certificate for example.com
```

**Solutions:**

1. **Check DNS Configuration**
   ```bash
   nslookup example.com
   # Ensure domain points to your server IP
   ```

2. **Verify Ports Are Open**
   ```bash
   # Check if ports 80 and 443 are open
   sudo ufw status
   # or
   sudo iptables -L
   ```

3. **Use Staging Mode for Testing**
   ```yaml
   certbot:
     staging: true  # Use staging to avoid rate limits
   ```

4. **Check Domain Accessibility**
   ```bash
   curl -I http://example.com
   # Should return HTTP response
   ```

5. **Check Certbot Logs**
   ```bash
   sudo tail -f /var/log/letsencrypt/letsencrypt.log
   ```

### Nginx Configuration Errors

**Error:**
```
nginx: configuration file /etc/nginx/nginx.conf test failed
```

**Solutions:**

1. **Test Nginx Configuration**
   ```bash
   sudo nginx -t
   ```

2. **Check Nginx Error Logs**
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

3. **Check Generated Config Files**
   ```bash
   ls -la /etc/nginx/sites-available/
   cat /etc/nginx/sites-available/example_com.conf
   ```

4. **Verify Nginx Syntax**
   ```bash
   sudo nginx -t -c /etc/nginx/nginx.conf
   ```

### Docker Container Issues

**Error:**
```
Error: Docker container failed to start
```

**Solutions:**

1. **Check Docker Status**
   ```bash
   docker ps
   docker ps -a  # Show all containers
   ```

2. **Check Container Logs**
   ```bash
   docker logs <container-name>
   ```

3. **Verify Docker Image**
   ```bash
   docker images
   docker pull <image-name>  # Pull latest image
   ```

4. **Check Port Conflicts**
   ```bash
   docker ps | grep <port>
   ```

5. **Remove Old Containers**
   ```bash
   docker rm <container-name>
   ```

### Health Check Failures

**Error:**
```
Health check failed for service api
```

**Solutions:**

1. **Verify Health Check Endpoint**
   ```bash
   curl http://localhost:3000/health
   ```

2. **Check Service is Running**
   ```bash
   # For Docker
   docker ps
   docker logs <container-name>

   # For non-Docker
   ps aux | grep <service>
   ```

3. **Increase Health Check Timeout**
   ```yaml
   deployment:
     healthCheckTimeout: 60000  # Increase to 60 seconds
   ```

4. **Verify Health Check Path**
   ```yaml
   services:
     - name: api
       healthCheck:
         path: /health  # Ensure this path exists
   ```

### Permission Denied Errors

**Error:**
```
Permission denied: /etc/nginx/sites-available/example.conf
```

**Solutions:**

1. **Use Sudo**
   ```bash
   sudo suthep deploy
   ```

2. **Check File Permissions**
   ```bash
   ls -la /etc/nginx/sites-available/
   ```

3. **Verify User Permissions**
   ```bash
   groups  # Check your user groups
   ```

### Service Not Accessible

**Issue:** Service deployed but not accessible via domain.

**Solutions:**

1. **Check Nginx Status**
   ```bash
   sudo systemctl status nginx
   ```

2. **Verify Site is Enabled**
   ```bash
   ls -la /etc/nginx/sites-enabled/
   # Should have symlink to sites-available config
   ```

3. **Check DNS Resolution**
   ```bash
   nslookup example.com
   dig example.com
   ```

4. **Test Local Connection**
   ```bash
   curl http://localhost:3000
   ```

5. **Check Firewall**
   ```bash
   sudo ufw status
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   ```

### Zero-Downtime Deployment Issues

**Issue:** Deployment causes downtime.

**Solutions:**

1. **Verify Deployment Strategy**
   ```yaml
   deployment:
     strategy: rolling  # or blue-green
   ```

2. **Check Container Health**
   ```bash
   docker ps
   # Both old and new containers should be running during deployment
   ```

3. **Monitor Nginx Reload**
   ```bash
   sudo nginx -t  # Test before reload
   sudo systemctl reload nginx  # Graceful reload
   ```

### Multiple Services on Same Domain

**Issue:** Path-based routing not working.

**Solutions:**

1. **Verify Path Configuration**
   ```yaml
   services:
     - name: api
       path: /api  # Ensure path is set
     - name: ui
       path: /     # Root path
   ```

2. **Check Nginx Config**
   ```bash
   cat /etc/nginx/sites-available/example_com.conf
   # Should have location blocks for each path
   ```

3. **Test Paths**
   ```bash
   curl http://example.com/api/health
   curl http://example.com/
   ```

## Debugging Tips

### Enable Verbose Output

Some commands support verbose output. Check logs:

```bash
# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Check Docker logs
docker logs <container-name>

# Check system logs
sudo journalctl -u nginx -f
```

### Test Configuration

Before deploying, test your configuration:

```bash
# Validate YAML syntax
yamllint suthep.yml

# Test Nginx config
sudo nginx -t

# Test Docker image
docker run --rm <image-name>
```

### Step-by-Step Deployment

Deploy step by step to isolate issues:

```bash
# 1. Deploy without Nginx
suthep deploy --no-nginx

# 2. Deploy without HTTPS
suthep deploy --no-https

# 3. Full deployment
suthep deploy
```

## Getting Help

If you're still experiencing issues:

1. **Check Logs**
   - Nginx: `/var/log/nginx/`
   - Certbot: `/var/log/letsencrypt/`
   - Docker: `docker logs <container>`

2. **Verify Configuration**
   - Review `suthep.yml` syntax
   - Check all required fields are present
   - Validate port numbers and domains

3. **Test Components Individually**
   - Test Nginx manually
   - Test Docker containers
   - Test SSL certificates

4. **Check System Resources**
   ```bash
   # Check disk space
   df -h

   # Check memory
   free -h

   # Check CPU
   top
   ```

## Prevention

To avoid common issues:

1. **Use Staging for Testing**
   ```yaml
   certbot:
     staging: true
   ```

2. **Validate Configuration**
   ```bash
   suthep init  # Interactive validation
   ```

3. **Test Before Production**
   - Test on staging environment first
   - Verify all services work individually
   - Test deployment process

4. **Monitor Health Checks**
   - Set appropriate intervals
   - Monitor health check endpoints
   - Set reasonable timeouts

## Next Steps

- [Advanced Topics](./08-advanced.md) - Advanced configuration and optimization
- [Examples](./06-examples.md) - Review working examples

---

**Previous:** [Examples](./06-examples.md) | **Next:** [Advanced Topics →](./08-advanced.md)

