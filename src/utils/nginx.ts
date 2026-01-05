import { execa } from 'execa'
import fs from 'fs-extra'
import path from 'path'
import type { ServiceConfig } from '../types/config'

/**
 * Check if a domain is a root domain (no subdomain)
 * Root domain: example.com (2 parts)
 * Subdomain: dev.example.com (3+ parts)
 */
export function isRootDomain(domain: string): boolean {
  // Remove 'www.' prefix if present for checking
  const domainWithoutWww = domain.startsWith('www.') ? domain.substring(4) : domain
  const partsWithoutWww = domainWithoutWww.split('.')
  // Root domain has exactly 2 parts (domain + TLD)
  return partsWithoutWww.length === 2
}

/**
 * Get canonical domain for a given domain
 * For root domains with both www and non-www, returns www version
 * Otherwise returns the domain itself
 */
export function getCanonicalDomain(domain: string, allDomains: Set<string>): string {
  if (isRootDomain(domain)) {
    const domainWithoutWww = domain.startsWith('www.') ? domain.substring(4) : domain
    const wwwVersion = `www.${domainWithoutWww}`
    const nonWwwVersion = domainWithoutWww

    // If we have both www and non-www versions, prefer www
    if (allDomains.has(wwwVersion) && allDomains.has(nonWwwVersion)) {
      return wwwVersion
    }
  }
  return domain
}

/**
 * Normalize domain list to handle www/non-www variants
 * For root domains: combine www and non-www in same server_name
 * For subdomains: keep as configured
 * Returns canonical domain (for SSL certs) and combined server names
 */
function normalizeDomains(domains: string[]): {
  canonical: string
  serverNames: string
} {
  // Use first domain as canonical (for SSL certificates)
  let canonical: string = domains[0]

  // For root domains with both www and non-www, prefer www as canonical
  const domainSet = new Set(domains)
  for (const domain of domains) {
    if (isRootDomain(domain)) {
      const domainWithoutWww = domain.startsWith('www.') ? domain.substring(4) : domain
      const wwwVersion = `www.${domainWithoutWww}`
      const nonWwwVersion = domainWithoutWww

      // If we have both www and non-www versions of a root domain
      if (domainSet.has(wwwVersion) && domainSet.has(nonWwwVersion)) {
        // Prefer www for root domains (for SSL cert path)
        canonical = wwwVersion
        break
      }
    }
  }

  // Combine all domains in server_name
  // For root domains with both www and non-www, ensure www comes first
  const sortedDomains = [...domains]
  if (canonical.startsWith('www.')) {
    const nonWww = canonical.substring(4)
    const wwwIndex = sortedDomains.indexOf(canonical)
    const nonWwwIndex = sortedDomains.indexOf(nonWww)
    if (wwwIndex !== -1 && nonWwwIndex !== -1 && wwwIndex > nonWwwIndex) {
      // Swap to put www first
      ;[sortedDomains[wwwIndex], sortedDomains[nonWwwIndex]] = [
        sortedDomains[nonWwwIndex],
        sortedDomains[wwwIndex],
      ]
    }
  }
  const serverNames = sortedDomains.join(' ')

  return {
    canonical,
    serverNames,
  }
}

/**
 * Generate Nginx server block configuration for a service
 */
