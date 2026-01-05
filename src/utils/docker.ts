import chalk from 'chalk'
import { execa } from 'execa'
import type { ServiceConfig } from '../types/config'
import { getLoadedEnvVars, mergeEnvVars } from './env-loader'

/**
 * Interface for zero-downtime deployment container info
 */
export interface ZeroDowntimeContainerInfo {
  tempContainerName: string
  tempPort: number
  oldContainerExists: boolean
}

/**
 * Helper function to add environment variables to Docker run arguments
 * Ensures consistent env var handling across all container creation functions
 */
function addEnvVarsToDockerArgs(
  args: string[],
  service: ServiceConfig,
  cliEnvVars?: Record<string, string>
): void {
  // Merge environment variables (priority: CLI > Service > .env files)
  const envVars = mergeEnvVars(getLoadedEnvVars(), service.environment, cliEnvVars)
  if (Object.keys(envVars).length > 0) {
    for (const [key, value] of Object.entries(envVars)) {
      args.push('-e', `${key}=${value}`)
    }
  }
}

/**
 * Start a new container on a temporary port for zero-downtime deployment
 * Returns information about the temporary container
 */
export async function startDockerContainerZeroDowntime(
  service: ServiceConfig,
  cliEnvVars?: Record<string, string>
): Promise<ZeroDowntimeContainerInfo | null> {
  if (!service.docker) {
    return null
  }

  const { image, container, port } = service.docker

  if (!image) {
    throw new Error(
      `Image is required for zero-downtime deployment. Please specify an "image" field in the docker configuration for service "${service.name}".`
    )
  }

  try {
    // Check if old container exists
    let oldContainerExists = false
    let oldContainerRunning = false
    try {
      const { stdout } = await execa('docker', ['inspect', '--type', 'container', container], {
        stderr: 'pipe',
      })
      oldContainerExists = true

      try {
        const containerInfo = JSON.parse(stdout)
        if (containerInfo && containerInfo[0]) {
          oldContainerRunning = containerInfo[0].State?.Running || false
          console.log(
            chalk.dim(
              `  📋 Existing container "${container}" found (running: ${oldContainerRunning})`
            )
          )
        }
      } catch (parseError) {
        // If we can't parse, that's okay - we know the container exists
      }
    } catch (error: any) {
      // Container doesn't exist - this is a fresh deployment
      oldContainerExists = false
      console.log(chalk.dim(`  📋 No existing container found, performing fresh deployment`))
    }

    // For zero-downtime, we need a temporary port and container name
    const tempPort = oldContainerExists ? service.port + 10000 : service.port
    const tempContainerName = oldContainerExists ? `${container}-new` : container

    // Check if temp container already exists (from a failed previous deployment)
    try {
      await execa('docker', ['inspect', '--type', 'container', tempContainerName], {
        stderr: 'pipe',
      })
      // Temp container exists, remove it
      console.log(chalk.yellow(`  🧹 Cleaning up previous temporary container...`))
      await execa('docker', ['rm', '-f', tempContainerName])
    } catch (error) {
      // Temp container doesn't exist, which is fine
    }

    // Check if temp port is available
    if (oldContainerExists) {
      try {
        const { stdout: portCheck } = await execa('docker', ['ps', '--format', '{{.Ports}}'])
        const portPattern = new RegExp(`:${tempPort}->`, 'g')
        if (portCheck && portPattern.test(portCheck)) {
          throw new Error(
            `Temporary port ${tempPort} is already in use. Please ensure no other containers are using ports in the range ${service.port}-${tempPort}.`
          )
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('Temporary port')) {
          throw error
        }
      }
    }

    // Pull the latest image
    try {
      console.log(chalk.dim(`  📥 Pulling latest image: ${image}...`))
      await execa('docker', ['pull', image])
      console.log(chalk.green(`  ✅ Image pulled successfully: ${image}`))
    } catch (error: any) {
      const errorDetails = error?.stderr || error?.message || 'Unknown error'
      console.log(
        chalk.yellow(`  ⚠️  Failed to pull image ${image}, using existing local image if available`)
      )
      console.log(chalk.dim(`     Error: ${errorDetails}`))
    }

    // Create Docker port binding
    const args = [
      'run',
      '-d',
      '--name',
      tempContainerName,
      '-p',
      `${tempPort}:${port}`, // Port binding: host:container
      '--restart',
      'unless-stopped',
    ]

    // Add environment variables (merge .env vars, service-specific env vars, and CLI env vars)
    addEnvVarsToDockerArgs(args, service, cliEnvVars)

    args.push(image)

    try {
      await execa('docker', args)
      if (oldContainerExists) {
        console.log(
          chalk.green(
            `  ✅ Created new container "${tempContainerName}" on temporary port ${tempPort}`
          )
        )
      } else {
        console.log(chalk.green(`  ✅ Created and started container: ${tempContainerName}`))
      }
    } catch (error: any) {
      const errorMessage = error?.message || String(error) || 'Unknown error'
      const errorStderr = error?.stderr || ''
      const errorStdout = error?.stdout || ''

      const fullError = [errorMessage, errorStderr, errorStdout]
        .filter(Boolean)
        .join('\n')
        .toLowerCase()

      if (
        fullError.includes('port is already allocated') ||
        fullError.includes('bind: address already in use')
      ) {
        throw new Error(
          `Port ${tempPort} is already in use. Please ensure the port is available for zero-downtime deployment.`
        )
      }

      if (
        fullError.includes('container name is already in use') ||
        fullError.includes('is already in use')
      ) {
        throw new Error(
          `Container name "${tempContainerName}" is already in use. Please remove it manually and try again.`
        )
      }

      const details = errorStderr || errorStdout || errorMessage
      throw new Error(`Failed to create Docker container "${tempContainerName}": ${details}`)
    }

    return {
      tempContainerName,
      tempPort,
      oldContainerExists,
    }
  } catch (error: any) {
    if (error instanceof Error && error.message) {
      throw new Error(
        `Failed to start Docker container for zero-downtime deployment of service "${service.name}": ${error.message}`
      )
    }

    const errorDetails =
      error?.message || error?.stderr || error?.stdout || String(error) || 'Unknown error'
    throw new Error(
      `Failed to start Docker container for zero-downtime deployment of service "${service.name}": ${errorDetails}`
    )
  }
}

