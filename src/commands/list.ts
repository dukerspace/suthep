import chalk from 'chalk'
import fs from 'fs-extra'
import path from 'path'
import { loadConfig } from '../utils/config-loader'
import { isContainerRunning } from '../utils/docker'

interface ListOptions {
  file: string
}

interface ServiceStatus {
  name: string
  port: number
  domains: string[]
  hasDocker: boolean
  containerName?: string
  containerStatus: 'running' | 'stopped' | 'not-applicable'
  nginxStatus: 'enabled' | 'disabled' | 'not-configured'
  healthCheck?: {
    path: string
    interval: number
  }
}

export async function listCommand(options: ListOptions): Promise<void> {
  console.log(chalk.blue.bold('\n📋 Service Status\n'))

  try {
    // Load configuration
    if (!(await fs.pathExists(options.file))) {
      throw new Error(`Configuration file not found: ${options.file}`)
    }

    console.log(chalk.cyan(`📄 Loading configuration from ${options.file}...`))
    const config = await loadConfig(options.file)
    console.log(chalk.green(`✅ Configuration loaded for project: ${config.project.name}\n`))

    // Collect status for all services
    const serviceStatuses: ServiceStatus[] = []

    for (const service of config.services) {
      let containerStatus: 'running' | 'stopped' | 'not-applicable' = 'not-applicable'
      let nginxStatus: 'enabled' | 'disabled' | 'not-configured' = 'not-configured'

      // Check Docker container status
      if (service.docker) {
        try {
          const isRunning = await isContainerRunning(service.docker.container)
          containerStatus = isRunning ? 'running' : 'stopped'
        } catch (error) {
          // Container doesn't exist or error checking
          containerStatus = 'stopped'
        }
      }

      // Check Nginx configuration status
      // A service is considered enabled if at least one of its domains has an active Nginx config
      if (service.domains.length > 0) {
        let hasEnabledConfig = false
        for (const domain of service.domains) {
          const configName = domain.replace(/\./g, '_')
          const configPath = path.join(config.nginx.configPath, `${configName}.conf`)
          const enabledPath = path.join(
            config.nginx.configPath.replace('sites-available', 'sites-enabled'),
            `${configName}.conf`
          )

          try {
            // Check if config exists in sites-available
            const configFileExists = await fs.pathExists(configPath)
            // Check if symlink exists in sites-enabled
            const enabledFileExists = await fs.pathExists(enabledPath)

            if (configFileExists && enabledFileExists) {
              hasEnabledConfig = true
              break
            }
          } catch (error) {
            // Error checking, assume not configured
          }
        }

        nginxStatus = hasEnabledConfig ? 'enabled' : 'disabled'
      } else {
        nginxStatus = 'not-configured'
      }

      serviceStatuses.push({
        name: service.name,
        port: service.port,
        domains: service.domains,
        hasDocker: !!service.docker,
        containerName: service.docker?.container,
        containerStatus,
        nginxStatus,
        healthCheck: service.healthCheck,
      })
    }

    // Display services in a table format
    console.log(chalk.cyan('Services:\n'))

    // Table header
    console.log(
      chalk.bold(
        `${'#'.padEnd(4)} ${'Service'.padEnd(20)} ${'Status'.padEnd(12)} ${'Port'.padEnd(8)} ${'Container'.padEnd(20)} ${'Nginx'.padEnd(12)} ${'Domains'}`
      )
    )
    console.log(chalk.dim('-'.repeat(120)))

    // Table rows
    for (let i = 0; i < serviceStatuses.length; i++) {
      const status = serviceStatuses[i]
      const index = chalk.dim(`${i + 1}.`.padEnd(4))
      const serviceName = chalk.white(status.name.padEnd(20))
      const overallStatus = getOverallStatus(status)
      const statusDisplay = formatStatus(overallStatus).padEnd(12)
      const portDisplay = chalk.dim(String(status.port).padEnd(8))
      const containerDisplay = status.hasDocker
        ? formatContainerStatus(status.containerStatus, status.containerName || '').padEnd(20)
        : chalk.dim('N/A'.padEnd(20))
      const nginxDisplay = formatNginxStatus(status.nginxStatus).padEnd(12)
      const domainsDisplay = chalk.dim(status.domains.join(', ') || 'N/A')

      console.log(
        `${index} ${serviceName} ${statusDisplay} ${portDisplay} ${containerDisplay} ${nginxDisplay} ${domainsDisplay}`
      )
    }

    console.log()

    // Summary
    const runningCount = serviceStatuses.filter((s) => {
      if (s.hasDocker) {
        return s.containerStatus === 'running' && s.nginxStatus === 'enabled'
      } else {
        return s.nginxStatus === 'enabled'
      }
    }).length
    const stoppedCount = serviceStatuses.filter((s) => {
      if (s.hasDocker) {
        return s.containerStatus === 'stopped' || s.nginxStatus === 'disabled'
      } else {
        return s.nginxStatus === 'disabled' || s.nginxStatus === 'not-configured'
      }
    }).length
    const totalCount = serviceStatuses.length

    console.log(chalk.cyan('Summary:'))
    console.log(chalk.green(`  ✅ Running: ${runningCount}`))
    console.log(chalk.red(`  ❌ Stopped: ${stoppedCount}`))
    console.log(chalk.dim(`  📊 Total: ${totalCount}`))
    console.log()
  } catch (error) {
    console.error(
      chalk.red('\n❌ Failed to list services:'),
      error instanceof Error ? error.message : error
    )
    process.exit(1)
  }
}

function getOverallStatus(status: ServiceStatus): 'running' | 'stopped' | 'partial' {
  if (status.hasDocker) {
    // For Docker services, status depends on container
    if (status.containerStatus === 'running' && status.nginxStatus === 'enabled') {
      return 'running'
    } else if (status.containerStatus === 'stopped' && status.nginxStatus === 'disabled') {
      return 'stopped'
    } else {
      return 'partial' // Container running but Nginx disabled, or vice versa
    }
  } else {
    // For non-Docker services, status depends on Nginx
    if (status.nginxStatus === 'enabled') {
      return 'running'
    } else {
      return 'stopped'
    }
  }
}

function formatStatus(status: 'running' | 'stopped' | 'partial'): string {
  switch (status) {
    case 'running':
      return chalk.green('● Running')
    case 'stopped':
      return chalk.red('○ Stopped')
    case 'partial':
      return chalk.yellow('⚠ Partial')
    default:
      return chalk.dim('? Unknown')
  }
}

function formatContainerStatus(
  status: 'running' | 'stopped' | 'not-applicable',
  containerName: string
): string {
  switch (status) {
    case 'running':
      return chalk.green(containerName)
    case 'stopped':
      return chalk.red(containerName)
    case 'not-applicable':
      return chalk.dim('N/A')
    default:
      return chalk.dim('?')
  }
}

function formatNginxStatus(status: 'enabled' | 'disabled' | 'not-configured'): string {
  switch (status) {
    case 'enabled':
      return chalk.green('Enabled')
    case 'disabled':
      return chalk.red('Disabled')
    case 'not-configured':
      return chalk.dim('N/A')
    default:
      return chalk.dim('?')
  }
}

