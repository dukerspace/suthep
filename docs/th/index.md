---
layout: home

hero:
  name: Suthep
  text: Deploy แบบ zero-downtime อย่างง่าย
  tagline: เครื่องมือ CLI สำหรับ Nginx reverse proxy, HTTPS ด้วย Let's Encrypt และ Docker — ตั้งค่าด้วยไฟล์ YAML เดียว
  image:
    src: /doisuthep-logo-8bit.png
    alt: โลโก้ Doi Suthep แบบพิกเซล
  actions:
    - theme: brand
      text: เริ่มต้นใช้งาน
      link: /th/03-quick-start
    - theme: alt
      text: การตั้งค่า
      link: /th/04-configuration

features:
  - icon: 🌐
    title: Nginx อัตโนมัติ
    details: สร้างและจัดการ reverse proxy สำหรับทุกบริการที่คุณ deploy
  - icon: 🔒
    title: HTTPS ด้วย Certbot
    details: ขอและต่ออายุใบรับรอง Let's Encrypt โดยไม่ต้องรัน certbot เอง
  - icon: 🚀
    title: Zero Downtime
    details: Rolling deployment ทำให้บริการพร้อมใช้งานระหว่างอัปเดตเวอร์ชันใหม่
  - icon: 🐳
    title: รองรับ Docker
    details: Deploy container ใหม่หรือเชื่อมต่อ container ที่มีอยู่จากไฟล์ config เดียวกัน
  - icon: 📋
    title: ตั้งค่า YAML
    details: suthep.yml แบบ declarative — โดเมน, health check, env และ routing ในที่เดียว
  - icon: 🩺
    title: Health Checks
    details: ตรวจสอบสุขภาพในตัว ก่อนสลับ traffic ไปยังเวอร์ชันใหม่
---
