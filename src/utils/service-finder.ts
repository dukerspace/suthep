import type { DeployConfig, ServiceConfig } from '../types/config'

/**
 * Find a service by name or index (1-based)
 * @param config The deployment configuration
 * @param identifier Service name or index (as string or number)
 * @returns The found service, or null if not found
 */
export function findServiceByIdentifier(
  config: DeployConfig,
  identifier: string | undefined
): ServiceConfig | null {
  if (!identifier) {
    return null
  }

  // Try to parse as number (index)
  // Check if identifier is a pure number (not a number that's part of a name like "api2")
  if (/^\d+$/.test(identifier)) {
    const index = parseInt(identifier, 10)
    if (index > 0 && index <= config.services.length) {
      // 1-based index
      return config.services[index - 1]
    }
  }

  // Try to find by name
  return config.services.find((s) => s.name === identifier) || null
}

/**
 * Get a formatted list of available services with their indices
 * @param config The deployment configuration
 * @returns Formatted string listing all services with indices
 */
export function getAvailableServicesList(config: DeployConfig): string {
  return config.services
    .map((service, index) => `  ${index + 1}. ${service.name}`)
    .join('\n')
}

/**
 * Get error message for service not found
 * @param identifier The identifier that was not found
 * @param config The deployment configuration
 * @returns Error message with available services
 */
export function getServiceNotFoundError(
  identifier: string,
  config: DeployConfig
): string {
  return `Service "${identifier}" not found in configuration.\n\nAvailable services:\n${getAvailableServicesList(config)}`
}

