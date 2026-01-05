import chalk from 'chalk'
import fs from 'fs-extra'
import type { ServiceConfig } from '../types/config'
import { loadConfig } from '../utils/config-loader'
import { isContainerRunning, removeDockerContainer, stopDockerContainer } from '../utils/docker'
import {
  disableSite,
  enableSite,
  generateMultiServiceNginxConfig,
  generateNginxConfig,
  reloadNginx,
  writeNginxConfig,
} from '../utils/nginx'

interface DownOptions {
  file: string
  all: boolean
  serviceName?: string
}

export async function downCommand(options: DownOptions): Promise<void> {
  console.log(chalk.blue.bold('\n🛑 Bringing Down Services\n'))

  try {
    // Load configuration
    if (!(await fs.pathExists(options.file))) {
      throw new Error(`Configuration file not found: ${options.file}`)
    }

    console.log(chalk.cyan(`📄 Loading configuration from ${options.file}...`))
    const config = await loadConfig(options.file)

    console.log(chalk.green(`✅ Configuration loaded for project: ${config.project.name}`))

    // Determine which services to bring down
    let servicesToDown: ServiceConfig[] = []

    if (options.all) {
      servicesToDown = config.services
      console.log(
        chalk.cyan(
          `📋 Bringing down all services: ${servicesToDown.map((s) => s.name).join(', ')}\n`
        )
      )
    } else if (options.serviceName) {
      const service = config.services.find((s) => s.name === options.serviceName)
      if (!service) {
        throw new Error(
          `Service "${
            options.serviceName
          }" not found in configuration. Available services: ${config.services
            .map((s) => s.name)
            .join(', ')}`
        )
      }
      servicesToDown = [service]
      console.log(chalk.cyan(`📋 Bringing down service: ${options.serviceName}\n`))
    } else {
      throw new Error('Either specify a service name or use --all flag')
    }

    // Group services by domain for nginx config management
    const domainToServices = new Map<string, ServiceConfig[]>()
    const allDomains = new Set<string>()

    for (const service of servicesToDown) {
      for (const domain of service.domains) {
        allDomains.add(domain)
        if (!domainToServices.has(domain)) {
          domainToServices.set(domain, [])
        }
        domainToServices.get(domain)!.push(service)
      }
    }

    // Stop and remove Docker containers
    for (const service of servicesToDown) {
      if (service.docker) {
        console.log(chalk.cyan(`\n🐳 Stopping Docker container for service: ${service.name}`))
        try {
          const containerName = service.docker.container

          // Stop container
          try {
            await stopDockerContainer(containerName)
            console.log(chalk.green(`  ✅ Stopped container: ${containerName}`))
          } catch (error: any) {
            const errorMessage = error?.message || String(error) || 'Unknown error'
            if (
              errorMessage.toLowerCase().includes('no such container') ||
              errorMessage.toLowerCase().includes('container not found')
            ) {
              console.log(
                chalk.yellow(`  ⚠️  Container ${containerName} not found (already stopped)`)
              )
            } else {
              throw error
            }
          }

          // Remove container
          try {
            await removeDockerContainer(containerName)
            console.log(chalk.green(`  ✅ Removed container: ${containerName}`))
          } catch (error: any) {
            const errorMessage = error?.message || String(error) || 'Unknown error'
            if (
              errorMessage.toLowerCase().includes('no such container') ||
              errorMessage.toLowerCase().includes('container not found')
            ) {
              console.log(
                chalk.yellow(`  ⚠️  Container ${containerName} not found (already removed)`)
              )
            } else {
              throw error
            }
          }
        } catch (error) {
          console.error(
            chalk.red(`  ❌ Failed to stop/remove container for service ${service.name}:`),
            error instanceof Error ? error.message : error
          )
          throw error
        }
      }
    }

    // Handle Nginx configs by domain
    // Check which services remain active for each domain
    if (allDomains.size > 0) {
      console.log(chalk.cyan(`\n⚙️  Updating Nginx configurations...`))

      // Create a set of service names being brought down for quick lookup
      const servicesBeingDowned = new Set(servicesToDown.map((s) => s.name))

      // For each domain, find all services that use it (from all config services)
      // and determine which ones remain active
      for (const domain of allDomains) {
        const configName = domain.replace(/\./g, '_')

        // Find all services that use this domain (from entire config)
        const allServicesForDomain = config.services.filter((s) => s.domains.includes(domain))

        // Filter out services being brought down
        const remainingServices = allServicesForDomain.filter(
          (s) => !servicesBeingDowned.has(s.name)
        )

        // Check if remaining services are actually running (have active containers)
        const activeServices: ServiceConfig[] = []
        for (const service of remainingServices) {
          if (service.docker) {
            const isRunning = await isContainerRunning(service.docker.container)
            if (isRunning) {
              activeServices.push(service)
            }
          } else {
            // Service without docker - assume it's running if not being brought down
            activeServices.push(service)
          }
        }

        try {
          if (activeServices.length === 0) {
            // No active services on this domain, disable the config
            console.log(
              chalk.cyan(`  📋 No active services on ${domain}, disabling Nginx config...`)
            )
            await disableSite(configName, config.nginx.configPath)
            console.log(chalk.green(`  ✅ Disabled Nginx config for ${domain}`))
          } else {
            // Regenerate config with remaining active services
            console.log(
              chalk.cyan(
                `  📋 Regenerating Nginx config for ${domain} with ${
                  activeServices.length
                } active service(s): ${activeServices.map((s) => s.name).join(', ')}`
              )
            )

            // Generate config for remaining services
            let nginxConfigContent: string
            if (activeServices.length === 1) {
              nginxConfigContent = generateNginxConfig(activeServices[0], false)
            } else {
              nginxConfigContent = generateMultiServiceNginxConfig(activeServices, domain, false)
            }

            // Check if HTTPS is enabled (check if certificate exists)
            const { certificateExists } = await import('../utils/certbot')
            const hasHttps = await certificateExists(domain)
            if (hasHttps) {
              // Regenerate with HTTPS
              if (activeServices.length === 1) {
                nginxConfigContent = generateNginxConfig(activeServices[0], true)
              } else {
                nginxConfigContent = generateMultiServiceNginxConfig(activeServices, domain, true)
              }
            }

            await writeNginxConfig(configName, config.nginx.configPath, nginxConfigContent)
            await enableSite(configName, config.nginx.configPath)
            console.log(
              chalk.green(
                `  ✅ Updated Nginx config for ${domain} (${activeServices.length} service(s) active)`
              )
            )
          }
        } catch (error) {
          console.error(
            chalk.red(`  ❌ Failed to update Nginx config for ${domain}:`),
            error instanceof Error ? error.message : error
          )
          throw error
        }
      }

      // Reload Nginx to apply changes
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

    console.log(chalk.green.bold('\n✅ Services brought down successfully!\n'))
  } catch (error) {
    console.error(
      chalk.red('\n❌ Failed to bring down services:'),
      error instanceof Error ? error.message : error
    )
    process.exit(1)
  }
}