/**
 * Swap containers for zero-downtime deployment
 * Stops old container and creates new container on original port
 * Note: Temp container cleanup should happen after nginx is updated to original port
 */
export async function swapContainersForZeroDowntime(
  service: ServiceConfig,
  tempInfo: ZeroDowntimeContainerInfo,
  cliEnvVars?: Record<string, string>
): Promise<void> {
  if (!service.docker) {
    return
  }

  const { container, image, port } = service.docker

  if (!image) {
    throw new Error(`Image is required for container swap. Service: ${service.name}`)
  }

  try {
    // Step 1: Stop and remove old container (nginx still pointing to temp port, so no downtime)
    if (tempInfo.oldContainerExists) {
      console.log(chalk.cyan(`  🔄 Stopping old container "${container}"...`))
      try {
        await execa('docker', ['stop', container])
        console.log(chalk.green(`  ✅ Stopped old container: ${container}`))
      } catch (error: any) {
        const errorDetails = error?.stderr || error?.message || 'Unknown error'
        // If container is already stopped, that's fine
        if (!errorDetails.toLowerCase().includes('already stopped')) {
          console.log(chalk.yellow(`  ⚠️  Could not stop old container: ${errorDetails}`))
        }
      }

      try {
        await execa('docker', ['rm', container])
        console.log(chalk.green(`  ✅ Removed old container: ${container}`))
      } catch (error: any) {
        const errorDetails = error?.stderr || error?.message || 'Unknown error'
        // If container doesn't exist, that's fine
        if (
          !errorDetails.toLowerCase().includes('no such container') &&
          !errorDetails.toLowerCase().includes('container not found')
        ) {
          console.log(chalk.yellow(`  ⚠️  Could not remove old container: ${errorDetails}`))
        }
      }

      // Step 2: Create new container on original port (temp container still running on temp port)
      console.log(chalk.cyan(`  🔄 Creating new container on production port...`))

      const args = [
        'run',
        '-d',
        '--name',
        container,
        '-p',
        `${service.port}:${port}`,
        '--restart',
        'unless-stopped',
      ]

      // Add environment variables (merge .env vars, service-specific env vars, and CLI env vars)
      addEnvVarsToDockerArgs(args, service, cliEnvVars)

      args.push(image)

      try {
        await execa('docker', args)
        console.log(
          chalk.green(
            `  ✅ Created new container "${container}" on production port ${service.port}`
          )
        )
      } catch (error: any) {
        const errorDetails = error?.stderr || error?.message || String(error) || 'Unknown error'
        throw new Error(`Failed to create final container "${container}": ${errorDetails}`)
      }
    }
  } catch (error: any) {
    const errorDetails = error?.stderr || error?.message || String(error) || 'Unknown error'
    throw new Error(`Failed to swap containers for zero-downtime deployment: ${errorDetails}`)
  }
}

