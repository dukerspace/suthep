import chalk from 'chalk';
import { execa } from 'execa';

interface SetupOptions {
  nginxOnly?: boolean;
  certbotOnly?: boolean;
}

export async function setupCommand(options: SetupOptions): Promise<void> {
  console.log(chalk.blue.bold('\n🔧 Setting up prerequisites\n'));

  const setupNginx = !options.certbotOnly;
  const setupCertbot = !options.nginxOnly;

  try {
    // Setup Nginx
    if (setupNginx) {
      console.log(chalk.cyan('📦 Installing Nginx...'));

      // Check if Nginx is already installed
      try {
        await execa('nginx', ['-v']);
        console.log(chalk.green('✅ Nginx is already installed'));
      } catch {
        // Install Nginx based on OS
        const platform = process.platform;

        if (platform === 'linux') {
          // Detect Linux distribution
          try {
            await execa('apt-get', ['--version']);
            console.log(chalk.dim('Using apt-get...'));
            await execa('sudo', ['apt-get', 'update'], { stdio: 'inherit' });
            await execa('sudo', ['apt-get', 'install', '-y', 'nginx'], { stdio: 'inherit' });
          } catch {
            try {
              await execa('yum', ['--version']);
              console.log(chalk.dim('Using yum...'));
              await execa('sudo', ['yum', 'install', '-y', 'nginx'], { stdio: 'inherit' });
            } catch {
              throw new Error('Unsupported Linux distribution. Please install Nginx manually.');
            }
          }
        } else if (platform === 'darwin') {
          console.log(chalk.dim('Using Homebrew...'));
          await execa('brew', ['install', 'nginx'], { stdio: 'inherit' });
        } else {
          throw new Error(`Unsupported platform: ${platform}. Please install Nginx manually.`);
        }

        console.log(chalk.green('✅ Nginx installed successfully'));
      }

      // Start Nginx service
      console.log(chalk.cyan('🚀 Starting Nginx service...'));
      try {
        await execa('sudo', ['systemctl', 'start', 'nginx']);
        await execa('sudo', ['systemctl', 'enable', 'nginx']);
        console.log(chalk.green('✅ Nginx service started'));
      } catch (error) {
        console.log(chalk.yellow('⚠️  Could not start Nginx via systemctl (might not be available)'));
      }
    }

    // Setup Certbot
    if (setupCertbot) {
      console.log(chalk.cyan('\n🔐 Installing Certbot...'));

      // Check if Certbot is already installed
      try {
        await execa('certbot', ['--version']);
        console.log(chalk.green('✅ Certbot is already installed'));
      } catch {
        const platform = process.platform;

        if (platform === 'linux') {
          // Install Certbot based on package manager
          try {
            await execa('apt-get', ['--version']);
            console.log(chalk.dim('Using apt-get...'));
            await execa('sudo', ['apt-get', 'update'], { stdio: 'inherit' });
            await execa('sudo', ['apt-get', 'install', '-y', 'certbot', 'python3-certbot-nginx'], { stdio: 'inherit' });
          } catch {
            try {
              await execa('yum', ['--version']);
              console.log(chalk.dim('Using yum...'));
              await execa('sudo', ['yum', 'install', '-y', 'certbot', 'python3-certbot-nginx'], { stdio: 'inherit' });
            } catch {
              throw new Error('Unsupported Linux distribution. Please install Certbot manually.');
            }
          }
        } else if (platform === 'darwin') {
          console.log(chalk.dim('Using Homebrew...'));
          await execa('brew', ['install', 'certbot'], { stdio: 'inherit' });
        } else {
          throw new Error(`Unsupported platform: ${platform}. Please install Certbot manually.`);
        }

        console.log(chalk.green('✅ Certbot installed successfully'));
      }
    }

    console.log(chalk.green.bold('\n✨ Setup completed successfully!\n'));
    console.log(chalk.dim('Next steps:'));
    console.log(chalk.dim('  1. Create a configuration file: suthep init'));
    console.log(chalk.dim('  2. Deploy your services: suthep deploy\n'));

  } catch (error) {
    console.error(chalk.red('\n❌ Setup failed:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
