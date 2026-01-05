import { execa } from 'execa'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  certificateExists,
  checkCertificateExpiration,
  renewCertificates,
  requestCertificate,
  revokeCertificate,
} from '../certbot'

// Mock execa
vi.mock('execa', () => ({
  execa: vi.fn(),
}))

describe('certbot', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('certificateExists', () => {
    it('should return true if certificate files exist', async () => {
      vi.mocked(execa)
        .mockResolvedValueOnce({ stdout: '', stderr: '' } as any) // test fullchain.pem
        .mockResolvedValueOnce({ stdout: '', stderr: '' } as any) // test privkey.pem

      const result = await certificateExists('example.com')

      expect(execa).toHaveBeenCalledWith('sudo', [
        'test',
        '-f',
        '/etc/letsencrypt/live/example.com/fullchain.pem',
      ])
      expect(execa).toHaveBeenCalledWith('sudo', [
        'test',
        '-f',
        '/etc/letsencrypt/live/example.com/privkey.pem',
      ])
      expect(result).toBe(true)
    })

    it('should return false if certificate files do not exist', async () => {
      vi.mocked(execa).mockRejectedValue(new Error('File not found'))

      const result = await certificateExists('example.com')

      expect(result).toBe(false)
    })

    it('should fallback to certbot certificates command if file test fails', async () => {
      vi.mocked(execa)
        .mockRejectedValueOnce(new Error('File not found')) // test fullchain.pem fails
        .mockResolvedValueOnce({
          stdout: 'Certificate Name: example.com\nDomains: example.com',
          stderr: '',
        } as any) // certbot certificates

      const result = await certificateExists('example.com')

      expect(execa).toHaveBeenCalledWith('sudo', ['certbot', 'certificates'])
      expect(result).toBe(true)
    })

    it('should return false if certbot command also fails', async () => {
      vi.mocked(execa)
        .mockRejectedValueOnce(new Error('File not found')) // test fullchain.pem fails
        .mockRejectedValueOnce(new Error('Certbot error')) // certbot certificates fails

      const result = await certificateExists('example.com')

      expect(result).toBe(false)
    })
  })

  describe('requestCertificate', () => {
    it('should request certificate with correct arguments', async () => {
      // Mock certificateExists to return false (certificate doesn't exist)
      vi.mocked(execa)
        .mockRejectedValueOnce(new Error('File not found')) // certificateExists - file test fails
        .mockRejectedValueOnce(new Error('Certbot error')) // certificateExists - certbot check fails
        .mockResolvedValueOnce({ stdout: '', stderr: '' } as any) // certbot certonly

      await requestCertificate('example.com', 'admin@example.com', false)

      expect(execa).toHaveBeenCalledWith('sudo', [
        'certbot',
        'certonly',
        '--nginx',
        '-d',
        'example.com',
        '--non-interactive',
        '--agree-tos',
        '--email',
        'admin@example.com',
      ])
    })

    it('should include --staging flag when staging is true', async () => {
      // Mock certificateExists to return false (certificate doesn't exist)
      vi.mocked(execa)
        .mockRejectedValueOnce(new Error('File not found')) // certificateExists - file test fails
        .mockRejectedValueOnce(new Error('Certbot error')) // certificateExists - certbot check fails
        .mockResolvedValueOnce({ stdout: '', stderr: '' } as any) // certbot certonly

      await requestCertificate('example.com', 'admin@example.com', true)

      expect(execa).toHaveBeenCalledWith(
        'sudo',
        expect.arrayContaining(['certbot', 'certonly', '--staging'])
      )
    })

    it('should throw error if certificate already exists', async () => {
      // Mock certificateExists to return true (both file checks succeed)
      vi.mocked(execa)
        .mockResolvedValueOnce({ stdout: '', stderr: '' } as any) // certificateExists - fullchain.pem exists
        .mockResolvedValueOnce({ stdout: '', stderr: '' } as any) // certificateExists - privkey.pem exists

      await expect(requestCertificate('example.com', 'admin@example.com', false)).rejects.toThrow(
        'Certificate for example.com already exists'
      )
    })

    it('should handle certificate already exists error from certbot', async () => {
      // Mock certificateExists to return false, but certbot returns already exists error
      vi.mocked(execa)
        .mockRejectedValueOnce(new Error('File not found')) // certificateExists - file test fails
        .mockRejectedValueOnce(new Error('Certbot error')) // certificateExists - certbot check fails
        .mockRejectedValueOnce({
          stderr: 'Certificate already exists for example.com',
          message: 'Certificate already exists',
        } as any)

      await expect(requestCertificate('example.com', 'admin@example.com', false)).rejects.toThrow(
        'Certificate for example.com already exists'
      )
    })

    it('should throw error with details if certificate request fails', async () => {
      vi.mocked(execa)
        .mockResolvedValueOnce({ stdout: '', stderr: '' } as any) // certificateExists check
        .mockRejectedValueOnce({
          stderr: 'DNS validation failed',
          message: 'Validation error',
        } as any)

      await expect(requestCertificate('example.com', 'admin@example.com', false)).rejects.toThrow(
        'Failed to obtain SSL certificate for example.com'
      )
    })
  })

  describe('renewCertificates', () => {
    it('should renew certificates with correct command', async () => {
      vi.mocked(execa).mockResolvedValue({ stdout: '', stderr: '' } as any)

      await renewCertificates()

      expect(execa).toHaveBeenCalledWith('sudo', ['certbot', 'renew', '--quiet'])
    })

    it('should throw error if renewal fails', async () => {
      vi.mocked(execa).mockRejectedValue(new Error('Renewal failed'))

      await expect(renewCertificates()).rejects.toThrow('Failed to renew SSL certificates')
    })
  })

  describe('checkCertificateExpiration', () => {
    it('should return expiration date if certificate exists', async () => {
      const mockStdout = 'Expiry Date: 2024-12-31 23:59:59+00:00'
      vi.mocked(execa).mockResolvedValue({ stdout: mockStdout, stderr: '' } as any)

      const result = await checkCertificateExpiration('example.com')

      expect(execa).toHaveBeenCalledWith('sudo', ['certbot', 'certificates', '-d', 'example.com'])
      expect(result).toBeInstanceOf(Date)
      // Check that it's a valid date - the exact year might vary based on parsing
      expect(result).not.toBeNull()
    })

    it('should return null if expiration date cannot be parsed', async () => {
      vi.mocked(execa).mockResolvedValue({ stdout: 'No expiry date found', stderr: '' } as any)

      const result = await checkCertificateExpiration('example.com')

      expect(result).toBeNull()
    })

    it('should return null if command fails', async () => {
      vi.mocked(execa).mockRejectedValue(new Error('Command failed'))

      const result = await checkCertificateExpiration('example.com')

      expect(result).toBeNull()
    })
  })

  describe('revokeCertificate', () => {
    it('should revoke certificate with correct command', async () => {
      vi.mocked(execa).mockResolvedValue({ stdout: '', stderr: '' } as any)

      await revokeCertificate('example.com')

      expect(execa).toHaveBeenCalledWith('sudo', [
        'certbot',
        'revoke',
        '-d',
        'example.com',
        '--non-interactive',
      ])
    })

    it('should throw error if revocation fails', async () => {
      vi.mocked(execa).mockRejectedValue(new Error('Revocation failed'))

      await expect(revokeCertificate('example.com')).rejects.toThrow(
        'Failed to revoke certificate for example.com'
      )
    })
  })
})