export function generateNginxConfig(
  service: ServiceConfig,
  withHttps: boolean,
  portOverride?: number
): string {
  // Normalize domains - combine www and root domains in same server_name
  const { canonical, serverNames } = normalizeDomains(service.domains)

  // Use canonical domain for upstream naming and SSL certificates
  const domainSafe = canonical.replace(/\./g, '_').replace(/[^a-zA-Z0-9_]/g, '_')
  const upstreamName = `${domainSafe}_${service.name}`
  const servicePath = service.path || '/'
  const port = portOverride || service.port

  let config = `# Nginx configuration for ${service.name}\n\n`

  // Upstream configuration
  config += `upstream ${upstreamName} {\n`
  config += `    server localhost:${port} max_fails=3 fail_timeout=30s;\n`
  config += `    keepalive 32;\n`
  config += `}\n\n`

  if (withHttps) {
    // HTTP server - redirect to HTTPS
    config += `server {\n`
    config += `    listen 80;\n`
    config += `    listen [::]:80;\n`
    config += `    server_name ${serverNames};\n\n`
    config += `    # Redirect all HTTP to HTTPS\n`
    config += `    return 301 https://$server_name$request_uri;\n`
    config += `}\n\n`

    // HTTPS server
    config += `server {\n`
    config += `    listen 443 ssl http2;\n`
    config += `    listen [::]:443 ssl http2;\n`
    config += `    server_name ${serverNames};\n\n`

    // SSL configuration
    config += `    # SSL Configuration\n`
    config += `    ssl_certificate /etc/letsencrypt/live/${canonical}/fullchain.pem;\n`
    config += `    ssl_certificate_key /etc/letsencrypt/live/${canonical}/privkey.pem;\n`
    config += `    ssl_protocols TLSv1.2 TLSv1.3;\n`
    config += `    ssl_ciphers HIGH:!aNULL:!MD5;\n`
    config += `    ssl_prefer_server_ciphers on;\n\n`
  } else {
    // HTTP only server
    config += `server {\n`
    config += `    listen 80;\n`
    config += `    listen [::]:80;\n`
    config += `    server_name ${serverNames};\n\n`
  }

  // Logging
  config += `    # Logging\n`
  config += `    access_log /var/log/nginx/${service.name}_access.log;\n`
  config += `    error_log /var/log/nginx/${service.name}_error.log;\n\n`

  // Client settings
  config += `    # Client settings\n`
  config += `    client_max_body_size 100M;\n\n`

  // Proxy settings
  config += `    # Proxy settings\n`
  config += `    location ${servicePath} {\n`
  config += `        proxy_pass http://${upstreamName};\n`
  config += `        proxy_http_version 1.1;\n`
  config += `        proxy_set_header Upgrade $http_upgrade;\n`
  config += `        proxy_set_header Connection 'upgrade';\n`
  config += `        proxy_set_header Host $host;\n`
  config += `        proxy_set_header X-Real-IP $remote_addr;\n`
  config += `        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n`
  config += `        proxy_set_header X-Forwarded-Proto $scheme;\n`
  config += `        proxy_cache_bypass $http_upgrade;\n`
  config += `        proxy_connect_timeout 60s;\n`
  config += `        proxy_send_timeout 60s;\n`
  config += `        proxy_read_timeout 60s;\n`
  config += `    }\n`

  // Health check endpoint (if configured)
  if (service.healthCheck) {
    config += `\n    # Health check endpoint\n`
    config += `    location ${service.healthCheck.path} {\n`
    config += `        proxy_pass http://${upstreamName};\n`
    config += `        access_log off;\n`
    config += `    }\n`
  }

  config += `}\n`

  return config
}

/**
 * Generate Nginx configuration for multiple services on the same domain
 * Groups services by domain and creates location blocks for each service path
 * Combines upstreams when multiple services share the same port
 */
