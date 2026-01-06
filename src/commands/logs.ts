import chalk from 'chalk'
import fs from 'fs-extra'
import type { ServiceConfig } from '../types/config'
import { loadConfig } from '../utils/config-loader'
import { getContainerLogs, isContainerRunning, streamContainerLogs } from '../utils/docker'
import { findServiceByIdentifier, getServiceNotFoundError } from '../utils/service-finder'

interface LogsOptions {
  file: string
  serviceName?: string
  follow: boolean
  tail: number
}

export async function logsCommand(options: LogsOptions): Promise<void> {
  console.log(chalk.blue.bold('\n📋 Service Logs\n'))

  try {
    // Load configuration
    if (!(await fs.pathExists(options.file))) {
      throw new Error(`Configuration file not found: ${options.file}`)
    }

    console.log(chalk.cyan(`📄 Loading configuration from ${options.file}...`))
    const config = await loadConfig(options.file)
    console.log(chalk.green(`✅ Configuration loaded for project: ${config.project.name}\n`))

    // Determine which services to show logs for
    let servicesToLog: ServiceConfig[] = []

    if (options.serviceName) {
      const service = findServiceByIdentifier(config, options.serviceName)
      if (!service) {
        throw new Error(getServiceNotFoundError(options.serviceName, config))
      }
      servicesToLog = [service]
    } else {
      servicesToLog = config.services
    }

    // Filter to only Docker services (non-Docker services don't have container logs)
    const dockerServices = servicesToLog.filter((s) => s.docker)

    if (dockerServices.length === 0) {
      console.log(chalk.yellow('⚠️  No Docker services found to show logs for.'))
      if (servicesToLog.length > 0) {
        console.log(
          chalk.dim(
            '   Note: Logs are only available for Docker services. Non-Docker services need to be monitored separately.'
          )
        )
      }
      return
    }

    // Check which containers are running
    const runningServices: ServiceConfig[] = []
    const stoppedServices: ServiceConfig[] = []

    for (const service of dockerServices) {
      if (service.docker) {
        const isRunning = await isContainerRunning(service.docker.container)
        if (isRunning) {
          runningServices.push(service)
        } else {
          stoppedServices.push(service)
        }
      }
    }

    if (runningServices.length === 0) {
      console.log(chalk.yellow('⚠️  No running Docker containers found.'))
      if (stoppedServices.length > 0) {
        console.log(
          chalk.dim(`   Stopped services: ${stoppedServices.map((s) => s.name).join(', ')}`)
        )
      }
      return
    }

    // Show logs
    if (options.follow) {
      // Follow mode: stream logs for all running services
      console.log(
        chalk.cyan(
          `📺 Following logs for ${runningServices.length} service(s): ${runningServices
            .map((s) => s.name)
            .join(', ')}\n`
        )
      )
      console.log(chalk.dim('Press Ctrl+C to stop following logs\n'))

      // Set up signal handlers for graceful shutdown
      const cleanup = () => {
        console.log(chalk.dim('\n\nStopping log streams...'))
        process.exit(0)
      }

      process.on('SIGINT', cleanup)
      process.on('SIGTERM', cleanup)

      // For follow mode, we'll stream logs from all containers
      // We'll prefix each line with the service name
      const logPromises = runningServices.map(async (service) => {
        if (!service.docker) return

        try {
          await streamContainerLogs(service.docker.container, options.tail, (line: string) => {
            const serviceColor = getServiceColor(service.name)
            const serviceLabel = serviceColor(`[${service.name}]`)
            console.log(`${serviceLabel} ${chalk.dim(line)}`)
          })
        } catch (error) {
          // Don't log errors if process is being terminated
          if (process.listenerCount('SIGINT') > 0) {
            return
          }
          console.error(
            chalk.red(`❌ Error streaming logs for ${service.name}:`),
            error instanceof Error ? error.message : error
          )
        }
      })

      // Wait for all streams (they run until interrupted)
      try {
        await Promise.all(logPromises)
      } catch (error) {
        // Ignore errors during shutdown
        if (error instanceof Error && !error.message.includes('SIGINT')) {
          throw error
        }
      }
    } else {
      // Non-follow mode: show recent logs
      for (const service of runningServices) {
        if (!service.docker) continue

        console.log(chalk.cyan(`\n📋 Logs for service: ${service.name}`))
        console.log(chalk.dim(`   Container: ${service.docker.container}`))
        console.log(chalk.dim(`   Showing last ${options.tail} lines\n`))

        try {
          const logs = await getContainerLogs(service.docker.container, options.tail)
          if (logs.trim()) {
            const serviceColor = getServiceColor(service.name)
            const serviceLabel = serviceColor(`[${service.name}]`)
            const lines = logs.split('\n')
            for (const line of lines) {
              if (line.trim()) {
                console.log(`${serviceLabel} ${chalk.dim(line)}`)
              }
            }
          } else {
            console.log(chalk.dim('   (No logs available)'))
          }
        } catch (error) {
          console.error(
            chalk.red(`❌ Failed to get logs for ${service.name}:`),
            error instanceof Error ? error.message : error
          )
        }
      }

      if (stoppedServices.length > 0) {
        console.log(chalk.yellow(`\n⚠️  Stopped services (no logs available):`))
        for (const service of stoppedServices) {
          console.log(chalk.dim(`   - ${service.name}`))
        }
      }

      console.log()
    }
  } catch (error) {
    console.error(
      chalk.red('\n❌ Failed to show logs:'),
      error instanceof Error ? error.message : error
    )
    process.exit(1)
  }
}

/**
 * Get a consistent color function for a service name
 */
function getServiceColor(serviceName: string): typeof chalk.blue {
  // Use a simple hash to get consistent colors
  let hash = 0
  for (let i = 0; i < serviceName.length; i++) {
    hash = serviceName.charCodeAt(i) + ((hash << 5) - hash)
  }

  // Map to colors
  const colors = [chalk.blue, chalk.green, chalk.yellow, chalk.magenta, chalk.cyan, chalk.red]

  return colors[Math.abs(hash) % colors.length]
}