/**
 * Clean up temporary container after zero-downtime deployment
 * Should be called after nginx has been updated to point to the new container
 */
export async function cleanupTempContainer(tempContainerName: string): Promise<void> {
  try {
    console.log(chalk.cyan(`  🧹 Cleaning up temporary container "${tempContainerName}"...`))

    // Stop temp container
    try {
      await execa('docker', ['stop', tempContainerName])
    } catch (error: any) {
      const errorDetails = error?.stderr || error?.message || 'Unknown error'
      // If already stopped, that's fine
      if (!errorDetails.toLowerCase().includes('already stopped')) {
        console.log(chalk.yellow(`  ⚠️  Could not stop temp container: ${errorDetails}`))
      }
    }

    // Remove temp container
    try {
      await execa('docker', ['rm', tempContainerName])
      console.log(chalk.green(`  ✅ Removed temporary container: ${tempContainerName}`))
    } catch (error: any) {
      const errorDetails = error?.stderr || error?.message || 'Unknown error'
      // If doesn't exist, that's fine
      if (
        !errorDetails.toLowerCase().includes('no such container') &&
        !errorDetails.toLowerCase().includes('container not found')
      ) {
        console.log(chalk.yellow(`  ⚠️  Could not remove temp container: ${errorDetails}`))
      }
    }
  } catch (error: any) {
    const errorDetails = error?.stderr || error?.message || String(error) || 'Unknown error'
    console.log(chalk.yellow(`  ⚠️  Error during temp container cleanup: ${errorDetails}`))
    // Don't throw - cleanup failures shouldn't fail the deployment
  }
}

/**
 * Start or connect to a Docker container for a service
 * For zero-downtime deployments, use startDockerContainerZeroDowntime instead
 */
