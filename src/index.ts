import { Command } from 'commander'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { deployCommand } from './commands/deploy'
import { downCommand } from './commands/down'
import { initCommand } from './commands/init'
import { listCommand } from './commands/list'
import { logsCommand } from './commands/logs'
import { restartCommand } from './commands/restart'
import { selfUpdateCommand } from './commands/self-update'
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
  .argument('[service-name]', 'Name or index (1-based) of the service to deploy (deploys all if not specified)')
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
  .argument('[service-name]', 'Name or index (1-based) of the service to bring down')
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
  .argument('[service-name]', 'Name or index (1-based) of the service to bring up')
  .action((serviceName, options) => {
    upCommand({
      file: options.file || 'suthep.yml',
      all: options.all || false,
      serviceName: serviceName,
      https: options.https !== false,
      nginx: options.nginx !== false,
    })
  })

program
  .command('logs')
  .description('View logs for services (Docker containers only)')
  .option('-f, --file <path>', 'Configuration file path', 'suthep.yml')
  .option('--follow', 'Follow log output (like tail -f)', false)
  .option('--tail <number>', 'Number of lines to show from the end of logs', '100')
  .argument('[service-name]', 'Name or index (1-based) of the service to show logs for (shows all if not specified)')
  .action((serviceName, options) => {
    logsCommand({
      file: options.file || 'suthep.yml',
      serviceName: serviceName,
      follow: options.follow || false,
      tail: parseInt(options.tail || '100', 10),
    })
  })

program
  .command('restart')
  .description('Restart services (stop and start containers, update Nginx configs)')
  .option('-f, --file <path>', 'Configuration file path', 'suthep.yml')
  .option('--all', 'Restart all services', false)
  .option('--no-https', 'Skip HTTPS setup')
  .option('--no-nginx', 'Skip Nginx configuration')
  .argument('[service-name]', 'Name or index (1-based) of the service to restart')
  .action((serviceName, options) => {
    restartCommand({
      file: options.file || 'suthep.yml',
      all: options.all || false,
      serviceName: serviceName,
      https: options.https !== false,
      nginx: options.nginx !== false,
    })
  })

program
  .command('list')
  .alias('ls')
  .description('List all services and their status (running, stopped, etc.)')
  .option('-f, --file <path>', 'Configuration file path', 'suthep.yml')
  .action((options) => {
    listCommand({
      file: options.file || 'suthep.yml',
    })
  })

program
  .command('self-update')
  .alias('update')
  .description('Update suthep to the latest version from npm')
  .option('--force', 'Force update even if current version is newer', false)
  .action((options) => {
    selfUpdateCommand({
      force: options.force || false,
    })
  })

program.parse()
