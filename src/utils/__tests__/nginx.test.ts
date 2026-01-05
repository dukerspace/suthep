import { execa } from 'execa'
import fs from 'fs-extra'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ServiceConfig } from '../../types/config'
import {
  configExists,
  disableSite,
  enableSite,
  generateMultiServiceNginxConfig,
  generateNginxConfig,
  reloadNginx,
  writeNginxConfig,
} from '../nginx'

// Mock fs-extra
vi.mock('fs-extra', () => ({
  default: {
    pathExists: vi.fn(),
    remove: vi.fn(),
    writeFile: vi.fn(),
    ensureDir: vi.fn(),
  },
}))

// Mock execa
vi.mock('execa', () => ({
  execa: vi.fn(),
}))

describe('nginx', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateNginxConfig', () => {
    it('should generate HTTP-only config for service', () => {
      const service: ServiceConfig = {
        name: 'api',
        port: 3000,
        domains: ['api.example.com'],
      }

      const config = generateNginxConfig(service, false)

      expect(config).toContain('server_name api.example.com')
      expect(config).toContain('listen 80')
      expect(config).toContain('server localhost:3000')
      expect(config).not.toContain('listen 443')
      expect(config).not.toContain('ssl_certificate')
    })

    it('should generate HTTPS config with redirect for service', () => {
      const service: ServiceConfig = {
        name: 'api',
        port: 3000,
        domains: ['api.example.com'],
      }

      const config = generateNginxConfig(service, true)

      expect(config).toContain('listen 443 ssl http2')
      expect(config).toContain('ssl_certificate')
      expect(config).toContain('/etc/letsencrypt/live/api.example.com/fullchain.pem')
      expect(config).toContain('return 301 https://$server_name$request_uri')
    })

    it('should combine www and root domain in same server_name', () => {
      const service: ServiceConfig = {
        name: 'web',
        port: 3000,
        domains: ['muacle.com', 'www.muacle.com'],
      }

      const config = generateNginxConfig(service, false)

      // Should combine both www and non-www in same server_name
      expect(config).toContain('server_name www.muacle.com muacle.com')
      expect(config).not.toContain('return 301')
    })

    it('should not redirect subdomains', () => {
      const service: ServiceConfig = {
        name: 'api',
        port: 3000,
        domains: ['dev.muacle.com'],
      }

      const config = generateNginxConfig(service, false)

      // Subdomains should not have redirect logic
      expect(config).toContain('server_name dev.muacle.com')
      expect(config).not.toContain('return 301')
    })

    it('should include health check location if configured', () => {
      const service: ServiceConfig = {
        name: 'api',
        port: 3000,
        domains: ['api.example.com'],
        healthCheck: {
          path: '/health',
          interval: 30,
        },
      }

      const config = generateNginxConfig(service, false)

      expect(config).toContain('location /health')
      expect(config).toContain('access_log off')
    })

    it('should use custom path if specified', () => {
      const service: ServiceConfig = {
        name: 'api',
        port: 3000,
        domains: ['api.example.com'],
        path: '/api',
      }

      const config = generateNginxConfig(service, false)

      expect(config).toContain('location /api')
    })

    it('should use port override if provided', () => {
      const service: ServiceConfig = {
        name: 'api',
        port: 3000,
        domains: ['api.example.com'],
      }

      const config = generateNginxConfig(service, false, 4000)

      expect(config).toContain('server localhost:4000')
    })

    it('should generate unique upstream names for domains with special characters', () => {
      const service: ServiceConfig = {
        name: 'api',
        port: 3000,
        domains: ['api-test.example.com'],
      }

      const config = generateNginxConfig(service, false)

      expect(config).toMatch(/upstream [a-zA-Z0-9_]+_api/)
      expect(config).toContain('proxy_pass http://')
    })
  })

  describe('generateMultiServiceNginxConfig', () => {
    it('should generate config for multiple services on same domain', () => {
      const services: ServiceConfig[] = [
        {
          name: 'api',
          port: 3000,
          domains: ['example.com'],
          path: '/api',
        },
        {
          name: 'web',
          port: 8080,
          domains: ['example.com'],
          path: '/',
        },
      ]

      const config = generateMultiServiceNginxConfig(services, 'example.com', false)

      expect(config).toContain('server_name example.com')
      expect(config).toContain('location /api')
      expect(config).toContain('location /')
      expect(config).toContain('server localhost:3000')
      expect(config).toContain('server localhost:8080')
    })

    it('should sort services by path length (longest first)', () => {
      const services: ServiceConfig[] = [
        {
          name: 'root',
          port: 8080,
          domains: ['example.com'],
          path: '/',
        },
        {
          name: 'api',
          port: 3000,
          domains: ['example.com'],
          path: '/api/v1',
        },
        {
          name: 'v2',
          port: 3001,
          domains: ['example.com'],
          path: '/api',
        },
      ]

      const config = generateMultiServiceNginxConfig(services, 'example.com', false)

      // Find the order of location blocks by checking which service comment appears first
      const apiV1ServiceIndex = config.indexOf('# Service: api')
      const apiServiceIndex = config.indexOf('# Service: v2')
      const rootServiceIndex = config.indexOf('# Service: root')

      // /api/v1 (api service) should come before /api (v2 service), which should come before / (root service)
      // The path /api/v1 (length 7) should come before /api (length 5), which should come before / (length 1)
      expect(apiV1ServiceIndex).toBeGreaterThan(-1)
      expect(apiServiceIndex).toBeGreaterThan(-1)
      expect(rootServiceIndex).toBeGreaterThan(-1)
      expect(apiV1ServiceIndex).toBeLessThan(apiServiceIndex)
      expect(apiServiceIndex).toBeLessThan(rootServiceIndex)
    })

    it('should generate HTTPS config for multiple services', () => {
      const services: ServiceConfig[] = [
        {
          name: 'api',
          port: 3000,
          domains: ['example.com'],
          path: '/api',
        },
      ]

      const config = generateMultiServiceNginxConfig(services, 'example.com', true)

      expect(config).toContain('listen 443 ssl http2')
      expect(config).toContain('ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem')
      expect(config).toContain('return 301 https://$server_name$request_uri')
    })

    it('should include health checks for services that have them', () => {
      const services: ServiceConfig[] = [
        {
          name: 'api',
          port: 3000,
          domains: ['example.com'],
          path: '/api',
          healthCheck: {
            path: '/health',
            interval: 30,
          },
        },
        {
          name: 'web',
          port: 8080,
          domains: ['example.com'],
          path: '/',
        },
      ]

      const config = generateMultiServiceNginxConfig(services, 'example.com', false)

      expect(config).toContain('location /health')
      expect(config).toContain('# Health check for api')
    })

    it('should use port overrides if provided', () => {
      const services: ServiceConfig[] = [
        {
          name: 'api',
          port: 3000,
          domains: ['example.com'],
          path: '/api',
        },
      ]

      const portOverrides = new Map([['api', 4000]])

      const config = generateMultiServiceNginxConfig(services, 'example.com', false, portOverrides)

      expect(config).toContain('server localhost:4000')
    })
  })

  describe('configExists', () => {
    it('should return true if config file exists', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true as any)

      const result = await configExists('example.com', '/etc/nginx/sites-available')

      expect(fs.pathExists).toHaveBeenCalledWith('/etc/nginx/sites-available/example.com.conf')
      expect(result).toBe(true)
    })

    it('should return false if config file does not exist', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(false as any)

      const result = await configExists('example.com', '/etc/nginx/sites-available')

      expect(result).toBe(false)
    })
  })

  describe('writeNginxConfig', () => {
    it('should write config file if it does not exist', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(false as any)
      vi.mocked(fs.writeFile).mockResolvedValue(undefined as any)

      const result = await writeNginxConfig(
        'example.com',
        '/etc/nginx/sites-available',
        'server { ... }'
      )

      expect(fs.remove).not.toHaveBeenCalled()
      expect(fs.writeFile).toHaveBeenCalledWith(
        '/etc/nginx/sites-available/example.com.conf',
        'server { ... }'
      )
      expect(result).toBe(false)
    })

    it('should delete existing config file before writing new one', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true as any)
      vi.mocked(fs.remove).mockResolvedValue(undefined as any)
      vi.mocked(fs.writeFile).mockResolvedValue(undefined as any)

      const result = await writeNginxConfig(
        'example.com',
        '/etc/nginx/sites-available',
        'server { ... }'
      )

      expect(fs.remove).toHaveBeenCalledWith('/etc/nginx/sites-available/example.com.conf')
      expect(fs.writeFile).toHaveBeenCalledWith(
        '/etc/nginx/sites-available/example.com.conf',
        'server { ... }'
      )
      expect(result).toBe(true)
    })
  })

  describe('enableSite', () => {
    it('should create symlink to enable site', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(false as any)
      vi.mocked(fs.ensureDir).mockResolvedValue(undefined as any)
      vi.mocked(execa).mockResolvedValue({ stdout: '', stderr: '' } as any)

      await enableSite('example.com', '/etc/nginx/sites-available')

      expect(fs.ensureDir).toHaveBeenCalled()
      expect(execa).toHaveBeenCalledWith('sudo', [
        'ln',
        '-sf',
        '/etc/nginx/sites-available/example.com.conf',
        '/etc/nginx/sites-enabled/example.com.conf',
      ])
    })

    it('should remove existing symlink before creating new one', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true as any)
      vi.mocked(fs.remove).mockResolvedValue(undefined as any)
      vi.mocked(fs.ensureDir).mockResolvedValue(undefined as any)
      vi.mocked(execa).mockResolvedValue({ stdout: '', stderr: '' } as any)

      await enableSite('example.com', '/etc/nginx/sites-available')

      expect(fs.remove).toHaveBeenCalledWith('/etc/nginx/sites-enabled/example.com.conf')
    })
  })

  describe('disableSite', () => {
    it('should remove symlink if it exists', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true as any)
      vi.mocked(fs.remove).mockResolvedValue(undefined as any)

      await disableSite('example.com', '/etc/nginx/sites-available')

      expect(fs.remove).toHaveBeenCalledWith('/etc/nginx/sites-enabled/example.com.conf')
    })

    it('should not throw error if symlink does not exist', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(false as any)

      await expect(disableSite('example.com', '/etc/nginx/sites-available')).resolves.not.toThrow()
    })
  })

  describe('reloadNginx', () => {
    it('should test and reload nginx configuration', async () => {
      vi.mocked(execa)
        .mockResolvedValueOnce({ stdout: '', stderr: '' } as any) // nginx -t
        .mockResolvedValueOnce({ stdout: '', stderr: '' } as any) // reload command

      await reloadNginx('sudo systemctl reload nginx')

      expect(execa).toHaveBeenCalledWith('sudo', ['nginx', '-t'])
      expect(execa).toHaveBeenCalledWith('sudo', ['systemctl', 'reload', 'nginx'], {
        shell: true,
      })
    })

    it('should throw error if nginx test fails', async () => {
      vi.mocked(execa).mockRejectedValue(new Error('Configuration test failed'))

      await expect(reloadNginx('sudo systemctl reload nginx')).rejects.toThrow(
        'Failed to reload Nginx'
      )
    })

    it('should throw error if reload command fails', async () => {
      vi.mocked(execa)
        .mockResolvedValueOnce({ stdout: '', stderr: '' } as any) // nginx -t
        .mockRejectedValueOnce(new Error('Reload failed'))

      await expect(reloadNginx('sudo systemctl reload nginx')).rejects.toThrow(
        'Failed to reload Nginx'
      )
    })
  })
})