export async function startDockerContainer(
  service: ServiceConfig,
  cliEnvVars?: Record<string, string>
): Promise<void> {
  if (!service.docker) {
    return
  }

  const { image, container, port } = service.docker

  try {
    // Check if container exists using docker inspect (exact name match)
    let containerExists = false
    let containerState = ''
    try {
      const { stdout } = await execa('docker', ['inspect', '--type', 'container', container], {
        stderr: 'pipe',
      })
      containerExists = true

      // Parse container state from inspect output
      try {
        const containerInfo = JSON.parse(stdout)
        if (containerInfo && containerInfo[0]) {
          containerState = containerInfo[0].State?.Status || 'unknown'
          const isRunning = containerInfo[0].State?.Running || false
          console.log(
            chalk.dim(
              `  📋 Container "${container}" exists (state: ${containerState}, running: ${isRunning})`
            )
          )
        }
      } catch (parseError) {
        // If we can't parse, that's okay - we know the container exists
      }
    } catch (error: any) {
      // Container doesn't exist - this is expected for new deployments
      containerExists = false
      const errorMessage = error?.stderr || error?.message || ''
      if (
        errorMessage.includes('No such container') ||
        errorMessage.includes('Error: No such object')
      ) {
        console.log(chalk.dim(`  📋 Container "${container}" does not exist, will create new one`))
      }
    }

    let shouldCreateNewContainer = true

    if (containerExists) {
      // Container exists - always remove and recreate for fresh deployment
      if (!image) {
        throw new Error(
          `Container "${container}" exists and needs to be recreated for redeployment. ` +
            `No image specified in configuration for service "${service.name}". ` +
            `Please add an "image" field to the docker configuration to allow container recreation.`
        )
      }

      // Always recreate container on redeploy to ensure fresh deployment
      console.log(
        chalk.yellow(`  🔄 Removing existing container "${container}" for redeployment...`)
      )

      // Stop and remove old container (force remove will stop if running)
      try {
        await execa('docker', ['rm', '-f', container])
        console.log(chalk.green(`  ✅ Removed existing container: ${container}`))

        // Verify container was actually removed
        try {
          await execa('docker', ['inspect', '--type', 'container', container], {
            stdout: 'ignore',
            stderr: 'ignore',
          })
          // If we get here, container still exists - this shouldn't happen
          throw new Error(
            `Container "${container}" was not properly removed. Please remove it manually and try again.`
          )
        } catch (verifyError: any) {
          // Container doesn't exist anymore - this is what we want
          const verifyMessage = verifyError?.stderr || verifyError?.message || ''
          if (
            verifyMessage.includes('No such container') ||
            verifyMessage.includes('Error: No such object')
          ) {
            console.log(chalk.dim(`  ✓ Verified container "${container}" was removed`))
          }
        }
      } catch (error: any) {
        const errorDetails = error?.stderr || error?.message || String(error) || 'Unknown error'
        // If container doesn't exist, that's okay - it might have been removed already
        if (
          errorDetails.toLowerCase().includes('no such container') ||
          errorDetails.toLowerCase().includes('container not found')
        ) {
          console.log(chalk.yellow(`  ⚠️  Container "${container}" was already removed`))
        } else {
          throw new Error(
            `Failed to remove old container "${container}" for service "${service.name}": ${errorDetails}`
          )
        }
      }
      // Will create new container below with fresh image
    }

    // Create new container (either doesn't exist, or was recreated above)
    if (shouldCreateNewContainer && image) {
      // Pull the latest image before creating container
      try {
        console.log(chalk.dim(`  📥 Pulling latest image: ${image}...`))
        await execa('docker', ['pull', image])
        console.log(chalk.green(`  ✅ Image pulled successfully: ${image}`))
      } catch (error: any) {
        // If pull fails, log warning but continue (image might be local or pull might fail)
        const errorDetails = error?.stderr || error?.message || 'Unknown error'
        console.log(
          chalk.yellow(
            `  ⚠️  Failed to pull image ${image}, using existing local image if available`
          )
        )
        console.log(chalk.dim(`     Error: ${errorDetails}`))
      }

      // Container doesn't exist and image is provided, create and run it
      // First check if the host port is already in use
      try {
        const { stdout: portCheck } = await execa('docker', ['ps', '--format', '{{.Ports}}'])

        // Check if port is already mapped
        const portPattern = new RegExp(`:${service.port}->`, 'g')
        if (portCheck && portPattern.test(portCheck)) {
          throw new Error(
            `Port ${service.port} is already in use by another container. Please use a different port for service "${service.name}".`
          )
        }
      } catch (error) {
        // If docker ps fails or port check fails, we'll let docker run handle it
        // But if it's our custom error, rethrow it
        if (error instanceof Error && error.message.includes('Port')) {
          throw error
        }
      }

      // Create Docker port binding: hostPort:containerPort
      // service.port = host port (accessible from host machine)
      // port = container port (what the app listens on inside container)
      // Format: -p hostPort:containerPort
      const args = [
        'run',
        '-d',
        '--name',
        container,
        '-p',
        `${service.port}:${port}`, // Port binding: host:container
        '--restart',
        'unless-stopped',
      ]

      // Add environment variables (merge .env vars, service-specific env vars, and CLI env vars)
      addEnvVarsToDockerArgs(args, service, cliEnvVars)

      args.push(image)

      try {
        await execa('docker', args)
        console.log(chalk.green(`  ✅ Created and started container: ${container}`))
      } catch (error: any) {
        // Extract error details from execa error
        const errorMessage = error?.message || String(error) || 'Unknown error'
        const errorStderr = error?.stderr || ''
        const errorStdout = error?.stdout || ''

        const fullError = [errorMessage, errorStderr, errorStdout]
          .filter(Boolean)
          .join('\n')
          .toLowerCase()

        // Check if error is due to port binding
        if (
          fullError.includes('port is already allocated') ||
          fullError.includes('bind: address already in use') ||
          fullError.includes('port already in use') ||
          fullError.includes('port is already in use')
        ) {
          throw new Error(
            `Port ${service.port} is already in use. Please use a different port for service "${service.name}".`
          )
        }

        // Check if error is due to container name already in use
        if (
          fullError.includes('container name is already in use') ||
          fullError.includes('is already in use')
        ) {
          throw new Error(
            `Container name "${container}" is already in use. This might happen if the container was created between checks. ` +
              `Please remove the container manually or wait a moment and try again.`
          )
        }

        // Check if error is due to image not found
        if (
          fullError.includes('no such image') ||
          fullError.includes('pull access denied') ||
          fullError.includes('repository does not exist')
        ) {
          throw new Error(
            `Docker image "${image}" not found or cannot be accessed. ` +
              `Please verify the image name and ensure you have access to pull it.`
          )
        }

        // Generic error with more details
        const details = errorStderr || errorStdout || errorMessage
        throw new Error(`Failed to create Docker container "${container}": ${details}`)
      }
    } else if (shouldCreateNewContainer && !image) {
      // Only throw error if we need to create a container but no image is provided
      throw new Error(
        `Container "${container}" does not exist and no image specified in configuration. ` +
          `Please either:\n` +
          `  1. Add an "image" field to the docker configuration for service "${service.name}", or\n` +
          `  2. Create the container "${container}" manually before deploying.`
      )
    }
    // If shouldCreateNewContainer is false, it means we successfully handled an existing container
  } catch (error: any) {
    // If error is already a well-formed Error with a message, preserve it
    if (error instanceof Error && error.message) {
      // Check if the error message already includes context about the container/service
      if (error.message.includes(container) || error.message.includes(service.name)) {
        throw error
      }
      // Otherwise, wrap with more context
      throw new Error(
        `Failed to start Docker container "${container}" for service "${service.name}": ${error.message}`
      )
    }

    // Handle non-Error objects or errors without messages
    const errorDetails =
      error?.message || error?.stderr || error?.stdout || String(error) || 'Unknown error'
    throw new Error(
      `Failed to start Docker container "${container}" for service "${service.name}": ${errorDetails}`
    )
  }
}

