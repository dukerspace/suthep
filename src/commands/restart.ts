import chalk from 'chalk'
import fs from 'fs-extra'
import type { ServiceConfig } from '../types/config'
import { loadConfig } from '../utils/config-loader'
import {
  findServiceByIdentifier,
  getServiceNotFoundError,
} from '../utils/service-finder'
import { waitForService } from '../utils/deployment'
import {
  isContainerRunning,
  startDockerContainer,
  stopDockerContainer,
} from '../utils/docker'
import {
  enableSite,
  generateMultiServiceNginxConfig,
  generateNginxConfig,
  reloadNginx,
  writeNginxConfig,
} from '../utils/nginx'

interface RestartOptions {
  file: string
  all: boolean
  serviceName?: string
  https: boolean
  nginx: boolean
}

export async function restartCommand(options: RestartOptions): Promise<void> {
  console.log(chalk.blue.bold('\n🔄 Restarting Services\n'))

  try {
    // Load configuration
    if (!(await fs.pathExists(options.file))) {
      throw new Error(`Configuration file not found: ${options.file}`)
    }

    console.log(chalk.cyan(`📄 Loading configuration from ${options.file}...`))
    const config = await loadConfig(options.file)

    console.log(chalk.green(`✅ Configuration loaded for project: ${config.project.name}`))

    // Determine which services to restart
    let servicesToRestart: ServiceConfig[] = []

    if (options.all) {
      servicesToRestart = config.services
      console.log(
        chalk.cyan(
          `📋 Restarting all services: ${servicesToRestart.map((s) => s.name).join(', ')}\n`
        )
      )
    } else if (options.serviceName) {
      const service = findServiceByIdentifier(config, options.serviceName)
      if (!service) {
        throw new Error(getServiceNotFoundError(options.serviceName, config))
      }
      servicesToRestart = [service]
      console.log(chalk.cyan(`📋 Restarting service: ${service.name}\n`))
    } else {
      throw new Error('Either specify a service name/index or use --all flag')
    }

    // Group services by domain for nginx config management
    const allDomains = new Set<string>()

    for (const service of servicesToRestart) {
      for (const domain of service.domains) {
        allDomains.add(domain)
      }
    }

    // Restart Docker containers
    for (const service of servicesToRestart) {
      if (service.docker) {
        console.log(chalk.cyan(`\n🐳 Restarting Docker container for service: ${service.name}`))
        const containerName = service.docker.container

        // Stop container if running
        try {
          const isRunning = await isContainerRunning(containerName)
          if (isRunning) {
            await stopDockerContainer(containerName)
            console.log(chalk.green(`  ✅ Stopped container: ${containerName}`))
          } else {
            console.log(chalk.yellow(`  ⚠️  Container ${containerName} is not running`))
          }
        } catch (error: any) {
          const errorMessage = error?.message || String(error) || 'Unknown error'
          if (
            errorMessage.toLowerCase().includes('no such container') ||
            errorMessage.toLowerCase().includes('container not found')
          ) {
            console.log(
              chalk.yellow(`  ⚠️  Container ${containerName} not found (will create new one)`)
            )
          } else {
            console.error(
              chalk.red(`  ❌ Failed to stop container ${containerName}:`),
              errorMessage
            )
            throw error
          }
        }

        // Start container
        try {
          await startDockerContainer(service)
          console.log(chalk.green(`  ✅ Started container: ${containerName}`))
        } catch (error) {
          console.error(
            chalk.red(`  ❌ Failed to start container for service ${service.name}:`),
            error instanceof Error ? error.message : error
          )
          throw error
        }
      }
    }

    // Wait for services to be healthy
    for (const service of servicesToRestart) {
      if (service.healthCheck) {
        console.log(chalk.cyan(`\n🏥 Waiting for service ${service.name} to be healthy...`))
        const isHealthy = await waitForService(service, config.deployment.healthCheckTimeout)
        if (isHealthy) {
          console.log(chalk.green(`  ✅ Service ${service.name} is healthy`))
        } else {
          console.log(
            chalk.yellow(`  ⚠️  Service ${service.name} health check timeout, continuing anyway...`)
          )
        }
      }
    }

    // Configure Nginx
    if (options.nginx && allDomains.size > 0) {
      console.log(chalk.cyan(`\n⚙️  Updating Nginx reverse proxy configurations...`))

      // Create a set of service names being restarted for quick lookup
      const servicesBeingRestarted = new Set(servicesToRestart.map((s) => s.name))

      // For each domain, find all services that use it (from all config services)
      // and include all active services (both newly restarted and already running)
      for (const domain of allDomains) {
        const configName = domain.replace(/\./g, '_')

        // Find all services that use this domain (from entire config)
        const allServicesForDomain = config.services.filter((s) => s.domains.includes(domain))

        // Check which services are actually running (have active containers)
        const activeServices: ServiceConfig[] = []
        for (const service of allServicesForDomain) {
          if (service.docker) {
            const isRunning = await isContainerRunning(service.docker.container)
            if (isRunning) {
              activeServices.push(service)
            }
          } else {
            // Service without docker - include if it's being restarted or assume it's running
            if (servicesBeingRestarted.has(service.name)) {
              activeServices.push(service)
            } else {
              // For non-docker services, assume they're running if not explicitly being restarted
              activeServices.push(service)
            }
          }
        }

        if (activeServices.length === 0) {
          console.log(
            chalk.yellow(`  ⚠️  No active services found for ${domain}, skipping Nginx config`)
          )
          continue
        }

        try {
          // Log domain and services configuration
          if (activeServices.length > 1) {
            console.log(
              chalk.cyan(
                `  📋 Configuring ${domain} with ${
                  activeServices.length
                } active service(s): ${activeServices.map((s) => s.name).join(', ')}`
              )
            )
          } else {
            console.log(
              chalk.cyan(`  📋 Configuring ${domain} for service: ${activeServices[0].name}`)
            )
          }

          // Generate Nginx config for all active services on this domain
          let nginxConfigContent: string
          if (activeServices.length === 1) {
            nginxConfigContent = generateNginxConfig(activeServices[0], false)
          } else {
            nginxConfigContent = generateMultiServiceNginxConfig(activeServices, domain, false)
          }

          // Write config file
          await writeNginxConfig(configName, config.nginx.configPath, nginxConfigContent)
          await enableSite(configName, config.nginx.configPath)

          console.log(chalk.green(`  ✅ Nginx configured for ${domain}`))
        } catch (error) {
          console.error(
            chalk.red(`  ❌ Failed to configure Nginx for ${domain}:`),
            error instanceof Error ? error.message : error
          )
          throw error
        }
      }

      // Update with HTTPS if enabled
      if (options.https) {
        console.log(chalk.cyan(`\n🔄 Updating Nginx configs with HTTPS...`))
        for (const domain of allDomains) {
          const configName = domain.replace(/\./g, '_')

          // Find all active services for this domain again
          const allServicesForDomain = config.services.filter((s) => s.domains.includes(domain))
          const activeServices: ServiceConfig[] = []
          for (const service of allServicesForDomain) {
            if (service.docker) {
              const isRunning = await isContainerRunning(service.docker.container)
              if (isRunning) {
                activeServices.push(service)
              }
            } else {
              if (servicesBeingRestarted.has(service.name)) {
                activeServices.push(service)
              } else {
                activeServices.push(service)
              }
            }
          }

          if (activeServices.length === 0) {
            continue
          }

          try {
            let nginxConfigContent: string
            if (activeServices.length === 1) {
              nginxConfigContent = generateNginxConfig(activeServices[0], true)
            } else {
              nginxConfigContent = generateMultiServiceNginxConfig(activeServices, domain, true)
            }
            await writeNginxConfig(configName, config.nginx.configPath, nginxConfigContent)
            console.log(chalk.green(`  ✅ HTTPS config updated for ${domain}`))
          } catch (error) {
            console.error(
              chalk.red(`  ❌ Failed to update HTTPS config for ${domain}:`),
              error instanceof Error ? error.message : error
            )
            throw error
          }
        }
      }

      // Reload Nginx
      console.log(chalk.cyan(`\n🔄 Reloading Nginx...`))
      try {
        await reloadNginx(config.nginx.reloadCommand)
        console.log(chalk.green(`  ✅ Nginx reloaded`))
      } catch (error) {
        console.error(
          chalk.red(`  ❌ Failed to reload Nginx:`),
          error instanceof Error ? error.message : error
        )
        throw error
      }
    }

    console.log(chalk.green.bold('\n✅ Services restarted successfully!\n'))

    // Print service URLs
    if (allDomains.size > 0) {
      console.log(chalk.cyan('📋 Service URLs:'))
      for (const service of servicesToRestart) {
        for (const domain of service.domains) {
          const protocol = options.https ? 'https' : 'http'
          const servicePath = service.path || '/'
          const fullPath = servicePath === '/' ? '' : servicePath
          console.log(chalk.dim(`   ${service.name}: ${protocol}://${domain}${fullPath}`))
        }
      }
      console.log()
    }
  } catch (error) {
    console.error(
      chalk.red('\n❌ Failed to restart services:'),
      error instanceof Error ? error.message : error
    )
    process.exit(1)
  }
}

