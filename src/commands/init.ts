import chalk from 'chalk'
import fs from 'fs-extra'
import inquirer from 'inquirer'
import type { DeployConfig } from '../types/config'
import { saveConfig } from '../utils/config-loader'

interface InitOptions {
  file: string
}

export async function initCommand(options: InitOptions): Promise<void> {
  console.log(chalk.blue.bold('\n🚀 Suthep Deployment Configuration\n'))

  // Check if file already exists
  if (await fs.pathExists(options.file)) {
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: `File ${options.file} already exists. Overwrite?`,
        default: false,
      },
    ])

    if (!overwrite) {
      console.log(chalk.yellow('Aborted.'))
      return
    }
  }

  // Gather project information
  const projectAnswers = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name:',
      default: 'my-app',
    },
    {
      type: 'input',
      name: 'projectVersion',
      message: 'Project version:',
      default: '1.0.0',
    },
  ])

  // Gather service information
  const services = []
  let addMoreServices = true

  while (addMoreServices) {
    console.log(chalk.cyan(`\n📦 Service ${services.length + 1} Configuration`))

    const serviceAnswers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Service name:',
        validate: (input) => input.trim() !== '' || 'Service name is required',
      },
      {
        type: 'number',
        name: 'port',
        message: 'Service port:',
        default: 3000,
        validate: (input: number | undefined) => {
          if (input === undefined) return 'Port is required'
          return (input > 0 && input < 65536) || 'Port must be between 1 and 65535'
        },
      },
      {
        type: 'input',
        name: 'domains',
        message: 'Domain names (comma-separated):',
        validate: (input) => input.trim() !== '' || 'At least one domain is required',
        filter: (input: string) => input.split(',').map((d: string) => d.trim()),
      },
      {
        type: 'confirm',
        name: 'useDocker',
        message: 'Use Docker?',
        default: false,
      },
    ])

    // Docker configuration
    let dockerConfig = undefined
    if (serviceAnswers.useDocker) {
      const dockerAnswers = await inquirer.prompt([
        {
          type: 'input',
          name: 'image',
          message: 'Docker image (leave empty to connect to existing container):',
        },
        {
          type: 'input',
          name: 'container',
          message: 'Container name:',
          validate: (input) => input.trim() !== '' || 'Container name is required',
        },
        {
          type: 'number',
          name: 'port',
          message: 'Container port:',
          default: serviceAnswers.port,
        },
      ])

      dockerConfig = {
        image: dockerAnswers.image || undefined,
        container: dockerAnswers.container,
        port: dockerAnswers.port,
      }
    }

    // Health check configuration
    const { addHealthCheck } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'addHealthCheck',
        message: 'Add health check?',
        default: true,
      },
    ])

    let healthCheck = undefined
    if (addHealthCheck) {
      const healthCheckAnswers = await inquirer.prompt([
        {
          type: 'input',
          name: 'path',
          message: 'Health check path:',
          default: '/health',
        },
        {
          type: 'number',
          name: 'interval',
          message: 'Health check interval (seconds):',
          default: 30,
        },
      ])

      healthCheck = healthCheckAnswers
    }

    services.push({
      name: serviceAnswers.name,
      port: serviceAnswers.port,
      domains: serviceAnswers.domains,
      docker: dockerConfig,
      healthCheck,
    })

    const { addMore } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'addMore',
        message: 'Add another service?',
        default: false,
      },
    ])

    addMoreServices = addMore
  }

  // Certbot configuration
  const certbotAnswers = await inquirer.prompt([
    {
      type: 'input',
      name: 'email',
      message: 'Email for SSL certificates:',
      validate: (input) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return emailRegex.test(input) || 'Please enter a valid email address'
      },
    },
    {
      type: 'confirm',
      name: 'staging',
      message: 'Use Certbot staging environment? (for testing)',
      default: false,
    },
  ])

  // Build configuration object
  const config: DeployConfig = {
    project: {
      name: projectAnswers.projectName,
      version: projectAnswers.projectVersion,
    },
    services,
    nginx: {
      configPath: '/etc/nginx/sites-available',
      reloadCommand: 'sudo nginx -t && sudo systemctl reload nginx',
    },
    certbot: {
      email: certbotAnswers.email,
      staging: certbotAnswers.staging,
    },
    deployment: {
      strategy: 'rolling',
      healthCheckTimeout: 30000,
    },
  }

  // Save configuration
  await saveConfig(options.file, config)

  console.log(chalk.green(`\n✅ Configuration saved to ${options.file}`))
  console.log(chalk.dim('\nNext steps:'))
  console.log(chalk.dim(`  1. Review and edit ${options.file} if needed`))
  console.log(chalk.dim('  2. Run: suthep setup'))
  console.log(chalk.dim('  3. Run: suthep deploy\n'))
}
