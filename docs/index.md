---
layout: home

hero:
  name: Suthep
  text: Zero-downtime deployments made simple
  tagline: CLI tool for Nginx reverse proxy, Let's Encrypt HTTPS, and Docker — configured with a single YAML file.
  image:
    src: /doisuthep-logo-8bit.png
    alt: Doi Suthep pixel logo
  actions:
    - theme: brand
      text: Quick Start
      link: /03-quick-start
    - theme: alt
      text: Configuration
      link: /04-configuration

features:
  - icon: 🌐
    title: Automatic Nginx
    details: Generates and manages reverse proxy configuration for every service you deploy.
  - icon: 🔒
    title: HTTPS with Certbot
    details: Obtains and renews Let's Encrypt certificates without manual certbot steps.
  - icon: 🚀
    title: Zero Downtime
    details: Rolling deployments keep your services available while new versions go live.
  - icon: 🐳
    title: Docker Native
    details: Deploy new containers or connect to existing ones from the same config file.
  - icon: 📋
    title: YAML Configuration
    details: Declarative suthep.yml — domains, health checks, env vars, and routing in one place.
  - icon: 🩺
    title: Health Checks
    details: Built-in monitoring so traffic only shifts when your service is ready.
---
