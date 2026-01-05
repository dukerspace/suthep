import { execa } from 'execa'

/**
 * Request an SSL certificate from Let's Encrypt using Certbot
 */
export async function requestCertificate(
  domain: string,
  email: string,
  staging: boolean = false
): Promise<void> {
  // Check if certificate already exists before requesting
  const exists = await certificateExists(domain)
  if (exists) {
    throw new Error(
      `Certificate for ${domain} already exists. Use certificateExists() to check before calling this function.`
    )
  }

  const args = [
    'certonly',
    '--nginx',
    '-d',
    domain,
    '--non-interactive',
    '--agree-tos',
    '--email',
    email,
  ]

  if (staging) {
    args.push('--staging')
  }

  try {
    await execa('sudo', ['certbot', ...args])
  } catch (error: any) {
    const errorMessage = error?.stderr || error?.message || String(error) || 'Unknown error'
    const errorLower = errorMessage.toLowerCase()

    // Check if error is due to certificate already existing
    if (
      errorLower.includes('certificate already exists') ||
      errorLower.includes('already have a certificate') ||
      errorLower.includes('duplicate certificate')
    ) {
      throw new Error(`Certificate for ${domain} already exists. Skipping certificate creation.`)
    }

    throw new Error(`Failed to obtain SSL certificate for ${domain}: ${errorMessage}`)
  }
}

/**
 * Renew all SSL certificates
 */
export async function renewCertificates(): Promise<void> {
  try {
    await execa('sudo', ['certbot', 'renew', '--quiet'])
  } catch (error) {
    throw new Error(
      `Failed to renew SSL certificates: ${error instanceof Error ? error.message : error}`
    )
  }
}

/**
 * Check if a certificate exists for a domain
 */
export async function certificateExists(domain: string): Promise<boolean> {
  try {
    // First, check if certificate files exist using test command (most reliable)
    try {
      await execa('sudo', ['test', '-f', `/etc/letsencrypt/live/${domain}/fullchain.pem`])
      await execa('sudo', ['test', '-f', `/etc/letsencrypt/live/${domain}/privkey.pem`])
      // Both files exist
      return true
    } catch {
      // Files don't exist, continue to certbot check
    }

    // Fallback: Check using certbot certificates command
    try {
      const { stdout } = await execa('sudo', ['certbot', 'certificates'])

      // Check if the domain appears in the certificates list
      const lines = stdout.split('\n')
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        // Check if this line contains "Domains:" and includes our domain
        if (line.includes('Domains:') && line.includes(domain)) {
          return true
        }
        // Also check for the domain in certificate paths
        if (
          line.includes(domain) &&
          (line.includes('/live/') || line.includes('Certificate Name:'))
        ) {
          return true
        }
      }
    } catch {
      // If certbot command fails, assume no certificate exists
    }

    return false
  } catch (error) {
    // If all checks fail, assume no certificate exists
    return false
  }
}

/**
 * Check certificate expiration for a domain
 */
export async function checkCertificateExpiration(domain: string): Promise<Date | null> {
  try {
    const { stdout } = await execa('sudo', ['certbot', 'certificates', '-d', domain])

    // Parse expiration date from output
    const expiryMatch = stdout.match(/Expiry Date: ([^\n]+)/)
    if (expiryMatch) {
      return new Date(expiryMatch[1])
    }

    return null
  } catch (error) {
    return null
  }
}

/**
 * Revoke a certificate for a domain
 */
export async function revokeCertificate(domain: string): Promise<void> {
  try {
    await execa('sudo', ['certbot', 'revoke', '-d', domain, '--non-interactive'])
  } catch (error) {
    throw new Error(
      `Failed to revoke certificate for ${domain}: ${
        error instanceof Error ? error.message : error
      }`
    )
  }
}
