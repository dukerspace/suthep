import type { DeploymentConfig, ServiceConfig } from '../types/config'
import type { ZeroDowntimeContainerInfo } from './docker'

/**
 * Perform a health check on a service endpoint
 */
export async function performHealthCheck(url: string, timeout: number = 30000): Promise<boolean> {
  const startTime = Date.now()
  const interval = 2000 // Check every 2 seconds

  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5 second timeout per request
      })

      if (response.ok) {
        return true
      }
    } catch (error) {
      // Endpoint not ready yet, continue waiting
    }

    // Wait before next check
    await new Promise((resolve) => setTimeout(resolve, interval))
  }

  return false
}

/**
 * Deploy a service with zero-downtime strategy
 */
export async function deployService(
  service: ServiceConfig,
  deploymentConfig: DeploymentConfig,
  tempInfo: ZeroDowntimeContainerInfo | null = null
): Promise<void> {
  if (deploymentConfig.strategy === 'rolling') {
    await rollingDeploy(service, deploymentConfig, tempInfo)
  } else if (deploymentConfig.strategy === 'blue-green') {
    await blueGreenDeploy(service, deploymentConfig, tempInfo)
  } else {
    throw new Error(`Unknown deployment strategy: ${deploymentConfig.strategy}`)
  }
}

/**
 * Rolling deployment strategy
 * For single instance, uses zero-downtime approach similar to blue-green
 */
async function rollingDeploy(
  service: ServiceConfig,
  deploymentConfig: DeploymentConfig,
  tempInfo: ZeroDowntimeContainerInfo | null
): Promise<void> {
  // For rolling deployment with single instance:
  // Similar to blue-green - use temporary container and port

  if (!tempInfo || !tempInfo.oldContainerExists) {
    // No existing container, just check health on the new container
    if (service.healthCheck) {
      const healthUrl = `http://localhost:${service.port}${service.healthCheck.path}`
      const isHealthy = await performHealthCheck(healthUrl, deploymentConfig.healthCheckTimeout)

      if (!isHealthy) {
        throw new Error(`Service ${service.name} failed health check during rolling deployment`)
      }
    }
  } else {
    // Check health on temporary port
    if (service.healthCheck) {
      const healthUrl = `http://localhost:${tempInfo.tempPort}${service.healthCheck.path}`
      const isHealthy = await performHealthCheck(healthUrl, deploymentConfig.healthCheckTimeout)

      if (!isHealthy) {
        throw new Error(
          `Service ${service.name} failed health check on temporary container during rolling deployment`
        )
      }
    }
  }

  // Add a small delay to ensure service is fully ready
  await new Promise((resolve) => setTimeout(resolve, 2000))
}

/**
 * Blue-green deployment strategy for single instance
 * Uses temporary container and port for zero-downtime deployment
 */
async function blueGreenDeploy(
  service: ServiceConfig,
  deploymentConfig: DeploymentConfig,
  tempInfo: ZeroDowntimeContainerInfo | null
): Promise<void> {
  // For blue-green deployment with single instance:
  // 1. New container is already started on temporary port (handled in deploy command)
  // 2. Run health checks on new container
  // 3. Switch nginx to new port (handled in deploy command)
  // 4. Stop old container and promote new one (handled in deploy command)

  if (!tempInfo || !tempInfo.oldContainerExists) {
    // No existing container, just check health on the new container
    if (service.healthCheck) {
      const healthUrl = `http://localhost:${service.port}${service.healthCheck.path}`
      const isHealthy = await performHealthCheck(healthUrl, deploymentConfig.healthCheckTimeout)

      if (!isHealthy) {
        throw new Error(`Service ${service.name} failed health check during blue-green deployment`)
      }
    }
  } else {
    // Check health on temporary port
    if (service.healthCheck) {
      const healthUrl = `http://localhost:${tempInfo.tempPort}${service.healthCheck.path}`
      const isHealthy = await performHealthCheck(healthUrl, deploymentConfig.healthCheckTimeout)

      if (!isHealthy) {
        throw new Error(
          `Service ${service.name} failed health check on temporary container during blue-green deployment`
        )
      }
    }
  }
}

/**
 * Wait for a service to become healthy
 */
export async function waitForService(
  service: ServiceConfig,
  timeout: number = 60000
): Promise<boolean> {
  if (!service.healthCheck) {
    // No health check configured, assume service is ready after a short delay
    await new Promise((resolve) => setTimeout(resolve, 5000))
    return true
  }

  const healthUrl = `http://localhost:${service.port}${service.healthCheck.path}`
  return await performHealthCheck(healthUrl, timeout)
}

/**
 * Gracefully shutdown a service
 */
export async function gracefulShutdown(
  _service: ServiceConfig,
  timeout: number = 30000
): Promise<void> {
  // Send shutdown signal and wait for graceful termination
  // This is a placeholder - actual implementation would depend on how services are managed

  await new Promise((resolve) => setTimeout(resolve, Math.min(timeout, 5000)))
}