/**
 * Stop a Docker container
 */
export async function stopDockerContainer(containerName: string): Promise<void> {
  try {
    await execa('docker', ['stop', containerName])
  } catch (error) {
    throw new Error(
      `Failed to stop container ${containerName}: ${error instanceof Error ? error.message : error}`
    )
  }
}

/**
 * Remove a Docker container
 */
export async function removeDockerContainer(containerName: string): Promise<void> {
  try {
    await execa('docker', ['rm', '-f', containerName])
  } catch (error) {
    throw new Error(
      `Failed to remove container ${containerName}: ${
        error instanceof Error ? error.message : error
      }`
    )
  }
}

/**
 * Check if a Docker container is running
 */
export async function isContainerRunning(containerName: string): Promise<boolean> {
  try {
    const { stdout } = await execa('docker', [
      'ps',
      '--filter',
      `name=${containerName}`,
      '--format',
      '{{.Names}}',
    ])
    return stdout.includes(containerName)
  } catch (error) {
    return false
  }
}

/**
 * Get container logs
 */
export async function getContainerLogs(
  containerName: string,
  lines: number = 100
): Promise<string> {
  try {
    const { stdout } = await execa('docker', ['logs', '--tail', lines.toString(), containerName])
    return stdout
  } catch (error) {
    throw new Error(
      `Failed to get logs for container ${containerName}: ${
        error instanceof Error ? error.message : error
      }`
    )
  }
}

