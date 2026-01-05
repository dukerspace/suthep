import { Command } from 'commander'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { deployCommand } from './commands/deploy'
import { downCommand } from './commands/down'
import { initCommand } from './commands/init'
import { setupCommand } from './commands/setup'
import { upCommand } from './commands/up'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const packageJsonPath = join(__dirname, '..', 'package.json')
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))

const program = new Command()

program
  .name('suthep')
  .description('CLI tool for deploying projects with automatic Nginx reverse proxy and HTTPS setup')
  .version(packageJson.version)

program
  .command('init')
  .description('Initialize a new deployment configuration file')
  .option('-f, --file <path>', 'Configuration file path', 'suthep.yml')
  .action(initCommand)

program
  .command('setup')
  .description('Setup Nginx and Certbot on the system')
  .option('--nginx-only', 'Only setup Nginx')
  .option('--certbot-only', 'Only setup Certbot')
  .action(setupCommand)

program
  .command('deploy')
  .description('Deploy a project using the configuration file')
  .option('-f, --file <path>', 'Configuration file path', 'suthep.yml')
  .option('--no-https', 'Skip HTTPS setup')
  .option('--no-nginx', 'Skip Nginx configuration')
  .option(
    '-e, --env <key=value>',
    'Set environment variables (can be used multiple times, e.g., -e KEY1=value1 -e KEY2=value2)',
    (value, previous: string[] = []) => {
      return [...previous, value]
    },
    []
  )
  .argument('[service-name]', 'Name of the service to deploy (deploys all if not specified)')
  .action((serviceName, options: any) => {
    // Parse environment variables from CLI
    const cliEnvVars: Record<string, string> = {}
    if (options.env && Array.isArray(options.env)) {
      for (const envVar of options.env) {
        const equalsIndex = envVar.indexOf('=')
        if (equalsIndex === -1 || equalsIndex === 0) {
          throw new Error(
            `Invalid environment variable format: ${envVar}. Expected KEY=VALUE (e.g., -e KEY=value)`
          )
        }
        const key = envVar.substring(0, equalsIndex)
        const value = envVar.substring(equalsIndex + 1)
        cliEnvVars[key] = value
      }
    }

    deployCommand({
      file: options.file || 'suthep.yml',
      https: options.https !== false,
      nginx: options.nginx !== false,
      serviceName: serviceName,
      cliEnvVars,
    })
  })

program
  .command('down')
  .description('Bring down services (stop containers and disable Nginx configs)')
  .option('-f, --file <path>', 'Configuration file path', 'suthep.yml')
  .option('--all', 'Bring down all services', false)
  .argument('[service-name]', 'Name of the service to bring down')
  .action((serviceName, options) => {
    downCommand({
      file: options.file || 'suthep.yml',
      all: options.all || false,
      serviceName: serviceName,
    })
  })

program
  .command('up')
  .description('Bring up services (start containers and enable Nginx configs)')
  .option('-f, --file <path>', 'Configuration file path', 'suthep.yml')
  .option('--all', 'Bring up all services', false)
  .option('--no-https', 'Skip HTTPS setup')
  .option('--no-nginx', 'Skip Nginx configuration')
  .argument('[service-name]', 'Name of the service to bring up')
  .action((serviceName, options) => {
    upCommand({
      file: options.file || 'suthep.yml',
      all: options.all || false,
      serviceName: serviceName,
      https: options.https !== false,
      nginx: options.nginx !== false,
    })
  })

program.parse()
