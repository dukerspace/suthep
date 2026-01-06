import chalk from 'chalk'
import { execa } from 'execa'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Compare two semantic version strings
 * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number)
  const parts2 = v2.split('.').map(Number)

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0
    const part2 = parts2[i] || 0

    if (part1 > part2) return 1
    if (part1 < part2) return -1
  }

  return 0
}

/**
 * Get package information from package.json
 */
function getPackageInfo(): { name: string; version: string } {
  const packageJsonPath = join(__dirname, '..', '..', 'package.json')
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
  return {
    name: packageJson.name,
    version: packageJson.version,
  }
}

/**
 * Get the latest version from npm registry
 */
async function getLatestVersion(packageName: string): Promise<string> {
  try {
    // Use npm view to fetch the latest version from npm registry
    const { stdout } = await execa(
      'npm',
      ['view', packageName, 'version', '--registry', 'https://registry.npmjs.org/'],
      {
        timeout: 10000, // 10 second timeout
      }
    )
    const version = stdout.trim()
    if (!version) {
      throw new Error('No version found in npm registry response')
    }
    return version
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOTFOUND') {
      throw new Error(
        'Network error: Could not connect to npm registry. Please check your internet connection.'
      )
    }
    throw new Error(
      `Failed to fetch latest version from npm registry: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
  }
}

interface SelfUpdateOptions {
  force?: boolean
}

export async function selfUpdateCommand(options: SelfUpdateOptions): Promise<void> {
  console.log(chalk.blue.bold('\n🔄 Checking for updates\n'))

  try {
    const packageInfo = getPackageInfo()
    const packageName = packageInfo.name
    const currentVersion = packageInfo.version

    console.log(chalk.cyan(`Package: ${chalk.bold(packageName)}`))
    console.log(chalk.cyan(`Current version: ${chalk.bold(currentVersion)}`))

    console.log(chalk.dim('Fetching latest version from npm registry...'))
    const latestVersion = await getLatestVersion(packageName)
    console.log(chalk.cyan(`Latest version: ${chalk.bold(latestVersion)}`))

    const comparison = compareVersions(currentVersion, latestVersion)

    if (comparison === 0) {
      console.log(chalk.green.bold('\n✅ You are already using the latest version!\n'))
      return
    }

    if (comparison > 0) {
      console.log(
        chalk.yellow(
          `\n⚠️  You are using a newer version (${currentVersion}) than what's available on npm (${latestVersion})`
        )
      )
      if (!options.force) {
        console.log(chalk.dim('Use --force to update anyway\n'))
        return
      }
      console.log(chalk.dim('Proceeding with update due to --force flag\n'))
    }

    if (comparison < 0 || options.force) {
      console.log(chalk.cyan(`\n📦 Updating from ${currentVersion} to ${latestVersion}...`))

      try {
        // Install the latest version globally from npm registry
        console.log(chalk.dim(`Running: npm install -g ${packageName}@latest`))
        await execa(
          'npm',
          ['install', '-g', `${packageName}@latest`, '--registry', 'https://registry.npmjs.org/'],
          {
            stdio: 'inherit',
            timeout: 300000, // 5 minute timeout for installation
          }
        )

        console.log(chalk.green.bold(`\n✨ Successfully updated to version ${latestVersion}!\n`))
        console.log(
          chalk.dim('You may need to restart your terminal for changes to take effect.\n')
        )
      } catch (error) {
        throw new Error(
          `Failed to install update: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }
  } catch (error) {
    console.error(
      chalk.red('\n❌ Self-update failed:'),
      error instanceof Error ? error.message : error
    )
    process.exit(1)
  }
}
