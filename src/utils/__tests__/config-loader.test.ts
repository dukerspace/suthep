import { describe, it, expect, beforeEach, vi } from 'vitest'
import fs from 'fs-extra'
import yaml from 'js-yaml'
import { loadConfig, saveConfig } from '../config-loader'
import type { DeployConfig } from '../../types/config'

// Mock fs-extra
vi.mock('fs-extra', () => ({
  default: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    pathExists: vi.fn(),
  },
}))

// Mock js-yaml
vi.mock('js-yaml', () => ({
  default: {
    load: vi.fn(),
    dump: vi.fn(),
  },
}))

describe('config-loader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('loadConfig', () => {
    it('should load and parse a valid config file', async () => {
      const mockConfig: DeployConfig = {
        project: {
          name: 'test-project',
          version: '1.0.0',
        },
        services: [
          {
            name: 'api',
            port: 3000,
            domains: ['api.example.com'],
          },
        ],
        nginx: {
          configPath: '/etc/nginx/sites-available',
          reloadCommand: 'sudo nginx -t && sudo systemctl reload nginx',
        },
        certbot: {
          email: 'admin@example.com',
          staging: false,
        },
        deployment: {
          strategy: 'rolling',
          healthCheckTimeout: 30000,
        },
      }

      vi.mocked(fs.readFile).mockResolvedValue('mock yaml content' as any)
      vi.mocked(yaml.load).mockReturnValue(mockConfig)

      const result = await loadConfig('suthep.yml')

      expect(fs.readFile).toHaveBeenCalledWith('suthep.yml', 'utf8')
      expect(yaml.load).toHaveBeenCalledWith('mock yaml content')
      expect(result).toEqual(mockConfig)
    })

    it('should throw error if config file cannot be read', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'))

      await expect(loadConfig('nonexistent.yml')).rejects.toThrow(
        'Failed to load configuration from nonexistent.yml: File not found'
      )
    })

    it('should throw error if project name is missing', async () => {
      const invalidConfig = {
        services: [
          {
            name: 'api',
            port: 3000,
            domains: ['api.example.com'],
          },
        ],
      }

      vi.mocked(fs.readFile).mockResolvedValue('mock yaml content' as any)
      vi.mocked(yaml.load).mockReturnValue(invalidConfig)

      await expect(loadConfig('suthep.yml')).rejects.toThrow(
        'Configuration must include project.name'
      )
    })

    it('should throw error if services array is missing', async () => {
      const invalidConfig = {
        project: {
          name: 'test-project',
          version: '1.0.0',
        },
      }

      vi.mocked(fs.readFile).mockResolvedValue('mock yaml content' as any)
      vi.mocked(yaml.load).mockReturnValue(invalidConfig)

      await expect(loadConfig('suthep.yml')).rejects.toThrow(
        'Configuration must include at least one service'
      )
    })

    it('should throw error if service name is missing', async () => {
      const invalidConfig = {
        project: {
          name: 'test-project',
          version: '1.0.0',
        },
        services: [
          {
            port: 3000,
            domains: ['api.example.com'],
          },
        ],
      }

      vi.mocked(fs.readFile).mockResolvedValue('mock yaml content' as any)
      vi.mocked(yaml.load).mockReturnValue(invalidConfig)

      await expect(loadConfig('suthep.yml')).rejects.toThrow('Each service must have a name')
    })

    it('should throw error if service port is missing', async () => {
      const invalidConfig = {
        project: {
          name: 'test-project',
          version: '1.0.0',
        },
        services: [
          {
            name: 'api',
            domains: ['api.example.com'],
          },
        ],
      }

      vi.mocked(fs.readFile).mockResolvedValue('mock yaml content' as any)
      vi.mocked(yaml.load).mockReturnValue(invalidConfig)

      await expect(loadConfig('suthep.yml')).rejects.toThrow('Service api must have a port')
    })

    it('should throw error if service domains are missing', async () => {
      const invalidConfig = {
        project: {
          name: 'test-project',
          version: '1.0.0',
        },
        services: [
          {
            name: 'api',
            port: 3000,
          },
        ],
      }

      vi.mocked(fs.readFile).mockResolvedValue('mock yaml content' as any)
      vi.mocked(yaml.load).mockReturnValue(invalidConfig)

      await expect(loadConfig('suthep.yml')).rejects.toThrow(
        'Service api must have at least one domain'
      )
    })

    it('should throw error if port conflict exists', async () => {
      const invalidConfig = {
        project: {
          name: 'test-project',
          version: '1.0.0',
        },
        services: [
          {
            name: 'api',
            port: 3000,
            domains: ['api.example.com'],
          },
          {
            name: 'web',
            port: 3000,
            domains: ['web.example.com'],
          },
        ],
      }

      vi.mocked(fs.readFile).mockResolvedValue('mock yaml content' as any)
      vi.mocked(yaml.load).mockReturnValue(invalidConfig)

      await expect(loadConfig('suthep.yml')).rejects.toThrow(
        'Port conflict: Service "web" uses port 3000'
      )
    })

    it('should throw error if duplicate service names exist', async () => {
      const invalidConfig = {
        project: {
          name: 'test-project',
          version: '1.0.0',
        },
        services: [
          {
            name: 'api',
            port: 3000,
            domains: ['api.example.com'],
          },
          {
            name: 'api',
            port: 3001,
            domains: ['api2.example.com'],
          },
        ],
      }

      vi.mocked(fs.readFile).mockResolvedValue('mock yaml content' as any)
      vi.mocked(yaml.load).mockReturnValue(invalidConfig)

      await expect(loadConfig('suthep.yml')).rejects.toThrow(
        'Duplicate service name: "api" is used multiple times'
      )
    })

    it('should throw error if Docker container name conflict exists', async () => {
      const invalidConfig = {
        project: {
          name: 'test-project',
          version: '1.0.0',
        },
        services: [
          {
            name: 'api',
            port: 3000,
            domains: ['api.example.com'],
            docker: {
              container: 'my-container',
              port: 80,
            },
          },
          {
            name: 'web',
            port: 3001,
            domains: ['web.example.com'],
            docker: {
              container: 'my-container',
              port: 80,
            },
          },
        ],
      }

      vi.mocked(fs.readFile).mockResolvedValue('mock yaml content' as any)
      vi.mocked(yaml.load).mockReturnValue(invalidConfig)

      await expect(loadConfig('suthep.yml')).rejects.toThrow(
        'Docker container name conflict'
      )
    })

    it('should set default nginx config if missing', async () => {
      const configWithoutNginx = {
        project: {
          name: 'test-project',
          version: '1.0.0',
        },
        services: [
          {
            name: 'api',
            port: 3000,
            domains: ['api.example.com'],
          },
        ],
      }

      vi.mocked(fs.readFile).mockResolvedValue('mock yaml content' as any)
      vi.mocked(yaml.load).mockReturnValue(configWithoutNginx)

      const result = await loadConfig('suthep.yml')

      expect(result.nginx).toEqual({
        configPath: '/etc/nginx/sites-available',
        reloadCommand: 'sudo nginx -t && sudo systemctl reload nginx',
      })
    })

    it('should set default certbot config if missing', async () => {
      const configWithoutCertbot = {
        project: {
          name: 'test-project',
          version: '1.0.0',
        },
        services: [
          {
            name: 'api',
            port: 3000,
            domains: ['api.example.com'],
          },
        ],
      }

      vi.mocked(fs.readFile).mockResolvedValue('mock yaml content' as any)
      vi.mocked(yaml.load).mockReturnValue(configWithoutCertbot)

      const result = await loadConfig('suthep.yml')

      expect(result.certbot).toEqual({
        email: '',
        staging: false,
      })
    })

    it('should set default deployment config if missing', async () => {
      const configWithoutDeployment = {
        project: {
          name: 'test-project',
          version: '1.0.0',
        },
        services: [
          {
            name: 'api',
            port: 3000,
            domains: ['api.example.com'],
          },
        ],
      }

      vi.mocked(fs.readFile).mockResolvedValue('mock yaml content' as any)
      vi.mocked(yaml.load).mockReturnValue(configWithoutDeployment)

      const result = await loadConfig('suthep.yml')

      expect(result.deployment).toEqual({
        strategy: 'rolling',
        healthCheckTimeout: 30000,
      })
    })
  })

  describe('saveConfig', () => {
    it('should save config to YAML file', async () => {
      const config: DeployConfig = {
        project: {
          name: 'test-project',
          version: '1.0.0',
        },
        services: [
          {
            name: 'api',
            port: 3000,
            domains: ['api.example.com'],
          },
        ],
        nginx: {
          configPath: '/etc/nginx/sites-available',
          reloadCommand: 'sudo nginx -t && sudo systemctl reload nginx',
        },
        certbot: {
          email: 'admin@example.com',
          staging: false,
        },
        deployment: {
          strategy: 'rolling',
          healthCheckTimeout: 30000,
        },
      }

      const mockYamlContent = 'project:\n  name: test-project\n'
      vi.mocked(yaml.dump).mockReturnValue(mockYamlContent)
      vi.mocked(fs.writeFile).mockResolvedValue(undefined as any)

      await saveConfig('suthep.yml', config)

      expect(yaml.dump).toHaveBeenCalledWith(config, {
        indent: 2,
        lineWidth: 120,
        noRefs: true,
      })
      expect(fs.writeFile).toHaveBeenCalledWith('suthep.yml', mockYamlContent, 'utf8')
    })

    it('should throw error if file write fails', async () => {
      const config: DeployConfig = {
        project: {
          name: 'test-project',
          version: '1.0.0',
        },
        services: [
          {
            name: 'api',
            port: 3000,
            domains: ['api.example.com'],
          },
        ],
        nginx: {
          configPath: '/etc/nginx/sites-available',
          reloadCommand: 'sudo nginx -t && sudo systemctl reload nginx',
        },
        certbot: {
          email: 'admin@example.com',
          staging: false,
        },
        deployment: {
          strategy: 'rolling',
          healthCheckTimeout: 30000,
        },
      }

      vi.mocked(yaml.dump).mockReturnValue('mock yaml')
      vi.mocked(fs.writeFile).mockRejectedValue(new Error('Permission denied'))

      await expect(saveConfig('suthep.yml', config)).rejects.toThrow('Permission denied')
    })
  })
})

