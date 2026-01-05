import chalk from 'chalk'
import fs from 'fs-extra'
import type { ServiceConfig } from '../types/config'
import { certificateExists, requestCertificate } from '../utils/certbot'
import { loadConfig } from '../utils/config-loader'
import { deployService, performHealthCheck } from '../utils/deployment'
import {
  cleanupTempContainer,
  startDockerContainer,
  startDockerContainerZeroDowntime,
  swapContainersForZeroDowntime,
  type ZeroDowntimeContainerInfo,
} from '../utils/docker'
import {
  enableSite,
  generateMultiServiceNginxConfig,
  generateNginxConfig,
  getCanonicalDomain,
  reloadNginx,
  writeNginxConfig,
} from '../utils/nginx'

interface DeployOptions {
  file: string
  https: boolean
  nginx: boolean
  serviceName?: string
  cliEnvVars?: Record<string, string>
}

export async function deployCommand(options: DeployOptions): Promise<void> {
  console.log(chalk.blue.bold('\n🚀 Deploying Services\n'))

  try {
    // Load configuration (this will also load .env files for variable substitution)
    if (!(await fs.pathExists(options.file))) {
      throw new Error(`Configuration file not found: ${options.file}`)
    }

    console.log(chalk.cyan(`📄 Loading configuration from ${options.file}...`))
    const config = await loadConfig(options.file)

    // Filter services based on serviceName if provided
    let servicesToDeploy: ServiceConfig[] = []
    if (options.serviceName) {
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
      servicesToDeploy = [service]
      console.log(chalk.green(`✅ Configuration loaded for project: ${config.project.name}`))
      console.log(chalk.cyan(`📋 Deploying service: ${options.serviceName}\n`))
    } else {
      servicesToDeploy = config.services
      console.log(chalk.green(`✅ Configuration loaded for project: ${config.project.name}`))
      console.log(
        chalk.cyan(`📋 Deploying all services: ${servicesToDeploy.map((s) => s.name).join(', ')}\n`)
      )
    }

    // Group services by domain
    // When deploying a single service, include ALL services from config that share the same domain(s)
    // This ensures nginx config includes both old and new services
    const domainToServices = new Map<string, ServiceConfig[]>()
    const allDomains = new Set<string>()

    // Collect all domains from services being deployed
    for (const service of servicesToDeploy) {
      for (const domain of service.domains) {
        allDomains.add(domain)
      }
    }

    // If deploying a single service, include all services that share the same domain(s)
    // Otherwise, use only services being deployed
    const servicesForNginx = options.serviceName
      ? config.services.filter((service) => {
          // Include service if it shares any domain with services being deployed
          return service.domains.some((domain) => allDomains.has(domain))
        })
      : servicesToDeploy

    // Log when additional services are included in nginx config
    if (options.serviceName && servicesForNginx.length > servicesToDeploy.length) {
      const additionalServices = servicesForNginx.filter(
        (s) => !servicesToDeploy.some((d) => d.name === s.name)
      )
      console.log(
        chalk.cyan(
          `  📋 Including ${
            additionalServices.length
          } additional service(s) in nginx config: ${additionalServices
            .map((s) => s.name)
            .join(', ')}`
        )
      )
    }

    // Group services by canonical domain for nginx configuration
    // This ensures www and non-www root domains use the same config file
    const canonicalDomains = new Set<string>()
    for (const service of servicesForNginx) {
      for (const domain of service.domains) {
        if (allDomains.has(domain)) {
          // Get canonical domain (www if both exist, otherwise the domain itself)
          const canonicalDomain = getCanonicalDomain(domain, allDomains)
          canonicalDomains.add(canonicalDomain)

          // Group services by canonical domain
          if (!domainToServices.has(canonicalDomain)) {
            domainToServices.set(canonicalDomain, [])
          }
          // Only add service if not already added for this canonical domain
          if (!domainToServices.get(canonicalDomain)!.some((s) => s.name === service.name)) {
            domainToServices.get(canonicalDomain)!.push(service)
          }
        }
      }
    }

    // Deploy each service (Docker, health checks, etc.)
    // Track zero-downtime info for services that need it
    const serviceTempInfo = new Map<string, ZeroDowntimeContainerInfo | null>()

    for (const service of servicesToDeploy) {
      console.log(chalk.cyan(`\n📦 Deploying service: ${service.name}`))

      try {
        // Start Docker container if configured
        if (service.docker) {
          console.log(chalk.dim('  🐳 Managing Docker container...'))

          // Use zero-downtime deployment if strategy is blue-green or rolling
          if (
            config.deployment.strategy === 'blue-green' ||
            config.deployment.strategy === 'rolling'
          ) {
            const tempInfo = await startDockerContainerZeroDowntime(service, options.cliEnvVars)
            serviceTempInfo.set(service.name, tempInfo)

            if (tempInfo && tempInfo.oldContainerExists) {
              console.log(
                chalk.cyan(
                  `  🔄 Zero-downtime deployment: new container on port ${tempInfo.tempPort}`
                )
              )
            }
          } else {
            // Fallback to regular deployment
            await startDockerContainer(service, options.cliEnvVars)
            serviceTempInfo.set(service.name, null)
          }
        } else {
          serviceTempInfo.set(service.name, null)
        }

        // Deploy the service (with temp info for zero-downtime)
        const tempInfo = serviceTempInfo.get(service.name) || null
        await deployService(service, config.deployment, tempInfo)

        // Perform health check on appropriate port
        if (service.healthCheck) {
          console.log(chalk.dim(`  🏥 Performing health check...`))
          const checkPort =
            tempInfo && tempInfo.oldContainerExists ? tempInfo.tempPort : service.port
          const isHealthy = await performHealthCheck(
            `http://localhost:${checkPort}${service.healthCheck.path}`,
            config.deployment.healthCheckTimeout
          )

          if (isHealthy) {
            console.log(chalk.green(`  ✅ Service ${service.name} is healthy`))
          } else {
            throw new Error(`Health check failed for service ${service.name}`)
          }
        }

        console.log(chalk.green.bold(`✨ Service ${service.name} deployed successfully!`))
      } catch (error) {
        console.error(
          chalk.red(`\n❌ Failed to deploy service ${service.name}:`),
          error instanceof Error ? error.message : error
        )
        throw error
      }
    }

    // Helper function to generate nginx configs with optional port overrides
    const generateNginxConfigsForDomain = (
      domain: string,
      withHttps: boolean,
      portOverrides?: Map<string, number>
    ): string => {
      const servicesForDomain = domainToServices.get(domain)!
      if (servicesForDomain.length === 1) {
        const service = servicesForDomain[0]
        const portOverride = portOverrides?.get(service.name)
        return generateNginxConfig(service, withHttps, portOverride)
      } else {
        return generateMultiServiceNginxConfig(servicesForDomain, domain, withHttps, portOverrides)
      }
    }

    // Check if we need zero-downtime nginx updates (any service has temp container)
    const needsZeroDowntimeNginx = Array.from(serviceTempInfo.values()).some(
      (info) => info !== null && info.oldContainerExists
    )

    // Configure Nginx per domain
    if (options.nginx) {
      // If zero-downtime, first update nginx to point to temp ports
      if (needsZeroDowntimeNginx) {
        console.log(chalk.cyan(`\n⚙️  Updating Nginx for zero-downtime deployment...`))

        // Build port override map for temp ports
        const tempPortOverrides = new Map<string, number>()
        for (const service of servicesToDeploy) {
          const tempInfo = serviceTempInfo.get(service.name)
          if (tempInfo && tempInfo.oldContainerExists) {
            tempPortOverrides.set(service.name, tempInfo.tempPort)
          }
        }

        for (const canonicalDomain of canonicalDomains) {
          const configName = canonicalDomain.replace(/\./g, '_')
          try {
            const nginxConfigContent = generateNginxConfigsForDomain(
              canonicalDomain,
              false,
              tempPortOverrides
            )
            await writeNginxConfig(configName, config.nginx.configPath, nginxConfigContent)
            await enableSite(configName, config.nginx.configPath)
            console.log(chalk.green(`  ✅ Nginx updated for ${canonicalDomain} (temporary ports)`))
          } catch (error) {
            console.error(
              chalk.red(`  ❌ Failed to update Nginx for ${canonicalDomain}:`),
              error instanceof Error ? error.message : error
            )
            throw error
          }
        }

        // Reload nginx to switch to temp ports (graceful reload, no connection drops)
        console.log(chalk.cyan(`\n🔄 Reloading Nginx to switch to new containers...`))
        await reloadNginx(config.nginx.reloadCommand)
        console.log(chalk.green(`  ✅ Nginx reloaded, traffic now routed to new containers`))

        // Now swap containers (stop old, promote new)
        console.log(chalk.cyan(`\n🔄 Swapping containers for zero-downtime...`))
        for (const service of servicesToDeploy) {
          const tempInfo = serviceTempInfo.get(service.name)
          if (tempInfo && tempInfo.oldContainerExists && service.docker) {
            try {
              await swapContainersForZeroDowntime(service, tempInfo, options.cliEnvVars)
              console.log(chalk.green(`  ✅ Container swapped for ${service.name}`))
            } catch (error) {
              console.error(
                chalk.red(`  ❌ Failed to swap container for ${service.name}:`),
                error instanceof Error ? error.message : error
              )
              throw error
            }
          }
        }

        // Update nginx back to original ports (before stopping temp containers)
        console.log(chalk.cyan(`\n⚙️  Updating Nginx back to production ports...`))
        for (const canonicalDomain of canonicalDomains) {
          const configName = canonicalDomain.replace(/\./g, '_')
          try {
            const nginxConfigContent = generateNginxConfigsForDomain(canonicalDomain, false)
            await writeNginxConfig(configName, config.nginx.configPath, nginxConfigContent)
            await enableSite(configName, config.nginx.configPath)
            console.log(chalk.green(`  ✅ Nginx updated for ${canonicalDomain} (production ports)`))
          } catch (error) {
            console.error(
              chalk.red(`  ❌ Failed to update Nginx for ${canonicalDomain}:`),
              error instanceof Error ? error.message : error
            )
            throw error
          }
        }

        // Reload nginx to switch to production ports (graceful reload)
        console.log(chalk.cyan(`\n🔄 Reloading Nginx to switch to production ports...`))
        await reloadNginx(config.nginx.reloadCommand)
        console.log(chalk.green(`  ✅ Nginx reloaded, traffic now routed to production containers`))

        // Clean up temp containers (nginx already pointing to production, so safe to remove)
        console.log(chalk.cyan(`\n🧹 Cleaning up temporary containers...`))
        for (const service of servicesToDeploy) {
          const tempInfo = serviceTempInfo.get(service.name)
          if (tempInfo && tempInfo.oldContainerExists) {
            await cleanupTempContainer(tempInfo.tempContainerName)
          }
        }
      } else {
        // Regular nginx configuration (no zero-downtime needed)
        console.log(chalk.cyan(`\n⚙️  Configuring Nginx reverse proxy...`))

        for (const canonicalDomain of canonicalDomains) {
          const servicesForDomain = domainToServices.get(canonicalDomain)!
          const configName = canonicalDomain.replace(/\./g, '_')

          try {
            // Log domain and services configuration
            if (servicesForDomain.length > 1) {
              console.log(
                chalk.cyan(
                  `  📋 Configuring ${canonicalDomain} with ${
                    servicesForDomain.length
                  } services: ${servicesForDomain.map((s) => s.name).join(', ')}`
                )
              )
              console.log(
                chalk.dim(
                  `     All services will share the same nginx config file: ${configName}.conf`
                )
              )
            } else {
              // Single service, but log it anyway for clarity
              console.log(
                chalk.cyan(
                  `  📋 Configuring ${canonicalDomain} with service: ${servicesForDomain[0].name}`
                )
              )
            }

            // Generate Nginx config
            const nginxConfigContent = generateNginxConfigsForDomain(canonicalDomain, false)

            // Check if config file already exists and write/override it
            const wasOverridden = await writeNginxConfig(
              configName,
              config.nginx.configPath,
              nginxConfigContent
            )

            if (wasOverridden) {
              console.log(
                chalk.yellow(
                  `  🔄 Nginx config "${configName}.conf" already exists, deleting and recreating with new configuration...`
                )
              )
            }

            await enableSite(configName, config.nginx.configPath)

            console.log(chalk.green(`  ✅ Nginx configured for ${canonicalDomain}`))
          } catch (error) {
            console.error(
              chalk.red(`  ❌ Failed to configure Nginx for ${canonicalDomain}:`),
              error instanceof Error ? error.message : error
            )
            throw error
          }
        }
      }
    }

    // Setup HTTPS with Certbot (per canonical domain, not per service)
    if (options.https && canonicalDomains.size > 0) {
      console.log(chalk.cyan(`\n🔐 Setting up HTTPS certificates...`))

      for (const canonicalDomain of canonicalDomains) {
        try {
          // Check if certificate already exists
          const exists = await certificateExists(canonicalDomain)
          if (exists) {
            console.log(
              chalk.green(
                `  ✅ SSL certificate already exists for ${canonicalDomain}, skipping certificate creation`
              )
            )
            console.log(
              chalk.dim(
                `     Using existing certificate from /etc/letsencrypt/live/${canonicalDomain}/`
              )
            )
          } else {
            // Request new certificate
            console.log(chalk.cyan(`  📜 Requesting SSL certificate for ${canonicalDomain}...`))
            try {
              await requestCertificate(
                canonicalDomain,
                config.certbot.email,
                config.certbot.staging
              )
              console.log(chalk.green(`  ✅ SSL certificate obtained for ${canonicalDomain}`))
            } catch (error: any) {
              // Check if error is because certificate already exists (race condition or check missed it)
              const errorMessage = error?.message || String(error) || ''
              if (
                errorMessage.includes('already exists') ||
                errorMessage.includes('Skipping certificate creation')
              ) {
                console.log(
                  chalk.green(
                    `  ✅ SSL certificate already exists for ${canonicalDomain} (detected during request), skipping...`
                  )
                )
              } else {
                throw error // Re-throw if it's a different error
              }
            }
          }
        } catch (error) {
          console.log(
            chalk.yellow(
              `  ⚠️  Failed to obtain SSL for ${canonicalDomain}: ${
                error instanceof Error ? error.message : error
              }`
            )
          )
        }
      }

      // Update Nginx configs with HTTPS
      if (options.nginx) {
        console.log(chalk.cyan(`\n🔄 Updating Nginx configs with HTTPS...`))
        for (const canonicalDomain of canonicalDomains) {
          const configName = canonicalDomain.replace(/\./g, '_')

          try {
            const nginxConfigContent = generateNginxConfigsForDomain(canonicalDomain, true)
            const wasOverridden = await writeNginxConfig(
              configName,
              config.nginx.configPath,
              nginxConfigContent
            )

            if (wasOverridden) {
              console.log(
                chalk.yellow(
                  `  🔄 Nginx config "${configName}.conf" already exists, deleting and recreating with new HTTPS configuration...`
                )
              )
            }
            console.log(chalk.green(`  ✅ HTTPS config updated for ${canonicalDomain}`))
          } catch (error) {
            console.error(
              chalk.red(`  ❌ Failed to update HTTPS config for ${canonicalDomain}:`),
              error instanceof Error ? error.message : error
            )
            throw error
          }
        }
      }
    }

    // Final reload Nginx after all configurations (only if we didn't already reload for zero-downtime)
    if (options.nginx && !needsZeroDowntimeNginx) {
      console.log(chalk.cyan(`\n🔄 Reloading Nginx...`))
      await reloadNginx(config.nginx.reloadCommand)
    } else if (options.nginx && needsZeroDowntimeNginx) {
      // Final reload after HTTPS update
      console.log(chalk.cyan(`\n🔄 Final Nginx reload with HTTPS...`))
      await reloadNginx(config.nginx.reloadCommand)
    }

    console.log(chalk.green.bold('\n🎉 All services deployed successfully!\n'))

    // Print service URLs
    console.log(chalk.cyan('📋 Service URLs:'))
    for (const service of servicesToDeploy) {
      for (const domain of service.domains) {
        const protocol = options.https ? 'https' : 'http'
        const servicePath = service.path || '/'
        const fullPath = servicePath === '/' ? '' : servicePath
        console.log(chalk.dim(`   ${service.name}: ${protocol}://${domain}${fullPath}`))
      }
    }
    console.log()
  } catch (error) {
    console.error(
      chalk.red('\n❌ Deployment failed:'),
      error instanceof Error ? error.message : error
    )
    process.exit(1)
  }
}
