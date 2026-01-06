import fs from 'fs-extra'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DeployConfig } from '../../types/config'
import * as configLoader from '../../utils/config-loader'
import * as deployment from '../../utils/deployment'
import * as docker from '../../utils/docker'
import * as nginx from '../../utils/nginx'
import { restartCommand } from '../restart'

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
  isContainerRunning: vi.fn(),
  startDockerContainer: vi.fn(),
  stopDockerContainer: vi.fn(),
}))

vi.mock('../../utils/deployment', () => ({
  waitForService: vi.fn(),
}))

vi.mock('../../utils/nginx', () => ({
  enableSite: vi.fn(),
  generateMultiServiceNginxConfig: vi.fn(),
  generateNginxConfig: vi.fn(),
  reloadNginx: vi.fn(),
  writeNginxConfig: vi.fn(),
}))

// Mock console methods - store references for cleanup
let consoleErrorSpy: ReturnType<typeof vi.spyOn>
let processExitSpy: ReturnType<typeof vi.spyOn>

describe('restartCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Recreate spies in beforeEach to ensure they're fresh
    vi.spyOn(console, 'log').mockImplementation(() => {})
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
          image: 'api:latest',
        },
        healthCheck: {
          path: '/health',
          interval: 30,
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

      await restartCommand({
        file: 'nonexistent.yml',
        all: false,
        https: true,
        nginx: true,
      })

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to restart services'),
        expect.stringContaining('Configuration file not found')
      )
      expect(processExitSpy).toHaveBeenCalledWith(1)
    })

    it('should load config file successfully', async () => {
      ;(vi.mocked(fs.pathExists) as any).mockResolvedValue(true)
      vi.mocked(configLoader.loadConfig).mockResolvedValue(mockConfig)
      vi.mocked(docker.isContainerRunning).mockResolvedValue(false)
      vi.mocked(docker.startDockerContainer).mockResolvedValue()
      vi.mocked(nginx.generateNginxConfig).mockReturnValue('nginx config')
      vi.mocked(nginx.writeNginxConfig).mockResolvedValue(true)
      vi.mocked(nginx.enableSite).mockResolvedValue(undefined)
      vi.mocked(nginx.reloadNginx).mockResolvedValue(undefined)

      await restartCommand({
        file: 'suthep.yml',
        all: true,
        https: true,
        nginx: true,
      })

      expect(fs.pathExists).toHaveBeenCalledWith('suthep.yml')
      expect(configLoader.loadConfig).toHaveBeenCalledWith('suthep.yml')
    })
  })

  describe('service selection', () => {
    it('should restart all services when --all flag is used', async () => {
      ;(vi.mocked(fs.pathExists) as any).mockResolvedValue(true)
      vi.mocked(configLoader.loadConfig).mockResolvedValue(mockConfig)
      // Mock isContainerRunning: false for stop checks, true for Nginx config checks
      vi.mocked(docker.isContainerRunning)
        .mockResolvedValueOnce(false) // api - stop check
        .mockResolvedValueOnce(false) // web - stop check
        .mockResolvedValueOnce(true) // api - Nginx HTTP check
        .mockResolvedValueOnce(true) // web - Nginx HTTP check
        .mockResolvedValueOnce(true) // api - Nginx HTTPS check
        .mockResolvedValueOnce(true) // web - Nginx HTTPS check
      vi.mocked(docker.startDockerContainer).mockResolvedValue()
      vi.mocked(nginx.generateNginxConfig).mockReturnValue('nginx config')
      vi.mocked(nginx.writeNginxConfig).mockResolvedValue(true)
      vi.mocked(nginx.enableSite).mockResolvedValue(undefined)
      vi.mocked(nginx.reloadNginx).mockResolvedValue(undefined)

      await restartCommand({
        file: 'suthep.yml',
        all: true,
        https: true,
        nginx: true,
      })

      // Should check both Docker services
      expect(docker.isContainerRunning).toHaveBeenCalledWith('api-container')
      expect(docker.isContainerRunning).toHaveBeenCalledWith('web-container')
    })

    it('should restart specific service when serviceName is provided', async () => {
      ;(vi.mocked(fs.pathExists) as any).mockResolvedValue(true)
      vi.mocked(configLoader.loadConfig).mockResolvedValue(mockConfig)
      vi.mocked(docker.isContainerRunning).mockResolvedValue(false)
      vi.mocked(docker.startDockerContainer).mockResolvedValue()
      vi.mocked(nginx.generateNginxConfig).mockReturnValue('nginx config')
      vi.mocked(nginx.writeNginxConfig).mockResolvedValue(true)
      vi.mocked(nginx.enableSite).mockResolvedValue(undefined)
      vi.mocked(nginx.reloadNginx).mockResolvedValue(undefined)

      await restartCommand({
        file: 'suthep.yml',
        all: false,
        serviceName: 'api',
        https: true,
        nginx: true,
      })

      // Should only check api container
      expect(docker.isContainerRunning).toHaveBeenCalledWith('api-container')
      expect(docker.isContainerRunning).not.toHaveBeenCalledWith('web-container')
      expect(docker.startDockerContainer).toHaveBeenCalledWith(mockConfig.services[0])
    })

    it('should exit with error if neither serviceName nor --all is provided', async () => {
      ;(vi.mocked(fs.pathExists) as any).mockResolvedValue(true)
      vi.mocked(configLoader.loadConfig).mockResolvedValue(mockConfig)

      processExitSpy.mockImplementation(() => {
        throw new Error('process.exit called')
      })

      try {
        await restartCommand({
          file: 'suthep.yml',
          all: false,
          https: true,
          nginx: true,
        })
      } catch (error) {
        // Expected to throw due to process.exit mock
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to restart services'),
        expect.stringContaining('Either specify a service name/index or use --all flag')
      )
      expect(processExitSpy).toHaveBeenCalledWith(1)
    })

    it('should exit with error if specified service does not exist', async () => {
      ;(vi.mocked(fs.pathExists) as any).mockResolvedValue(true)
      vi.mocked(configLoader.loadConfig).mockResolvedValue(mockConfig)

      processExitSpy.mockImplementation(() => {
        throw new Error('process.exit called')
      })

      try {
        await restartCommand({
          file: 'suthep.yml',
          all: false,
          serviceName: 'nonexistent',
          https: true,
          nginx: true,
        })
      } catch (error) {
        // Expected to throw due to process.exit mock
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to restart services'),
        expect.stringContaining('Service "nonexistent" not found')
      )
      expect(processExitSpy).toHaveBeenCalledWith(1)
    })
  })

  describe('Docker container restart', () => {
    it('should stop and start container when container is running', async () => {
      ;(vi.mocked(fs.pathExists) as any).mockResolvedValue(true)
      vi.mocked(configLoader.loadConfig).mockResolvedValue(mockConfig)
      // First call: check if running (true), then after start: true for Nginx config (HTTP and HTTPS)
      vi.mocked(docker.isContainerRunning)
        .mockResolvedValueOnce(true) // For stop check
        .mockResolvedValueOnce(true) // For Nginx config check (HTTP)
        .mockResolvedValueOnce(true) // For Nginx config check (HTTPS)
      vi.mocked(docker.stopDockerContainer).mockResolvedValue()
      vi.mocked(docker.startDockerContainer).mockResolvedValue()
      vi.mocked(nginx.generateNginxConfig).mockReturnValue('nginx config')
      vi.mocked(nginx.writeNginxConfig).mockResolvedValue(true)
      vi.mocked(nginx.enableSite).mockResolvedValue(undefined)
      vi.mocked(nginx.reloadNginx).mockResolvedValue(undefined)

      await restartCommand({
        file: 'suthep.yml',
        all: false,
        serviceName: 'api',
        https: true,
        nginx: true,
      })

      expect(docker.isContainerRunning).toHaveBeenCalledWith('api-container')
      expect(docker.stopDockerContainer).toHaveBeenCalledWith('api-container')
      expect(docker.startDockerContainer).toHaveBeenCalledWith(mockConfig.services[0])
      // After starting, isContainerRunning is called again for Nginx config (HTTP and HTTPS)
      expect(docker.isContainerRunning).toHaveBeenCalledTimes(3) // Once for stop check, once for HTTP, once for HTTPS
    })

    it('should only start container when container is not running', async () => {
      ;(vi.mocked(fs.pathExists) as any).mockResolvedValue(true)
      vi.mocked(configLoader.loadConfig).mockResolvedValue(mockConfig)
      // First call: check if running (false), then after start: true for Nginx config (HTTP and HTTPS)
      vi.mocked(docker.isContainerRunning)
        .mockResolvedValueOnce(false) // For stop check
        .mockResolvedValueOnce(true) // For Nginx config check (HTTP)
        .mockResolvedValueOnce(true) // For Nginx config check (HTTPS)
      vi.mocked(docker.startDockerContainer).mockResolvedValue()
      vi.mocked(nginx.generateNginxConfig).mockReturnValue('nginx config')
      vi.mocked(nginx.writeNginxConfig).mockResolvedValue(true)
      vi.mocked(nginx.enableSite).mockResolvedValue(undefined)
      vi.mocked(nginx.reloadNginx).mockResolvedValue(undefined)

      await restartCommand({
        file: 'suthep.yml',
        all: false,
        serviceName: 'api',
        https: true,
        nginx: true,
      })

      expect(docker.isContainerRunning).toHaveBeenCalledWith('api-container')
      expect(docker.stopDockerContainer).not.toHaveBeenCalled()
      expect(docker.startDockerContainer).toHaveBeenCalledWith(mockConfig.services[0])
      // After starting, isContainerRunning is called again for Nginx config (HTTP and HTTPS)
      // Mock it to return true for the Nginx phase
      expect(docker.isContainerRunning).toHaveBeenCalledTimes(3) // Once for stop check, once for HTTP, once for HTTPS
    })

    it('should handle container not found error gracefully', async () => {
      ;(vi.mocked(fs.pathExists) as any).mockResolvedValue(true)
      vi.mocked(configLoader.loadConfig).mockResolvedValue(mockConfig)
      vi.mocked(docker.isContainerRunning).mockRejectedValue(
        new Error('No such container')
      )
      vi.mocked(docker.startDockerContainer).mockResolvedValue()
      vi.mocked(nginx.generateNginxConfig).mockReturnValue('nginx config')
      vi.mocked(nginx.writeNginxConfig).mockResolvedValue(true)
      vi.mocked(nginx.enableSite).mockResolvedValue(undefined)
      vi.mocked(nginx.reloadNginx).mockResolvedValue(undefined)

      await restartCommand({
        file: 'suthep.yml',
        all: false,
        serviceName: 'api',
        https: true,
        nginx: true,
      })

      // Should still try to start the container
      expect(docker.startDockerContainer).toHaveBeenCalled()
    })

    it('should exit with error if stop container fails with non-recoverable error', async () => {
      ;(vi.mocked(fs.pathExists) as any).mockResolvedValue(true)
      vi.mocked(configLoader.loadConfig).mockResolvedValue(mockConfig)
      vi.mocked(docker.isContainerRunning).mockResolvedValue(true)
      vi.mocked(docker.stopDockerContainer).mockRejectedValue(
        new Error('Permission denied')
      )

      processExitSpy.mockImplementation(() => {
        throw new Error('process.exit called')
      })

      try {
        await restartCommand({
          file: 'suthep.yml',
          all: false,
          serviceName: 'api',
          https: true,
          nginx: true,
        })
      } catch (error) {
        // Expected to throw due to process.exit mock
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to restart services'),
        expect.any(String)
      )
      expect(processExitSpy).toHaveBeenCalledWith(1)
    })

    it('should exit with error if start container fails', async () => {
      ;(vi.mocked(fs.pathExists) as any).mockResolvedValue(true)
      vi.mocked(configLoader.loadConfig).mockResolvedValue(mockConfig)
      vi.mocked(docker.isContainerRunning).mockResolvedValue(false)
      vi.mocked(docker.startDockerContainer).mockRejectedValue(
        new Error('Failed to start container')
      )

      processExitSpy.mockImplementation(() => {
        throw new Error('process.exit called')
      })

      try {
        await restartCommand({
          file: 'suthep.yml',
          all: false,
          serviceName: 'api',
          https: true,
          nginx: true,
        })
      } catch (error) {
        // Expected to throw due to process.exit mock
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to restart services'),
        expect.any(String)
      )
      expect(processExitSpy).toHaveBeenCalledWith(1)
    })

    it('should skip Docker operations for non-Docker services', async () => {
      ;(vi.mocked(fs.pathExists) as any).mockResolvedValue(true)
      vi.mocked(configLoader.loadConfig).mockResolvedValue(mockConfig)
      vi.mocked(nginx.generateNginxConfig).mockReturnValue('nginx config')
      vi.mocked(nginx.writeNginxConfig).mockResolvedValue(true)
      vi.mocked(nginx.enableSite).mockResolvedValue(undefined)
      vi.mocked(nginx.reloadNginx).mockResolvedValue(undefined)

      await restartCommand({
        file: 'suthep.yml',
        all: false,
        serviceName: 'worker',
        https: true,
        nginx: true,
      })

      // Should not check for container running for non-Docker service
      expect(docker.isContainerRunning).not.toHaveBeenCalled()
      expect(docker.stopDockerContainer).not.toHaveBeenCalled()
      expect(docker.startDockerContainer).not.toHaveBeenCalled()
    })
  })

  describe('health checks', () => {
    it('should wait for health check when service has healthCheck configured', async () => {
      ;(vi.mocked(fs.pathExists) as any).mockResolvedValue(true)
      vi.mocked(configLoader.loadConfig).mockResolvedValue(mockConfig)
      vi.mocked(docker.isContainerRunning).mockResolvedValue(false)
      vi.mocked(docker.startDockerContainer).mockResolvedValue()
      vi.mocked(deployment.waitForService).mockResolvedValue(true)
      vi.mocked(nginx.generateNginxConfig).mockReturnValue('nginx config')
      vi.mocked(nginx.writeNginxConfig).mockResolvedValue(true)
      vi.mocked(nginx.enableSite).mockResolvedValue(undefined)
      vi.mocked(nginx.reloadNginx).mockResolvedValue(undefined)

      await restartCommand({
        file: 'suthep.yml',
        all: false,
        serviceName: 'api',
        https: true,
        nginx: true,
      })

      expect(deployment.waitForService).toHaveBeenCalledWith(
        mockConfig.services[0],
        mockConfig.deployment.healthCheckTimeout
      )
    })

    it('should skip health check when service does not have healthCheck configured', async () => {
      ;(vi.mocked(fs.pathExists) as any).mockResolvedValue(true)
      vi.mocked(configLoader.loadConfig).mockResolvedValue(mockConfig)
      vi.mocked(docker.isContainerRunning).mockResolvedValue(false)
      vi.mocked(docker.startDockerContainer).mockResolvedValue()
      vi.mocked(nginx.generateNginxConfig).mockReturnValue('nginx config')
      vi.mocked(nginx.writeNginxConfig).mockResolvedValue(true)
      vi.mocked(nginx.enableSite).mockResolvedValue(undefined)
      vi.mocked(nginx.reloadNginx).mockResolvedValue(undefined)

      await restartCommand({
        file: 'suthep.yml',
        all: false,
        serviceName: 'web',
        https: true,
        nginx: true,
      })

      // Web service doesn't have healthCheck, so waitForService should not be called
      expect(deployment.waitForService).not.toHaveBeenCalled()
    })

    it('should continue even if health check times out', async () => {
      ;(vi.mocked(fs.pathExists) as any).mockResolvedValue(true)
      vi.mocked(configLoader.loadConfig).mockResolvedValue(mockConfig)
      // First call: check if running (false), then after start: true for Nginx config
      vi.mocked(docker.isContainerRunning)
        .mockResolvedValueOnce(false) // For stop check
        .mockResolvedValueOnce(true) // For Nginx config check
      vi.mocked(docker.startDockerContainer).mockResolvedValue()
      vi.mocked(deployment.waitForService).mockResolvedValue(false) // Health check timeout
      vi.mocked(nginx.generateNginxConfig).mockReturnValue('nginx config')
      vi.mocked(nginx.writeNginxConfig).mockResolvedValue(true)
      vi.mocked(nginx.enableSite).mockResolvedValue(undefined)
      vi.mocked(nginx.reloadNginx).mockResolvedValue(undefined)

      await restartCommand({
        file: 'suthep.yml',
        all: false,
        serviceName: 'api',
        https: true,
        nginx: true,
      })

      // Should continue with Nginx configuration even if health check fails
      expect(nginx.writeNginxConfig).toHaveBeenCalled()
    })
  })

  describe('Nginx configuration', () => {
    it('should update Nginx config when nginx option is true', async () => {
      ;(vi.mocked(fs.pathExists) as any).mockResolvedValue(true)
      vi.mocked(configLoader.loadConfig).mockResolvedValue(mockConfig)
      // First call: check if running (false), then after start: true for Nginx config
      vi.mocked(docker.isContainerRunning)
        .mockResolvedValueOnce(false) // For stop check
        .mockResolvedValueOnce(true) // For Nginx config check (HTTP)
        .mockResolvedValueOnce(true) // For Nginx config check (HTTPS)
      vi.mocked(docker.startDockerContainer).mockResolvedValue()
      vi.mocked(nginx.generateNginxConfig).mockReturnValue('nginx config')
      vi.mocked(nginx.writeNginxConfig).mockResolvedValue(true)
      vi.mocked(nginx.enableSite).mockResolvedValue(undefined)
      vi.mocked(nginx.reloadNginx).mockResolvedValue(undefined)

      await restartCommand({
        file: 'suthep.yml',
        all: false,
        serviceName: 'api',
        https: true,
        nginx: true,
      })

      expect(nginx.generateNginxConfig).toHaveBeenCalled()
      expect(nginx.writeNginxConfig).toHaveBeenCalled()
      expect(nginx.enableSite).toHaveBeenCalled()
      expect(nginx.reloadNginx).toHaveBeenCalled()
    })

    it('should skip Nginx configuration when nginx option is false', async () => {
      ;(vi.mocked(fs.pathExists) as any).mockResolvedValue(true)
      vi.mocked(configLoader.loadConfig).mockResolvedValue(mockConfig)
      vi.mocked(docker.isContainerRunning).mockResolvedValue(false)
      vi.mocked(docker.startDockerContainer).mockResolvedValue()

      await restartCommand({
        file: 'suthep.yml',
        all: false,
        serviceName: 'api',
        https: true,
        nginx: false,
      })

      expect(nginx.generateNginxConfig).not.toHaveBeenCalled()
      expect(nginx.writeNginxConfig).not.toHaveBeenCalled()
      expect(nginx.reloadNginx).not.toHaveBeenCalled()
    })

    it('should generate single service config for single service on domain', async () => {
      ;(vi.mocked(fs.pathExists) as any).mockResolvedValue(true)
      vi.mocked(configLoader.loadConfig).mockResolvedValue(mockConfig)
      // First call: check if running (false), then after start: true for Nginx config
      vi.mocked(docker.isContainerRunning)
        .mockResolvedValueOnce(false) // For stop check
        .mockResolvedValueOnce(true) // For Nginx config check
      vi.mocked(docker.startDockerContainer).mockResolvedValue()
      vi.mocked(nginx.generateNginxConfig).mockReturnValue('nginx config')
      vi.mocked(nginx.writeNginxConfig).mockResolvedValue(true)
      vi.mocked(nginx.enableSite).mockResolvedValue(undefined)
      vi.mocked(nginx.reloadNginx).mockResolvedValue(undefined)

      await restartCommand({
        file: 'suthep.yml',
        all: false,
        serviceName: 'api',
        https: false,
        nginx: true,
      })

      expect(nginx.generateNginxConfig).toHaveBeenCalledWith(mockConfig.services[0], false)
      expect(nginx.generateMultiServiceNginxConfig).not.toHaveBeenCalled()
    })

    it('should generate multi-service config when multiple services share domain', async () => {
      const multiServiceConfig: DeployConfig = {
        ...mockConfig,
        services: [
          {
            name: 'api',
            port: 3000,
            domains: ['example.com'],
            docker: {
              container: 'api-container',
              port: 80,
              image: 'api:latest',
            },
          },
          {
            name: 'web',
            port: 8080,
            domains: ['example.com'],
            docker: {
              container: 'web-container',
              port: 80,
              image: 'web:latest',
            },
          },
        ],
      }

      ;(vi.mocked(fs.pathExists) as any).mockResolvedValue(true)
      vi.mocked(configLoader.loadConfig).mockResolvedValue(multiServiceConfig)
      // Mock isContainerRunning: true for stop checks, true for Nginx config checks
      vi.mocked(docker.isContainerRunning)
        .mockResolvedValueOnce(true) // api - stop check
        .mockResolvedValueOnce(true) // web - stop check
        .mockResolvedValueOnce(true) // api - Nginx check
        .mockResolvedValueOnce(true) // web - Nginx check
      vi.mocked(docker.stopDockerContainer).mockResolvedValue()
      vi.mocked(docker.startDockerContainer).mockResolvedValue()
      vi.mocked(nginx.generateMultiServiceNginxConfig).mockReturnValue('multi-service config')
      vi.mocked(nginx.writeNginxConfig).mockResolvedValue(true)
      vi.mocked(nginx.enableSite).mockResolvedValue(undefined)
      vi.mocked(nginx.reloadNginx).mockResolvedValue(undefined)

      await restartCommand({
        file: 'suthep.yml',
        all: true,
        https: false,
        nginx: true,
      })

      expect(nginx.generateMultiServiceNginxConfig).toHaveBeenCalled()
    })

    it('should update Nginx config with HTTPS when https option is true', async () => {
      ;(vi.mocked(fs.pathExists) as any).mockResolvedValue(true)
      vi.mocked(configLoader.loadConfig).mockResolvedValue(mockConfig)
      // First call: check if running (false), then after start: true for Nginx config (HTTP and HTTPS)
      vi.mocked(docker.isContainerRunning)
        .mockResolvedValueOnce(false) // For stop check
        .mockResolvedValueOnce(true) // For Nginx config check (HTTP)
        .mockResolvedValueOnce(true) // For Nginx config check (HTTPS)
      vi.mocked(docker.startDockerContainer).mockResolvedValue()
      vi.mocked(nginx.generateNginxConfig)
        .mockReturnValueOnce('http config')
        .mockReturnValueOnce('https config')
      vi.mocked(nginx.writeNginxConfig).mockResolvedValue(true)
      vi.mocked(nginx.enableSite).mockResolvedValue(undefined)
      vi.mocked(nginx.reloadNginx).mockResolvedValue(undefined)

      await restartCommand({
        file: 'suthep.yml',
        all: false,
        serviceName: 'api',
        https: true,
        nginx: true,
      })

      // Should generate HTTPS config
      expect(nginx.generateNginxConfig).toHaveBeenCalledWith(mockConfig.services[0], true)
    })

    it('should exit with error if Nginx config generation fails', async () => {
      ;(vi.mocked(fs.pathExists) as any).mockResolvedValue(true)
      vi.mocked(configLoader.loadConfig).mockResolvedValue(mockConfig)
      // First call: check if running (false), then after start: true for Nginx config
      vi.mocked(docker.isContainerRunning)
        .mockResolvedValueOnce(false) // For stop check
        .mockResolvedValueOnce(true) // For Nginx config check
      vi.mocked(docker.startDockerContainer).mockResolvedValue()
      vi.mocked(nginx.generateNginxConfig).mockImplementation(() => {
        throw new Error('Nginx config error')
      })

      processExitSpy.mockImplementation(() => {
        throw new Error('process.exit called')
      })

      try {
        await restartCommand({
          file: 'suthep.yml',
          all: false,
          serviceName: 'api',
          https: true,
          nginx: true,
        })
      } catch (error) {
        // Expected to throw due to process.exit mock
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to restart services'),
        expect.any(String)
      )
      expect(processExitSpy).toHaveBeenCalledWith(1)
    })

    it('should exit with error if Nginx reload fails', async () => {
      ;(vi.mocked(fs.pathExists) as any).mockResolvedValue(true)
      vi.mocked(configLoader.loadConfig).mockResolvedValue(mockConfig)
      vi.mocked(docker.isContainerRunning).mockResolvedValue(false)
      vi.mocked(docker.startDockerContainer).mockResolvedValue(undefined)
      vi.mocked(nginx.generateNginxConfig).mockReturnValue('nginx config')
      vi.mocked(nginx.writeNginxConfig).mockResolvedValue(true)
      vi.mocked(nginx.enableSite).mockResolvedValue(undefined)
      vi.mocked(nginx.reloadNginx).mockRejectedValue(new Error('Nginx reload failed'))

      processExitSpy.mockImplementation(() => {
        throw new Error('process.exit called')
      })

      try {
        await restartCommand({
          file: 'suthep.yml',
          all: false,
          serviceName: 'api',
          https: true,
          nginx: true,
        })
      } catch (error) {
        // Expected to throw due to process.exit mock
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to restart services'),
        expect.any(String)
      )
      expect(processExitSpy).toHaveBeenCalledWith(1)
    })

    it('should skip Nginx config for domains with no active services', async () => {
      const configWithStoppedService: DeployConfig = {
        ...mockConfig,
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
        ],
      }

      ;(vi.mocked(fs.pathExists) as any).mockResolvedValue(true)
      vi.mocked(configLoader.loadConfig).mockResolvedValue(configWithStoppedService)
      // First call: check if running (false), then after start: true for Nginx config
      vi.mocked(docker.isContainerRunning)
        .mockResolvedValueOnce(false) // For stop check
        .mockResolvedValueOnce(true) // For Nginx config check (HTTP)
        .mockResolvedValueOnce(true) // For Nginx config check (HTTPS)
      // But we're restarting it, so it should be active
      vi.mocked(docker.startDockerContainer).mockResolvedValue()
      vi.mocked(nginx.generateNginxConfig).mockReturnValue('nginx config')
      vi.mocked(nginx.writeNginxConfig).mockResolvedValue(true)
      vi.mocked(nginx.enableSite).mockResolvedValue(undefined)
      vi.mocked(nginx.reloadNginx).mockResolvedValue(undefined)

      await restartCommand({
        file: 'suthep.yml',
        all: false,
        serviceName: 'api',
        https: true,
        nginx: true,
      })

      // Should still configure Nginx since we're restarting the service
      expect(nginx.writeNginxConfig).toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('should exit with code 1 on any error', async () => {
      ;(vi.mocked(fs.pathExists) as any).mockResolvedValue(true)
      vi.mocked(configLoader.loadConfig).mockRejectedValue(new Error('Config load error'))

      processExitSpy.mockImplementation(() => {
        throw new Error('process.exit called')
      })

      try {
        await restartCommand({
          file: 'suthep.yml',
          all: false,
          serviceName: 'api',
          https: true,
          nginx: true,
        })
      } catch (error) {
        // Expected to throw due to process.exit mock
      }

      // Verify process.exit was called with error code 1
      expect(processExitSpy).toHaveBeenCalledWith(1)
    })
  })

  describe('success scenarios', () => {
    it('should complete successfully for single service restart', async () => {
      ;(vi.mocked(fs.pathExists) as any).mockResolvedValue(true)
      vi.mocked(configLoader.loadConfig).mockResolvedValue(mockConfig)
      // First call: check if running (true), then after start: true for Nginx config (HTTP and HTTPS)
      vi.mocked(docker.isContainerRunning)
        .mockResolvedValueOnce(true) // For stop check
        .mockResolvedValueOnce(true) // For Nginx config check (HTTP)
        .mockResolvedValueOnce(true) // For Nginx config check (HTTPS)
      vi.mocked(docker.stopDockerContainer).mockResolvedValue()
      vi.mocked(docker.startDockerContainer).mockResolvedValue()
      vi.mocked(deployment.waitForService).mockResolvedValue(true)
      vi.mocked(nginx.generateNginxConfig).mockReturnValue('nginx config')
      vi.mocked(nginx.writeNginxConfig).mockResolvedValue(true)
      vi.mocked(nginx.enableSite).mockResolvedValue(undefined)
      vi.mocked(nginx.reloadNginx).mockResolvedValue(undefined)

      await restartCommand({
        file: 'suthep.yml',
        all: false,
        serviceName: 'api',
        https: true,
        nginx: true,
      })

      // Verify all steps were executed
      expect(docker.isContainerRunning).toHaveBeenCalled()
      expect(docker.stopDockerContainer).toHaveBeenCalled()
      expect(docker.startDockerContainer).toHaveBeenCalled()
      expect(deployment.waitForService).toHaveBeenCalled()
      expect(nginx.writeNginxConfig).toHaveBeenCalled()
      expect(nginx.reloadNginx).toHaveBeenCalled()
      expect(processExitSpy).not.toHaveBeenCalled()
    })

    it('should complete successfully for all services restart', async () => {
      ;(vi.mocked(fs.pathExists) as any).mockResolvedValue(true)
      vi.mocked(configLoader.loadConfig).mockResolvedValue(mockConfig)
      // Mock isContainerRunning: false for stop checks, true for Nginx config checks
      vi.mocked(docker.isContainerRunning)
        .mockResolvedValueOnce(false) // api - stop check
        .mockResolvedValueOnce(false) // web - stop check
        .mockResolvedValueOnce(true) // api - Nginx check
        .mockResolvedValueOnce(true) // web - Nginx check
      vi.mocked(docker.startDockerContainer).mockResolvedValue()
      vi.mocked(nginx.generateNginxConfig).mockReturnValue('nginx config')
      vi.mocked(nginx.writeNginxConfig).mockResolvedValue(true)
      vi.mocked(nginx.enableSite).mockResolvedValue(undefined)
      vi.mocked(nginx.reloadNginx).mockResolvedValue(undefined)

      await restartCommand({
        file: 'suthep.yml',
        all: true,
        https: false,
        nginx: true,
      })

      // Should process all Docker services
      expect(docker.startDockerContainer).toHaveBeenCalledTimes(2) // api and web
      expect(nginx.reloadNginx).toHaveBeenCalled()
      expect(processExitSpy).not.toHaveBeenCalled()
    })
  })
})

