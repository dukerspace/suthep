import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  performHealthCheck,
  deployService,
  waitForService,
} from '../deployment'
import type { ServiceConfig, DeploymentConfig } from '../../types/config'
import type { ZeroDowntimeContainerInfo } from '../docker'

// Mock global fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('deployment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('performHealthCheck', () => {
    it('should return true if health check succeeds', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
      } as Response)

      const result = await performHealthCheck('http://localhost:3000/health', 1000)

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/health', {
        method: 'GET',
        signal: expect.any(AbortSignal),
      })
      expect(result).toBe(true)
    })

    it('should return false if health check fails with non-ok status', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      } as Response)

      const result = await performHealthCheck('http://localhost:3000/health', 1000)

      expect(result).toBe(false)
    })

    it('should retry on network errors until timeout', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const result = await performHealthCheck('http://localhost:3000/health', 3000)

      expect(result).toBe(false)
      expect(mockFetch).toHaveBeenCalled() // Should have made multiple attempts
    })
  })

  describe('deployService', () => {
    it('should use rolling deployment strategy', async () => {
      const service: ServiceConfig = {
        name: 'api',
        port: 3000,
        domains: ['api.example.com'],
        healthCheck: {
          path: '/health',
          interval: 30,
        },
      }

      const deploymentConfig: DeploymentConfig = {
        strategy: 'rolling',
        healthCheckTimeout: 30000,
      }

      const tempInfo: ZeroDowntimeContainerInfo = {
        tempContainerName: 'api-new',
        tempPort: 13000,
        oldContainerExists: true,
      }

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
      } as Response)

      await deployService(service, deploymentConfig, tempInfo)

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:13000/health', expect.any(Object))
    })

    it('should use blue-green deployment strategy', async () => {
      const service: ServiceConfig = {
        name: 'api',
        port: 3000,
        domains: ['api.example.com'],
        healthCheck: {
          path: '/health',
          interval: 30,
        },
      }

      const deploymentConfig: DeploymentConfig = {
        strategy: 'blue-green',
        healthCheckTimeout: 30000,
      }

      const tempInfo: ZeroDowntimeContainerInfo = {
        tempContainerName: 'api-new',
        tempPort: 13000,
        oldContainerExists: true,
      }

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
      } as Response)

      await deployService(service, deploymentConfig, tempInfo)

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:13000/health', expect.any(Object))
    })

    it('should throw error for unknown deployment strategy', async () => {
      const service: ServiceConfig = {
        name: 'api',
        port: 3000,
        domains: ['api.example.com'],
      }

      const deploymentConfig = {
        strategy: 'unknown' as any,
        healthCheckTimeout: 30000,
      }

      await expect(deployService(service, deploymentConfig)).rejects.toThrow(
        'Unknown deployment strategy: unknown'
      )
    })

    it('should skip health check if no health check configured', async () => {
      const service: ServiceConfig = {
        name: 'api',
        port: 3000,
        domains: ['api.example.com'],
      }

      const deploymentConfig: DeploymentConfig = {
        strategy: 'rolling',
        healthCheckTimeout: 30000,
      }

      await deployService(service, deploymentConfig, null)

      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should throw error if health check fails during rolling deployment', async () => {
      const service: ServiceConfig = {
        name: 'api',
        port: 3000,
        domains: ['api.example.com'],
        healthCheck: {
          path: '/health',
          interval: 30,
        },
      }

      const deploymentConfig: DeploymentConfig = {
        strategy: 'rolling',
        healthCheckTimeout: 1000, // Shorter timeout for test
      }

      const tempInfo: ZeroDowntimeContainerInfo = {
        tempContainerName: 'api-new',
        tempPort: 13000,
        oldContainerExists: true,
      }

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      } as Response)

      await expect(deployService(service, deploymentConfig, tempInfo)).rejects.toThrow(
        'Service api failed health check on temporary container during rolling deployment'
      )
    }, 10000) // Increase test timeout
  })

  describe('waitForService', () => {
    it('should wait for service with health check', async () => {
      const service: ServiceConfig = {
        name: 'api',
        port: 3000,
        domains: ['api.example.com'],
        healthCheck: {
          path: '/health',
          interval: 30,
        },
      }

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
      } as Response)

      const result = await waitForService(service, 5000)

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/health', expect.any(Object))
      expect(result).toBe(true)
    })

    it('should return true after delay if no health check configured', async () => {
      const service: ServiceConfig = {
        name: 'api',
        port: 3000,
        domains: ['api.example.com'],
      }

      const result = await waitForService(service, 5000)

      expect(mockFetch).not.toHaveBeenCalled()
      expect(result).toBe(true)
    }, 10000) // Increase test timeout to account for 5 second delay

    it('should return false if health check times out', async () => {
      const service: ServiceConfig = {
        name: 'api',
        port: 3000,
        domains: ['api.example.com'],
        healthCheck: {
          path: '/health',
          interval: 30,
        },
      }

      mockFetch.mockRejectedValue(new Error('Network error'))

      const result = await waitForService(service, 1000)

      expect(result).toBe(false)
    })
  })
})

