import { defineConfig } from 'vitepress'

const sharedHead = [['link', { rel: 'icon', href: '/suthep/doisuthep-logo-8bit.png' }]]

const guideSidebar = [
  { text: 'Getting Started', items: [
    { text: 'Introduction', link: '/01-introduction' },
    { text: 'Installation', link: '/02-installation' },
    { text: 'Quick Start', link: '/03-quick-start' },
  ]},
  { text: 'Reference', items: [
    { text: 'Configuration', link: '/04-configuration' },
    { text: 'Commands', link: '/05-commands' },
    { text: 'Examples', link: '/06-examples' },
  ]},
  { text: 'Help', items: [
    { text: 'Troubleshooting', link: '/07-troubleshooting' },
    { text: 'Advanced Topics', link: '/08-advanced' },
    { text: 'Testing', link: '/09-testing' },
  ]},
]

const thGuideSidebar = [
  { text: 'เริ่มต้น', items: [
    { text: 'บทนำ', link: '/th/01-introduction' },
    { text: 'การติดตั้ง', link: '/th/02-installation' },
    { text: 'เริ่มต้นใช้งาน', link: '/th/03-quick-start' },
  ]},
  { text: 'อ้างอิง', items: [
    { text: 'การตั้งค่า', link: '/th/04-configuration' },
    { text: 'คำสั่ง', link: '/th/05-commands' },
    { text: 'ตัวอย่าง', link: '/th/06-examples' },
  ]},
  { text: 'ช่วยเหลือ', items: [
    { text: 'การแก้ปัญหา', link: '/th/07-troubleshooting' },
    { text: 'หัวข้อขั้นสูง', link: '/th/08-advanced' },
    { text: 'การทดสอบ', link: '/th/09-testing' },
  ]},
]

export default defineConfig({
  title: 'Suthep',
  description:
    'CLI tool for deploying projects with automatic Nginx reverse proxy, HTTPS with Certbot, and zero-downtime deployments.',
  base: '/suthep/',
  srcExclude: ['**/english/**', '**/thai/**', 'README.md'],
  head: sharedHead,
  themeConfig: {
    logo: '/doisuthep-logo-8bit.png',
    socialLinks: [{ icon: 'github', link: 'https://github.com/dukerspace/suthep' }],
  },
  locales: {
    root: {
      label: 'English',
      lang: 'en-US',
      title: 'Suthep',
      description:
        'CLI tool for deploying projects with automatic Nginx reverse proxy, HTTPS with Certbot, and zero-downtime deployments.',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/01-introduction', activeMatch: '/0' },
          { text: 'Examples', link: '/06-examples' },
          { text: 'GitHub', link: 'https://github.com/dukerspace/suthep' },
        ],
        sidebar: guideSidebar,
        outline: { label: 'On this page' },
        docFooter: { prev: 'Previous', next: 'Next' },
      },
    },
    th: {
      label: 'ไทย',
      lang: 'th-TH',
      link: '/th/',
      title: 'Suthep',
      description:
        'เครื่องมือ CLI สำหรับ deploy โปรเจกต์พร้อม Nginx reverse proxy, HTTPS ด้วย Certbot และ zero-downtime deployment',
      themeConfig: {
        nav: [
          { text: 'คู่มือ', link: '/th/01-introduction', activeMatch: '/th/' },
          { text: 'ตัวอย่าง', link: '/th/06-examples' },
          { text: 'GitHub', link: 'https://github.com/dukerspace/suthep' },
        ],
        sidebar: thGuideSidebar,
        outline: { label: 'ในหน้านี้' },
        docFooter: { prev: 'ก่อนหน้า', next: 'ถัดไป' },
      },
    },
  },
})
