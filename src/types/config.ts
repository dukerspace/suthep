/**
 * Configuration type definitions for the Suthep deployment tool
 */

export interface ProjectConfig {
  name: string
  version: string
}

export interface HealthCheckConfig {
  path: string
  interval: number
}

export interface DockerConfig {
  image?: string
  container: string
  port: number
}

export interface ServiceConfig {
  name: string
  port: number
  domains: string[]
  path?: string // Path prefix for this service (e.g., '/api', '/'). Defaults to '/'
  docker?: DockerConfig
  healthCheck?: HealthCheckConfig
  environment?: Record<string, string>
}

export interface NginxConfig {
  configPath: string
  reloadCommand: string
}

export interface CertbotConfig {
  email: string
  staging: boolean
}

export interface DeploymentConfig {
  strategy: 'rolling' | 'blue-green'
  healthCheckTimeout: number
}

export interface DeployConfig {
  project: ProjectConfig
  services: ServiceConfig[]
  nginx: NginxConfig
  certbot: CertbotConfig
  deployment: DeploymentConfig
}
