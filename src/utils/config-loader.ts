import fs from 'fs-extra'
import yaml from 'js-yaml'
import { dirname, resolve } from 'path'
import type { DeployConfig } from '../types/config'
import { loadAndApplyEnvFiles } from './env-loader'

/**
 * Substitute environment variables in a string
 * Replaces ${VAR_NAME} or ${VAR_NAME:-default} patterns with values from envVars or process.env
 *
 * @param text The text containing variable references
 * @param envVars Environment variables object
 * @returns Text with variables substituted
 */
function substituteEnvVars(text: string, envVars: Record<string, string>): string {
  // Match ${VAR_NAME} or ${VAR_NAME:-default} patterns
  return text.replace(/\$\{([^}:]+)(?::-([^}]*))?\}/g, (match, varName, defaultValue) => {
    // Check envVars first, then process.env
    const value = envVars[varName] || process.env[varName]

    if (value !== undefined && value !== null) {
      return value
    }

    // Use default value if provided
    if (defaultValue !== undefined) {
      return defaultValue
    }

    // Return original match if not found and no default
    return match
  })
}

/**
 * Recursively substitute environment variables in an object
 */
function substituteInObject(obj: any, envVars: Record<string, string>): any {
  if (typeof obj === 'string') {
    return substituteEnvVars(obj, envVars)
  } else if (Array.isArray(obj)) {
    return obj.map((item) => substituteInObject(item, envVars))
  } else if (obj !== null && typeof obj === 'object') {
    const result: any = {}
    for (const [key, value] of Object.entries(obj)) {
      result[key] = substituteInObject(value, envVars)
    }
    return result
  }
  return obj
}

/**
 * Load and parse a YAML configuration file with environment variable substitution
 * Variables in the format ${VAR_NAME} or ${VAR_NAME:-default} will be replaced
 * with values from .env files or process.env
 */
export async function loadConfig(filePath: string): Promise<DeployConfig> {
  try {
    // Load .env files from the directory containing the config file
    const configDir = dirname(resolve(filePath))
    const envVars = await loadAndApplyEnvFiles(configDir)

    // Read the YAML file content
    const fileContent = await fs.readFile(filePath, 'utf8')

    // Substitute environment variables in the YAML content before parsing
    const substitutedContent = substituteEnvVars(fileContent, envVars)

    // Parse the YAML
    const config = yaml.load(substitutedContent) as DeployConfig

    // Also substitute in the parsed object (in case YAML parsing didn't handle strings properly)
    const finalConfig = substituteInObject(config, envVars) as DeployConfig

    validateConfig(finalConfig)

    return finalConfig
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load configuration from ${filePath}: ${error.message}`)
    }
    throw error
  }
}

/**
 * Validate the configuration object
 */
function validateConfig(config: any): asserts config is DeployConfig {
  if (!config.project || !config.project.name) {
    throw new Error('Configuration must include project.name')
  }

  if (!config.services || !Array.isArray(config.services) || config.services.length === 0) {
    throw new Error('Configuration must include at least one service')
  }

  // Track ports and container names to detect conflicts
  const usedPorts = new Map<number, string[]>()
  const usedContainers = new Map<string, string>()

  for (const service of config.services) {
    if (!service.name) {
      throw new Error('Each service must have a name')
    }
    if (!service.port) {
      throw new Error(`Service ${service.name} must have a port`)
    }
    if (!service.domains || !Array.isArray(service.domains) || service.domains.length === 0) {
      throw new Error(`Service ${service.name} must have at least one domain`)
    }

    // Check for port conflicts
    if (usedPorts.has(service.port)) {
      const conflictingServices = usedPorts.get(service.port)!
      throw new Error(
        `Port conflict: Service "${service.name}" uses port ${
          service.port
        } which is already used by: ${conflictingServices.join(
          ', '
        )}. Each service must use a unique port.`
      )
    }
    usedPorts.set(service.port, [service.name])

    // Check for Docker container name conflicts
    if (service.docker) {
      const containerName = service.docker.container
      if (usedContainers.has(containerName)) {
        const conflictingService = usedContainers.get(containerName)!
        throw new Error(
          `Docker container name conflict: Service "${service.name}" uses container name "${containerName}" which is already used by service "${conflictingService}". Each Docker container must have a unique name.`
        )
      }
      usedContainers.set(containerName, service.name)
    }
  }

  // Check for duplicate service names
  const serviceNames = new Set<string>()
  for (const service of config.services) {
    if (serviceNames.has(service.name)) {
      throw new Error(
        `Duplicate service name: "${service.name}" is used multiple times. Each service must have a unique name.`
      )
    }
    serviceNames.add(service.name)
  }

  if (!config.nginx) {
    config.nginx = {
      configPath: '/etc/nginx/sites-available',
      reloadCommand: 'sudo nginx -t && sudo systemctl reload nginx',
    }
  }

  if (!config.certbot) {
    config.certbot = {
      email: '',
      staging: false,
    }
  }

  if (!config.deployment) {
    config.deployment = {
      strategy: 'rolling',
      healthCheckTimeout: 30000,
    }
  }
}

/**
 * Save configuration to a YAML file
 */
export async function saveConfig(filePath: string, config: DeployConfig): Promise<void> {
  const yamlContent = yaml.dump(config, {
    indent: 2,
    lineWidth: 120,
    noRefs: true,
  })

  await fs.writeFile(filePath, yamlContent, 'utf8')
}
