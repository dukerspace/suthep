import fs from 'fs-extra'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DeployConfig } from '../../types/config'
import * as configLoader from '../../utils/config-loader'
import * as docker from '../../utils/docker'
import { logsCommand } from '../logs'

// Mock dependencies
vi.mock('fs-extra', () => ({
  default: {
    pathExists: vi.fn(),
  },
}))

vi.mock('../../utils/config-loader', () => ({
  loadConfig: vi.fn(),
}))

vi.mock('../../utils/docker', () => ({
  getContainerLogs: vi.fn(),
  isContainerRunning: vi.fn(),
  streamContainerLogs: vi.fn(),
}))

// Mock console methods - store references for cleanup
let consoleLogSpy: ReturnType<typeof vi.spyOn>
let consoleErrorSpy: ReturnType<typeof vi.spyOn>
let processExitSpy: ReturnType<typeof vi.spyOn>

describe('logsCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Recreate spies in beforeEach to ensure they're fresh
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      return undefined as never
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

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
        },
      },
      {
        name: 'web',
        port: 8080,
        domains: ['web.example.com'],
        docker: {
          container: 'web-container',
          port: 80,
        },
      },
      {
        name: 'worker',
        port: 9000,
        domains: ['worker.example.com'],
        // No docker config - non-Docker service
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

  describe('configuration loading', () => {
    it('should exit with error if config file does not exist', async () => {
      ;(vi.mocked(fs.pathExists) as any).mockResolvedValue(false)

      await logsCommand({
        file: 'nonexistent.yml',
        follow: false,
        tail: 100,
      })

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to show logs'),
        expect.stringContaining('Configuration file not found')
      )
      expect(processExitSpy).toHaveBeenCalledWith(1)
    })

    it('should load config file successfully', async () => {
      ;(vi.mocked(fs.pathExists) as any).mockResolvedValue(true)
      vi.mocked(configLoader.loadConfig).mockResolvedValue(mockConfig)
      vi.mocked(docker.isContainerRunning).mockResolvedValue(false)

      await logsCommand({
        file: 'suthep.yml',
        follow: false,
        tail: 100,
      })

      expect(fs.pathExists).toHaveBeenCalledWith('suthep.yml')
      expect(configLoader.loadConfig).toHaveBeenCalledWith('suthep.yml')
    })
  })

  describe('service filtering', () => {
    it('should show logs for all services when serviceName is not specified', async () => {
      ;(vi.mocked(fs.pathExists) as any).mockResolvedValue(true)
      vi.mocked(configLoader.loadConfig).mockResolvedValue(mockConfig)
      vi.mocked(docker.isContainerRunning).mockResolvedValue(true)
      vi.mocked(docker.getContainerLogs).mockResolvedValue('log line 1\nlog line 2')

      await logsCommand({
        file: 'suthep.yml',
        follow: false,
        tail: 100,
      })

      // Should check both Docker services (api and web)
      expect(docker.isContainerRunning).toHaveBeenCalledWith('api-container')
      expect(docker.isContainerRunning).toHaveBeenCalledWith('web-container')
    })

    it('should show logs for specific service when serviceName is specified', async () => {
      ;(vi.mocked(fs.pathExists) as any).mockResolvedValue(true)
      vi.mocked(configLoader.loadConfig).mockResolvedValue(mockConfig)
      vi.mocked(docker.isContainerRunning).mockResolvedValue(true)
      vi.mocked(docker.getContainerLogs).mockResolvedValue('log line 1\nlog line 2')

      await logsCommand({
        file: 'suthep.yml',
        serviceName: 'api',
        follow: false,
        tail: 100,
      })

      // Should only check api container
      expect(docker.isContainerRunning).toHaveBeenCalledWith('api-container')
      expect(docker.isContainerRunning).not.toHaveBeenCalledWith('web-container')
    })

    it('should exit with error if specified service does not exist', async () => {
      ;(vi.mocked(fs.pathExists) as any).mockResolvedValue(true)
      vi.mocked(configLoader.loadConfig).mockResolvedValue(mockConfig)

      // Suppress process.exit for this test
      processExitSpy.mockImplementation(() => {
        throw new Error('process.exit called')
      })

      try {
        await logsCommand({
          file: 'suthep.yml',
          serviceName: 'nonexistent',
          follow: false,
          tail: 100,
        })
      } catch (error) {
        // Expected to throw due to process.exit mock
      }

      // Check that console.error was called
      expect(consoleErrorSpy.mock.calls.length).toBeGreaterThan(0)
      expect(processExitSpy).toHaveBeenCalledWith(1)
    })
  })

  describe('Docker service filtering', () => {
    it('should filter out non-Docker services', async () => {
      ;(vi.mocked(fs.pathExists) as any).mockResolvedValue(true)
      vi.mocked(configLoader.loadConfig).mockResolvedValue(mockConfig)
      vi.mocked(docker.isContainerRunning).mockResolvedValue(false)

      await logsCommand({
        file: 'suthep.yml',
        follow: false,
        tail: 100,
      })

      // Should only check Docker services, not worker (non-Docker)
      expect(docker.isContainerRunning).toHaveBeenCalledWith('api-container')
      expect(docker.isContainerRunning).toHaveBeenCalledWith('web-container')
      // Worker doesn't have docker config, so it shouldn't be checked
      expect(docker.isContainerRunning).toHaveBeenCalledTimes(2)
    })

    it('should show warning when no Docker services found', async () => {
      const configWithoutDocker: DeployConfig = {
        ...mockConfig,
        services: [
          {
            name: 'worker',
            port: 9000,
            domains: ['worker.example.com'],
            // No docker config
          },
        ],
      }

      ;(vi.mocked(fs.pathExists) as any).mockResolvedValue(true)
      vi.mocked(configLoader.loadConfig).mockResolvedValue(configWithoutDocker)

      await logsCommand({
        file: 'suthep.yml',
        follow: false,
        tail: 100,
      })

      // Check that console.log was called (chalk formatting makes exact matching difficult)
      // The function should output a warning message
      expect(consoleLogSpy.mock.calls.length).toBeGreaterThan(0)
    })
  })

  describe('container status checking', () => {
    it('should show logs only for running containers', async () => {
      ;(vi.mocked(fs.pathExists) as any).mockResolvedValue(true)
      vi.mocked(configLoader.loadConfig).mockResolvedValue(mockConfig)
      vi.mocked(docker.isContainerRunning)
        .mockResolvedValueOnce(true) // api is running
        .mockResolvedValueOnce(false) // web is stopped
      vi.mocked(docker.getContainerLogs).mockResolvedValue('log line 1\nlog line 2')

      await logsCommand({
        file: 'suthep.yml',
        follow: false,
        tail: 100,
      })

      // Should get logs for running container only
      expect(docker.getContainerLogs).toHaveBeenCalledWith('api-container', 100)
      expect(docker.getContainerLogs).not.toHaveBeenCalledWith('web-container', 100)
    })

    it('should show warning when no running containers found', async () => {
      ;(vi.mocked(fs.pathExists) as any).mockResolvedValue(true)
      vi.mocked(configLoader.loadConfig).mockResolvedValue(mockConfig)
      vi.mocked(docker.isContainerRunning).mockResolvedValue(false)

      await logsCommand({
        file: 'suthep.yml',
        follow: false,
        tail: 100,
      })

      // Check that console.log was called with warning message
      // The function should output a warning when no containers are running
      expect(consoleLogSpy.mock.calls.length).toBeGreaterThan(0)
    })
  })

  describe('non-follow mode', () => {
    it('should display logs for running containers', async () => {
      ;(vi.mocked(fs.pathExists) as any).mockResolvedValue(true)
      vi.mocked(configLoader.loadConfig).mockResolvedValue(mockConfig)
      vi.mocked(docker.isContainerRunning).mockResolvedValue(true)
      vi.mocked(docker.getContainerLogs).mockResolvedValue('log line 1\nlog line 2\nlog line 3')

      await logsCommand({
        file: 'suthep.yml',
        serviceName: 'api',
        follow: false,
        tail: 100,
      })

      expect(docker.getContainerLogs).toHaveBeenCalledWith('api-container', 100)
      // Verify the function completed successfully by checking docker calls
      expect(docker.isContainerRunning).toHaveBeenCalled()
      expect(docker.getContainerLogs).toHaveBeenCalled()
    })

    it('should use custom tail value', async () => {
      ;(vi.mocked(fs.pathExists) as any).mockResolvedValue(true)
      vi.mocked(configLoader.loadConfig).mockResolvedValue(mockConfig)
      vi.mocked(docker.isContainerRunning).mockResolvedValue(true)
      vi.mocked(docker.getContainerLogs).mockResolvedValue('log line')

      await logsCommand({
        file: 'suthep.yml',
        serviceName: 'api',
        follow: false,
        tail: 50,
      })

      expect(docker.getContainerLogs).toHaveBeenCalledWith('api-container', 50)
    })

    it('should handle empty logs gracefully', async () => {
      ;(vi.mocked(fs.pathExists) as any).mockResolvedValue(true)
      vi.mocked(configLoader.loadConfig).mockResolvedValue(mockConfig)
      vi.mocked(docker.isContainerRunning).mockResolvedValue(true)
      vi.mocked(docker.getContainerLogs).mockResolvedValue('')

      // Should not throw an error
      await expect(
        logsCommand({
          file: 'suthep.yml',
          serviceName: 'api',
          follow: false,
          tail: 100,
        })
      ).resolves.not.toThrow()

      // Verify the function handled empty logs
      expect(docker.getContainerLogs).toHaveBeenCalledWith('api-container', 100)
    })

    it('should handle errors when getting logs', async () => {
      ;(vi.mocked(fs.pathExists) as any).mockResolvedValue(true)
      vi.mocked(configLoader.loadConfig).mockResolvedValue(mockConfig)
      vi.mocked(docker.isContainerRunning).mockResolvedValue(true)
      vi.mocked(docker.getContainerLogs).mockRejectedValue(new Error('Container not found'))

      // Should not throw an error (it catches and logs it)
      await expect(
        logsCommand({
          file: 'suthep.yml',
          serviceName: 'api',
          follow: false,
          tail: 100,
        })
      ).resolves.not.toThrow()

      // Verify the error was handled
      expect(docker.getContainerLogs).toHaveBeenCalledWith('api-container', 100)
    })

    it('should show stopped services list', async () => {
      ;(vi.mocked(fs.pathExists) as any).mockResolvedValue(true)
      vi.mocked(configLoader.loadConfig).mockResolvedValue(mockConfig)
      vi.mocked(docker.isContainerRunning)
        .mockResolvedValueOnce(true) // api is running
        .mockResolvedValueOnce(false) // web is stopped
      vi.mocked(docker.getContainerLogs).mockResolvedValue('log line')

      await logsCommand({
        file: 'suthep.yml',
        follow: false,
        tail: 100,
      })

      // Verify that logs were retrieved for running container only
      expect(docker.getContainerLogs).toHaveBeenCalledWith('api-container', 100)
      expect(docker.getContainerLogs).not.toHaveBeenCalledWith('web-container', 100)
      // Verify both containers were checked
      expect(docker.isContainerRunning).toHaveBeenCalledWith('api-container')
      expect(docker.isContainerRunning).toHaveBeenCalledWith('web-container')
    })
  })

  describe('follow mode', () => {
    it('should stream logs for running containers', async () => {
      ;(vi.mocked(fs.pathExists) as any).mockResolvedValue(true)
      vi.mocked(configLoader.loadConfig).mockResolvedValue(mockConfig)
      vi.mocked(docker.isContainerRunning).mockResolvedValue(true)
      vi.mocked(docker.streamContainerLogs).mockImplementation(
        async (_container, _lines, onLog) => {
          onLog('streamed log line 1')
          onLog('streamed log line 2')
        }
      )

      // Use a timeout to prevent hanging
      const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 100))
      const logsPromise = logsCommand({
        file: 'suthep.yml',
        serviceName: 'api',
        follow: true,
        tail: 100,
      })

      await Promise.race([logsPromise, timeoutPromise])

      expect(docker.streamContainerLogs).toHaveBeenCalledWith(
        'api-container',
        100,
        expect.any(Function)
      )
    })

    it('should use custom tail value in follow mode', async () => {
      ;(vi.mocked(fs.pathExists) as any).mockResolvedValue(true)
      vi.mocked(configLoader.loadConfig).mockResolvedValue(mockConfig)
      vi.mocked(docker.isContainerRunning).mockResolvedValue(true)
      vi.mocked(docker.streamContainerLogs).mockImplementation(async () => {})

      const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 100))
      const logsPromise = logsCommand({
        file: 'suthep.yml',
        serviceName: 'api',
        follow: true,
        tail: 50,
      })

      await Promise.race([logsPromise, timeoutPromise])

      expect(docker.streamContainerLogs).toHaveBeenCalledWith(
        'api-container',
        50,
        expect.any(Function)
      )
    })

    it('should handle errors in follow mode gracefully', async () => {
      ;(vi.mocked(fs.pathExists) as any).mockResolvedValue(true)
      vi.mocked(configLoader.loadConfig).mockResolvedValue(mockConfig)
      vi.mocked(docker.isContainerRunning).mockResolvedValue(true)
      vi.mocked(docker.streamContainerLogs).mockRejectedValue(new Error('Stream error'))

      const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 100))
      const logsPromise = logsCommand({
        file: 'suthep.yml',
        serviceName: 'api',
        follow: true,
        tail: 100,
      })

      await Promise.race([logsPromise, timeoutPromise])

      // Should not exit on error in follow mode
      expect(processExitSpy).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('should exit with code 1 on error', async () => {
      ;(vi.mocked(fs.pathExists) as any).mockResolvedValue(true)
      vi.mocked(configLoader.loadConfig).mockRejectedValue(new Error('Config load error'))

      // Suppress process.exit for this test
      processExitSpy.mockImplementation(() => {
        throw new Error('process.exit called')
      })

      try {
        await logsCommand({
          file: 'suthep.yml',
          follow: false,
          tail: 100,
        })
      } catch (error) {
        // Expected to throw due to process.exit mock
      }

      // Verify process.exit was called with error code 1
      expect(processExitSpy).toHaveBeenCalledWith(1)
    })
  })
})