/**
 * Inspect a Docker container
 */
export async function inspectContainer(containerName: string): Promise<any> {
  try {
    const { stdout } = await execa('docker', ['inspect', containerName])
    return JSON.parse(stdout)[0]
  } catch (error) {
    throw new Error(
      `Failed to inspect container ${containerName}: ${
        error instanceof Error ? error.message : error
      }`
    )
  }
}

/**
 * Get the port mapping for an existing container
 * Returns the port mapping in format "hostPort:containerPort" or null if not found
 */
export async function getContainerPortMapping(containerName: string): Promise<string | null> {
  try {
    const containerInfo = await inspectContainer(containerName)
    const portBindings = containerInfo.NetworkSettings?.Ports

    if (!portBindings) {
      return null
    }

    // Find the first port binding
    for (const [containerPort, hostBindings] of Object.entries(portBindings)) {
      if (hostBindings && Array.isArray(hostBindings) && hostBindings.length > 0) {
        const hostPort = hostBindings[0].HostPort
        // Remove /tcp or /udp suffix from container port
        const cleanContainerPort = containerPort.replace(/\/.*$/, '')
        return `${hostPort}:${cleanContainerPort}`
      }
    }

    return null
  } catch (error) {
    return null
  }
}

/**
 * Check if container needs to be recreated based on configuration changes
 */
export async function needsRecreate(
  service: ServiceConfig,
  containerName: string
): Promise<boolean> {
  if (!service.docker) {
    return false
  }

  const expectedPortMapping = `${service.port}:${service.docker.port}`
  const currentPortMapping = await getContainerPortMapping(containerName)

  // If port mapping is different, need to recreate
  if (currentPortMapping !== expectedPortMapping) {
    return true
  }

  // Check if image is different (if image is specified in config)
  if (service.docker.image) {
    try {
      const containerInfo = await inspectContainer(containerName)
      const currentImage = containerInfo.Config?.Image

      if (currentImage && currentImage !== service.docker.image) {
        return true
      }
    } catch (error) {
      // If we can't check, assume no recreation needed
    }
  }

  // Check if environment variables have changed
  if (service.environment) {
    try {
      const containerInfo = await inspectContainer(containerName)
      const currentEnv = containerInfo.Config?.Env || []

      // Convert current env array to object
      const currentEnvObj: Record<string, string> = {}
      for (const envVar of currentEnv) {
        const [key, ...valueParts] = envVar.split('=')
        if (key) {
          currentEnvObj[key] = valueParts.join('=')
        }
      }

      // Compare with expected environment variables
      for (const [key, value] of Object.entries(service.environment)) {
        if (currentEnvObj[key] !== value) {
          return true // Environment variable changed, need to recreate
        }
      }

      // Check if any environment variables were removed
      for (const key of Object.keys(currentEnvObj)) {
        // Skip PATH and other system variables
        if (key === 'PATH' || key === 'HOSTNAME' || key.startsWith('_')) {
          continue
        }
        // If a variable exists in container but not in config, and it was explicitly set before
        // we'll recreate to ensure consistency (this is a conservative approach)
        // For now, we only check if config vars match, not if extra vars exist
      }
    } catch (error) {
      // If we can't check, assume no recreation needed
    }
  }

  return false
}
