import { config } from 'dotenv'
import fs from 'fs-extra'
import { resolve } from 'path'

// Store loaded .env variables globally so they can be accessed by other modules
let loadedEnvVars: Record<string, string> = {}

/**
 * Get the currently loaded .env variables
 */
export function getLoadedEnvVars(): Record<string, string> {
  return { ...loadedEnvVars }
}

/**
 * Set the loaded .env variables (used internally)
 */
export function setLoadedEnvVars(vars: Record<string, string>): void {
  loadedEnvVars = { ...vars }
}

/**
 * Load environment variables from .env files
 * Searches for .env files in the following order:
 * 1. .env.local (highest priority, should be gitignored)
 * 2. .env
 *
 * @param configDir Optional directory path to search for .env files (defaults to current working directory)
 * @returns Object containing loaded environment variables
 */
export async function loadEnvFiles(configDir?: string): Promise<Record<string, string>> {
  const baseDir = configDir || process.cwd()
  const envFiles = ['.env.local', '.env']
  const loadedVars: Record<string, string> = {}

  for (const envFile of envFiles) {
    const envPath = resolve(baseDir, envFile)

    if (await fs.pathExists(envPath)) {
      try {
        // Load .env file using dotenv
        const result = config({ path: envPath, override: false })

        if (result.error) {
          console.warn(`Warning: Failed to load ${envFile}: ${result.error.message}`)
          continue
        }

        // Merge loaded variables (later files override earlier ones)
        if (result.parsed) {
          Object.assign(loadedVars, result.parsed)
        }
      } catch (error) {
        console.warn(
          `Warning: Error loading ${envFile}: ${error instanceof Error ? error.message : error}`
        )
      }
    }
  }

  return loadedVars
}

/**
 * Load and apply environment variables from .env files to process.env
 * This will load .env files and merge them into process.env
 *
 * @param configDir Optional directory path to search for .env files
 * @returns Object containing loaded environment variables
 */
export async function loadAndApplyEnvFiles(configDir?: string): Promise<Record<string, string>> {
  const baseDir = configDir || process.cwd()
  const envFiles = ['.env.local', '.env']
  const loadedVars: Record<string, string> = {}

  for (const envFile of envFiles) {
    const envPath = resolve(baseDir, envFile)

    if (await fs.pathExists(envPath)) {
      try {
        // Load .env file using dotenv and apply to process.env
        // override: false means existing process.env vars take precedence
        const result = config({ path: envPath, override: false })

        if (result.error) {
          console.warn(`Warning: Failed to load ${envFile}: ${result.error.message}`)
          continue
        }

        // Merge loaded variables into our return object
        if (result.parsed) {
          Object.assign(loadedVars, result.parsed)
        }
      } catch (error) {
        console.warn(
          `Warning: Error loading ${envFile}: ${error instanceof Error ? error.message : error}`
        )
      }
    }
  }

  // Store loaded vars globally for use by other modules
  setLoadedEnvVars(loadedVars)

  return loadedVars
}

/**
 * Merge environment variables from multiple sources
 * Priority order (highest to lowest): CLI env vars > Service env vars > .env file vars
 *
 * @param envVars Environment variables from .env files
 * @param serviceEnv Service-specific environment variables from config
 * @param cliEnvVars Environment variables from CLI (highest priority)
 * @returns Merged environment variables object
 */
export function mergeEnvVars(
  envVars: Record<string, string>,
  serviceEnv?: Record<string, string>,
  cliEnvVars?: Record<string, string>
): Record<string, string> {
  const merged = { ...envVars }

  // Service environment variables override .env file variables
  if (serviceEnv) {
    Object.assign(merged, serviceEnv)
  }

  // CLI environment variables override both .env and service variables (highest priority)
  if (cliEnvVars) {
    Object.assign(merged, cliEnvVars)
  }

  return merged
}