export function generateMultiServiceNginxConfig(
  services: ServiceConfig[],
  domain: string,
  withHttps: boolean,
  portOverrides?: Map<string, number>
): string {
  const upstreams: string[] = []
  const locations: string[] = []
  const healthChecks: string[] = []

  // Collect all domains from services to check for www/non-www variants
  const allServiceDomains = new Set<string>()
  for (const service of services) {
    for (const d of service.domains) {
      allServiceDomains.add(d)
    }
  }

  // Determine canonical domain (for SSL certs) and combined server names
  // For root domains: combine www and non-www in same server_name
  // For subdomains: use as-is
  let canonicalDomain = domain
  let serverNames = domain

  if (isRootDomain(domain)) {
    const domainWithoutWww = domain.startsWith('www.') ? domain.substring(4) : domain
    const wwwVersion = `www.${domainWithoutWww}`
    const nonWwwVersion = domainWithoutWww

    if (allServiceDomains.has(wwwVersion) && allServiceDomains.has(nonWwwVersion)) {
      // Prefer www for root domains (for SSL cert path)
      canonicalDomain = wwwVersion
      // Combine both in server_name (www first)
      serverNames = `${wwwVersion} ${nonWwwVersion}`
    }
  }
  // Subdomains are left as-is

  // Sort services by path length (longest first) to ensure specific paths are matched before general ones
  const sortedServices = [...services].sort((a, b) => {
    const pathA = (a.path || '/').length
    const pathB = (b.path || '/').length
    return pathB - pathA
  })

  // Map port to upstream name - combine services with same port into one upstream
  const portToUpstreamName = new Map<number, string>()
  const domainSafe = canonicalDomain.replace(/\./g, '_').replace(/[^a-zA-Z0-9_]/g, '_')

  // First pass: create upstreams grouped by port
  for (const service of sortedServices) {
    const port = portOverrides?.get(service.name) || service.port

    // If we haven't seen this port before, create a new upstream
    if (!portToUpstreamName.has(port)) {
      // Use domain_port format for upstream name to ensure uniqueness
      // Since ports are unique within a domain, this format ensures no conflicts
      const upstreamName = `${domainSafe}_port_${port}`

      portToUpstreamName.set(port, upstreamName)

      // Generate upstream block
      upstreams.push(`upstream ${upstreamName} {`)
      upstreams.push(`    server localhost:${port} max_fails=3 fail_timeout=30s;`)
      upstreams.push(`    keepalive 32;`)
      upstreams.push(`}`)
    }
  }

  // Second pass: create location blocks for each service, using the shared upstream
  for (const service of sortedServices) {
    const servicePath = service.path || '/'
    const port = portOverrides?.get(service.name) || service.port
    const upstreamName = portToUpstreamName.get(port)!

    // Generate location block
    if (servicePath === '/') {
      // Root path - use exact match or default
      locations.push(`    # Service: ${service.name}`)
      locations.push(`    location / {`)
    } else {
      // Specific path - use prefix match
      locations.push(`    # Service: ${service.name}`)
      locations.push(`    location ${servicePath} {`)
    }

    locations.push(`        proxy_pass http://${upstreamName};`)
    locations.push(`        proxy_http_version 1.1;`)
    locations.push(`        proxy_set_header Upgrade $http_upgrade;`)
    locations.push(`        proxy_set_header Connection 'upgrade';`)
    locations.push(`        proxy_set_header Host $host;`)
    locations.push(`        proxy_set_header X-Real-IP $remote_addr;`)
    locations.push(`        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`)
    locations.push(`        proxy_set_header X-Forwarded-Proto $scheme;`)
    locations.push(`        proxy_cache_bypass $http_upgrade;`)
    locations.push(`        proxy_connect_timeout 60s;`)
    locations.push(`        proxy_send_timeout 60s;`)
    locations.push(`        proxy_read_timeout 60s;`)
    locations.push(`    }`)

    // Health check endpoint
    if (service.healthCheck) {
      healthChecks.push(`    # Health check for ${service.name}`)
      healthChecks.push(`    location ${service.healthCheck.path} {`)
      healthChecks.push(`        proxy_pass http://${upstreamName};`)
      healthChecks.push(`        access_log off;`)
      healthChecks.push(`    }`)
    }
  }

  let config = `# Nginx configuration for ${canonicalDomain}\n`
  config += `# Multiple services on the same domain\n\n`

  // Add upstreams
  config += upstreams.join('\n') + '\n\n'

  if (withHttps) {
    // HTTP server - redirect to HTTPS
    config += `server {\n`
    config += `    listen 80;\n`
    config += `    listen [::]:80;\n`
    config += `    server_name ${serverNames};\n\n`
    config += `    # Redirect all HTTP to HTTPS\n`
    config += `    return 301 https://$server_name$request_uri;\n`
    config += `}\n\n`

    // HTTPS server
    config += `server {\n`
    config += `    listen 443 ssl http2;\n`
    config += `    listen [::]:443 ssl http2;\n`
    config += `    server_name ${serverNames};\n\n`

    // SSL configuration
    config += `    # SSL Configuration\n`
    config += `    ssl_certificate /etc/letsencrypt/live/${canonicalDomain}/fullchain.pem;\n`
    config += `    ssl_certificate_key /etc/letsencrypt/live/${canonicalDomain}/privkey.pem;\n`
    config += `    ssl_protocols TLSv1.2 TLSv1.3;\n`
    config += `    ssl_ciphers HIGH:!aNULL:!MD5;\n`
    config += `    ssl_prefer_server_ciphers on;\n\n`
  } else {
    // HTTP only server
    config += `server {\n`
    config += `    listen 80;\n`
    config += `    listen [::]:80;\n`
    config += `    server_name ${serverNames};\n\n`
  }

  // Logging
  config += `    # Logging\n`
  config += `    access_log /var/log/nginx/${canonicalDomain}_access.log;\n`
  config += `    error_log /var/log/nginx/${canonicalDomain}_error.log;\n\n`

  // Client settings
  config += `    # Client settings\n`
  config += `    client_max_body_size 100M;\n\n`

  // Location blocks
  config += `    # Service locations\n`
  config += locations.join('\n') + '\n\n'

  // Health check endpoints
  if (healthChecks.length > 0) {
    config += `    # Health check endpoints\n`
    config += healthChecks.join('\n') + '\n'
  }

  config += `}\n`

  return config
}

