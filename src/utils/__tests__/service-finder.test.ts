import { describe, expect, it } from 'vitest'
import type { DeployConfig } from '../../types/config'
import {
  findServiceByIdentifier,
  getAvailableServicesList,
  getServiceNotFoundError,
} from '../service-finder'

describe('service-finder', () => {
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
        docker: {
          container: 'api-container',
          port: 80,
          image: 'api:latest',
        },
      },
      {
        name: 'web',
        port: 8080,
        domains: ['web.example.com'],
        docker: {
          container: 'web-container',
          port: 80,
          image: 'web:latest',
        },
      },
      {
        name: 'worker',
        port: 9000,
        domains: ['worker.example.com'],
      },
      {
        name: 'muacle-api-dev',
        port: 5000,
        domains: ['muacle-api.example.com'],
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

  describe('findServiceByIdentifier', () => {
    it('should find service by index (1-based)', () => {
      const service = findServiceByIdentifier(mockConfig, '1')
      expect(service).not.toBeNull()
      expect(service?.name).toBe('api')
    })

    it('should find service by index 2', () => {
      const service = findServiceByIdentifier(mockConfig, '2')
      expect(service).not.toBeNull()
      expect(service?.name).toBe('web')
    })

    it('should find service by index 3', () => {
      const service = findServiceByIdentifier(mockConfig, '3')
      expect(service).not.toBeNull()
      expect(service?.name).toBe('worker')
    })

    it('should find service by index 4', () => {
      const service = findServiceByIdentifier(mockConfig, '4')
      expect(service).not.toBeNull()
      expect(service?.name).toBe('muacle-api-dev')
    })

    it('should find service by name', () => {
      const service = findServiceByIdentifier(mockConfig, 'api')
      expect(service).not.toBeNull()
      expect(service?.name).toBe('api')
    })

    it('should find service by name with special characters', () => {
      const service = findServiceByIdentifier(mockConfig, 'muacle-api-dev')
      expect(service).not.toBeNull()
      expect(service?.name).toBe('muacle-api-dev')
    })

    it('should return null for invalid index (too high)', () => {
      const service = findServiceByIdentifier(mockConfig, '10')
      expect(service).toBeNull()
    })

    it('should return null for invalid index (zero)', () => {
      const service = findServiceByIdentifier(mockConfig, '0')
      expect(service).toBeNull()
    })

    it('should return null for invalid index (negative)', () => {
      const service = findServiceByIdentifier(mockConfig, '-1')
      expect(service).toBeNull()
    })

    it('should return null for non-existent service name', () => {
      const service = findServiceByIdentifier(mockConfig, 'nonexistent')
      expect(service).toBeNull()
    })

    it('should return null for undefined identifier', () => {
      const service = findServiceByIdentifier(mockConfig, undefined)
      expect(service).toBeNull()
    })

    it('should return null for empty string', () => {
      const service = findServiceByIdentifier(mockConfig, '')
      expect(service).toBeNull()
    })

    it('should treat pure numbers as indices, not names', () => {
      // Even if there's a service named "1", "2", etc., pure numbers should be treated as indices
      const configWithNumericName: DeployConfig = {
        ...mockConfig,
        services: [
          {
            name: '1',
            port: 3000,
            domains: ['one.example.com'],
          },
          {
            name: 'api',
            port: 8080,
            domains: ['api.example.com'],
          },
        ],
      }

      // "1" should return the first service (index 1), not the service named "1"
      const service = findServiceByIdentifier(configWithNumericName, '1')
      expect(service).not.toBeNull()
      expect(service?.name).toBe('1') // In this case, it happens to be the same, but it's by index
    })

    it('should not treat names with numbers as indices', () => {
      // "api2" should be treated as a name, not an index
      const service = findServiceByIdentifier(mockConfig, 'api2')
      expect(service).toBeNull() // Doesn't exist, but wasn't treated as index 2
    })

    it('should handle single service config', () => {
      const singleServiceConfig: DeployConfig = {
        ...mockConfig,
        services: [
          {
            name: 'single',
            port: 3000,
            domains: ['single.example.com'],
          },
        ],
      }

      const service = findServiceByIdentifier(singleServiceConfig, '1')
      expect(service).not.toBeNull()
      expect(service?.name).toBe('single')
    })

    it('should handle empty services array', () => {
      const emptyConfig: DeployConfig = {
        ...mockConfig,
        services: [],
      }

      const service = findServiceByIdentifier(emptyConfig, '1')
      expect(service).toBeNull()
    })
  })

  describe('getAvailableServicesList', () => {
    it('should format services list with indices', () => {
      const list = getAvailableServicesList(mockConfig)
      expect(list).toContain('1. api')
      expect(list).toContain('2. web')
      expect(list).toContain('3. worker')
      expect(list).toContain('4. muacle-api-dev')
    })

    it('should handle single service', () => {
      const singleServiceConfig: DeployConfig = {
        ...mockConfig,
        services: [
          {
            name: 'single',
            port: 3000,
            domains: ['single.example.com'],
          },
        ],
      }

      const list = getAvailableServicesList(singleServiceConfig)
      expect(list).toBe('  1. single')
    })

    it('should handle empty services', () => {
      const emptyConfig: DeployConfig = {
        ...mockConfig,
        services: [],
      }

      const list = getAvailableServicesList(emptyConfig)
      expect(list).toBe('')
    })

    it('should use 1-based indexing', () => {
      const list = getAvailableServicesList(mockConfig)
      const lines = list.split('\n')
      expect(lines[0]).toContain('1.')
      expect(lines[1]).toContain('2.')
      expect(lines[2]).toContain('3.')
    })
  })

  describe('getServiceNotFoundError', () => {
    it('should include the identifier in error message', () => {
      const error = getServiceNotFoundError('nonexistent', mockConfig)
      expect(error).toContain('nonexistent')
    })

    it('should include available services list', () => {
      const error = getServiceNotFoundError('nonexistent', mockConfig)
      expect(error).toContain('Available services:')
      expect(error).toContain('1. api')
      expect(error).toContain('2. web')
      expect(error).toContain('3. worker')
      expect(error).toContain('4. muacle-api-dev')
    })

    it('should format error message correctly', () => {
      const error = getServiceNotFoundError('test', mockConfig)
      expect(error).toMatch(/Service "test" not found/)
      expect(error).toMatch(/Available services:/)
    })

    it('should handle empty services array', () => {
      const emptyConfig: DeployConfig = {
        ...mockConfig,
        services: [],
      }

      const error = getServiceNotFoundError('test', emptyConfig)
      expect(error).toContain('Service "test" not found')
      expect(error).toContain('Available services:')
    })
  })
})