/**
 * Check if an Nginx config file exists
 */
export async function configExists(configName: string, configPath: string): Promise<boolean> {
  const configFilePath = path.join(configPath, `${configName}.conf`)
  return await fs.pathExists(configFilePath)
}

/**
 * Write Nginx configuration file, deleting existing file if it exists and creating new one
 */
export async function writeNginxConfig(
  configName: string,
  configPath: string,
  configContent: string
): Promise<boolean> {
  const configFilePath = path.join(configPath, `${configName}.conf`)
  const exists = await fs.pathExists(configFilePath)

  // If config file exists, delete it first
  if (exists) {
    await fs.remove(configFilePath)
  }

  // Create new config file
  await fs.writeFile(configFilePath, configContent)

  return exists // Return true if file existed (was deleted and recreated)
}

/**
 * Enable an Nginx site by creating a symbolic link
 */
export async function enableSite(siteName: string, configPath: string): Promise<void> {
  const availablePath = path.join(configPath, `${siteName}.conf`)
  const enabledPath = availablePath.replace('sites-available', 'sites-enabled')

  // Create sites-enabled directory if it doesn't exist
  await fs.ensureDir(path.dirname(enabledPath))

  // Remove existing symlink if present
  if (await fs.pathExists(enabledPath)) {
    await fs.remove(enabledPath)
  }

  // Create symlink
  await execa('sudo', ['ln', '-sf', availablePath, enabledPath])
}

/**
 * Test and reload Nginx configuration
 */
export async function reloadNginx(reloadCommand: string): Promise<void> {
  try {
    // Test configuration first
    await execa('sudo', ['nginx', '-t'])

    // Reload Nginx
    const parts = reloadCommand.split(' ')
    if (parts.length > 0) {
      // Simple execution of provided command
      await execa(parts[0], parts.slice(1), { shell: true })
    }
  } catch (error) {
    throw new Error(`Failed to reload Nginx: ${error instanceof Error ? error.message : error}`)
  }
}

/**
 * Disable an Nginx site
 */
export async function disableSite(siteName: string, configPath: string): Promise<void> {
  const enabledPath = path.join(
    configPath.replace('sites-available', 'sites-enabled'),
    `${siteName}.conf`
  )

  if (await fs.pathExists(enabledPath)) {
    await fs.remove(enabledPath)
  }
}
