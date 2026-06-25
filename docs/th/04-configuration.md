# คู่มือการตั้งค่า

คู่มือนี้ครอบคลุมตัวเลือกการตั้งค่าทั้งหมดที่มีในไฟล์ `suthep.yml` ของ Suthep

## โครงสร้างไฟล์การตั้งค่า

ไฟล์ `suthep.yml` ใช้รูปแบบ YAML และประกอบด้วยหลายส่วน:

```yaml
project:
  # ข้อมูลโปรเจกต์

services:
  # คำจำกัดความบริการ

nginx:
  # การตั้งค่า Nginx

certbot:
  # การตั้งค่าใบรับรอง SSL

deployment:
  # การตั้งค่ากลยุทธ์การ deploy
```

## การตั้งค่าโปรเจกต์

ส่วน `project` ประกอบด้วยข้อมูลเกี่ยวกับโปรเจกต์ของคุณ:

```yaml
project:
  name: my-app        # ชื่อโปรเจกต์
  version: 1.0.0      # เวอร์ชันโปรเจกต์
```

### ฟิลด์

| ฟิลด์ | จำเป็น | คำอธิบาย |
|-------|--------|----------|
| `name` | ใช่ | ตัวระบุเฉพาะสำหรับโปรเจกต์ของคุณ |
| `version` | ใช่ | เวอร์ชันโปรเจกต์ (สำหรับการติดตาม) |

## การตั้งค่าบริการ

อาร์เรย์ `services` กำหนดบริการทั้งหมดที่จะ deploy แต่ละบริการสามารถมีการตั้งค่าหลายอย่าง

### บริการพื้นฐาน

```yaml
services:
  - name: api
    port: 3000
    domains:
      - api.example.com
```

### ฟิลด์บริการ

| ฟิลด์ | จำเป็น | ประเภท | คำอธิบาย |
|-------|--------|--------|----------|
| `name` | ใช่ | string | ตัวระบุบริการเฉพาะ |
| `port` | ใช่ | number | หมายเลขพอร์ตที่บริการรัน (host port) |
| `domains` | ใช่ | array | อาร์เรย์ของชื่อโดเมนสำหรับบริการนี้ |
| `path` | ไม่ | string | คำนำหน้า URL path (ค่าเริ่มต้น: `/`) |
| `docker` | ไม่ | object | การตั้งค่า Docker (ดูด้านล่าง) |
| `healthCheck` | ไม่ | object | การตั้งค่า health check (ดูด้านล่าง) |
| `environment` | ไม่ | object | ตัวแปรสภาพแวดล้อมเป็นคู่ key-value |

### การตั้งค่า Docker

ตั้งค่า deployment ของ Docker container:

```yaml
services:
  - name: webapp
    port: 8080
    docker:
      image: nginx:latest        # Docker image ที่จะ pull
      container: webapp-container # ชื่อ container
      port: 80                    # พอร์ตภายใน container
```

#### ฟิลด์ Docker

| ฟิลด์ | จำเป็น | คำอธิบาย |
|-------|--------|----------|
| `image` | ไม่* | Docker image ที่จะ pull และรัน |
| `container` | ใช่ | ชื่อสำหรับ Docker container |
| `port` | ใช่ | พอร์ตภายในที่ container ฟัง |

\* `image` ไม่บังคับหากเชื่อมต่อกับ container ที่มีอยู่แล้ว

#### เชื่อมต่อกับ Container ที่มีอยู่

เพื่อเชื่อมต่อกับ container ที่กำลังรันอยู่แล้ว ให้ละเว้นฟิลด์ `image`:

```yaml
services:
  - name: database-proxy
    port: 5432
    docker:
      container: postgres-container
      port: 5432
```

### การตั้งค่า Health Check

ตั้งค่าการตรวจสอบสุขภาพสำหรับบริการของคุณ:

```yaml
services:
  - name: api
    healthCheck:
      path: /health      # Health check endpoint
      interval: 30       # ช่วงเวลาการตรวจสอบเป็นวินาที
```

#### ฟิลด์ Health Check

| ฟิลด์ | จำเป็น | ค่าเริ่มต้น | คำอธิบาย |
|-------|--------|------------|----------|
| `path` | ใช่ | - | HTTP endpoint path สำหรับ health checks |
| `interval` | ไม่ | 30 | เวลาระหว่าง health checks (วินาที) |

### ตัวแปรสภาพแวดล้อม

ตั้งค่าตัวแปรสภาพแวดล้อมสำหรับบริการของคุณ:

```yaml
services:
  - name: api
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://localhost:5432/mydb
      API_KEY: your-api-key
```

#### การแทนที่ตัวแปรสภาพแวดล้อม

Suthep รองรับการแทนที่ตัวแปรสภาพแวดล้อมในไฟล์การตั้งค่าโดยใช้ไวยากรณ์ `${VAR_NAME}` คุณยังสามารถใช้ไฟล์ `.env` เพื่อเก็บค่าที่ละเอียดอ่อน

**การใช้ไฟล์ .env:**

Suthep จะโหลดไฟล์ `.env` อัตโนมัติจากไดเรกทอรีเดียวกับไฟล์การตั้งค่าของคุณ มันจะค้นหาไฟล์ตามลำดับนี้ (ไฟล์ที่มาทีหลังจะแทนที่ไฟล์ที่มาก่อน):

1. `.env.local` (ลำดับความสำคัญสูงสุด ควรอยู่ใน gitignore)
2. `.env`

ตัวอย่างไฟล์ `.env`:

```bash
# .env
DATABASE_URL=postgresql://localhost:5432/mydb
API_KEY=secret-key-123
DOMAIN=example.com
```

**ไวยากรณ์การแทนที่ตัวแปร:**

คุณสามารถใช้ตัวแปรสภาพแวดล้อมในไฟล์การตั้งค่าของคุณด้วยไวยากรณ์ต่อไปนี้:

```yaml
services:
  - name: api
    port: 3000
    domains:
      - ${DOMAIN}
      - api.${DOMAIN}
    environment:
      DATABASE_URL: ${DATABASE_URL}
      API_KEY: ${API_KEY}
      NODE_ENV: ${NODE_ENV:-production}  # พร้อมค่าเริ่มต้น
```

**ไวยากรณ์ที่รองรับ:**

- `${VAR_NAME}` - ถูกแทนที่ด้วยค่าของ `VAR_NAME` จากไฟล์ `.env` หรือ `process.env`
- `${VAR_NAME:-default}` - ใช้ `default` หาก `VAR_NAME` ไม่ได้ถูกตั้งค่า
- ตัวแปรจะถูกแทนที่แบบ recursive ตลอดทั้งการตั้งค่า

**ลำดับความสำคัญ:**

ตัวแปรสภาพแวดล้อมจะถูกแก้ไขตามลำดับนี้ (สูงสุดถึงต่ำสุด):

1. ตัวแปรสภาพแวดล้อมจาก CLI (ผ่านแฟล็ก `-e` หรือ `--env`)
2. ตัวแปรสภาพแวดล้อมเฉพาะบริการ (จากส่วน `environment`)
3. ตัวแปรจากไฟล์ `.env`
4. ตัวแปรสภาพแวดล้อมของระบบ (`process.env`)

**ตัวอย่าง:**

```yaml
# suthep.yml
services:
  - name: api
    port: ${API_PORT:-3000}
    domains:
      - ${API_DOMAIN:-api.example.com}
    environment:
      NODE_ENV: ${NODE_ENV:-production}
      DATABASE_URL: ${DATABASE_URL}
```

```bash
# .env
API_PORT=3001
API_DOMAIN=api.myapp.com
DATABASE_URL=postgresql://localhost:5432/mydb
```

**หมายเหตุ:** ควรเพิ่ม `.env.local` ลงในไฟล์ `.gitignore` ของคุณเสมอเพื่อรักษาค่าที่ละเอียดอ่อนให้ปลอดภัย

### Path-Based Routing

กำหนดเส้นทางบริการต่างๆ บนโดเมนเดียวกันโดยใช้ paths:

```yaml
services:
  # บริการ API บน path /api
  - name: api
    port: 3001
    path: /api
    domains:
      - example.com

  # บริการ UI บน root path
  - name: ui
    port: 3000
    path: /
    domains:
      - example.com
```

## การตั้งค่า Nginx

ตั้งค่าการตั้งค่า Nginx:

```yaml
nginx:
  configPath: /etc/nginx/sites-available
  reloadCommand: sudo nginx -t && sudo systemctl reload nginx
```

### ฟิลด์ Nginx

| ฟิลด์ | จำเป็น | ค่าเริ่มต้น | คำอธิบาย |
|-------|--------|------------|----------|
| `configPath` | ไม่ | `/etc/nginx/sites-available` | Path ที่เก็บ configs ของ Nginx |
| `reloadCommand` | ไม่ | `sudo nginx -t && sudo systemctl reload nginx` | คำสั่งเพื่อ reload Nginx |

## การตั้งค่า Certbot

ตั้งค่าการตั้งค่าใบรับรอง SSL:

```yaml
certbot:
  email: admin@example.com  # อีเมลสำหรับ Let's Encrypt
  staging: false            # ใช้สภาพแวดล้อม staging (สำหรับการทดสอบ)
```

### ฟิลด์ Certbot

| ฟิลด์ | จำเป็น | คำอธิบาย |
|-------|--------|----------|
| `email` | ใช่ | ที่อยู่อีเมลสำหรับการแจ้งเตือน Let's Encrypt |
| `staging` | ไม่ | ใช้สภาพแวดล้อม staging (ค่าเริ่มต้น: `false`) |

**หมายเหตุ:** ใช้ `staging: true` สำหรับการทดสอบเพื่อหลีกเลี่ยง rate limits

## การตั้งค่า Deployment

ตั้งค่ากลยุทธ์การ deploy:

```yaml
deployment:
  strategy: rolling              # กลยุทธ์การ deploy
  healthCheckTimeout: 30000      # Health check timeout (ms)
```

### ฟิลด์ Deployment

| ฟิลด์ | จำเป็น | ค่าเริ่มต้น | คำอธิบาย |
|-------|--------|------------|----------|
| `strategy` | ไม่ | `rolling` | กลยุทธ์การ deploy (`rolling` หรือ `blue-green`) |
| `healthCheckTimeout` | ไม่ | `30000` | เวลาสูงสุดในการรอ health check (มิลลิวินาที) |

### กลยุทธ์การ Deploy

#### Rolling Deployment

แทนที่ containers เก่าด้วยใหม่ทีละน้อย:

```yaml
deployment:
  strategy: rolling
```

#### Blue-Green Deployment

สร้าง containers ใหม่, สลับ traffic, จากนั้นลบ containers เก่า:

```yaml
deployment:
  strategy: blue-green
```

## ตัวอย่างการตั้งค่าที่สมบูรณ์

นี่คือตัวอย่างที่สมบูรณ์พร้อมตัวเลือกทั้งหมด:

```yaml
project:
  name: my-app
  version: 1.0.0

services:
  # บริการ API แบบง่าย
  - name: api
    port: 3000
    domains:
      - api.example.com
    healthCheck:
      path: /health
      interval: 30
    environment:
      NODE_ENV: production

  # Docker webapp
  - name: webapp
    port: 8080
    docker:
      image: nginx:latest
      container: webapp-container
      port: 80
    domains:
      - example.com
      - www.example.com
    healthCheck:
      path: /
      interval: 30

  # หลายบริการบนโดเมนเดียวกัน
  - name: api-v2
    port: 3001
    path: /api
    domains:
      - example.com
    docker:
      image: myapp/api:latest
      container: api-v2-container
      port: 3001

nginx:
  configPath: /etc/nginx/sites-available
  reloadCommand: sudo nginx -t && sudo systemctl reload nginx

certbot:
  email: admin@example.com
  staging: false

deployment:
  strategy: rolling
  healthCheckTimeout: 30000
```

## วิธีปฏิบัติที่ดีในการตั้งค่า

### 1. ใช้ชื่อบริการที่อธิบายได้

```yaml
# ดี
- name: user-api
- name: payment-service

# หลีกเลี่ยง
- name: service1
- name: app
```

### 2. ตั้งค่าช่วงเวลา Health Check ที่เหมาะสม

```yaml
# สำหรับบริการที่สำคัญ
healthCheck:
  interval: 15  # ตรวจสอบทุก 15 วินาที

# สำหรับบริการที่สำคัญน้อยกว่า
healthCheck:
  interval: 60  # ตรวจสอบทุกนาที
```

### 3. ใช้ Staging สำหรับการทดสอบ

```yaml
certbot:
  staging: true  # ใช้ staging สำหรับการทดสอบ
```

### 4. จัดระเบียบบริการตามโดเมน

จัดกลุ่มบริการที่เกี่ยวข้องกันในการตั้งค่าของคุณ:

```yaml
services:
  # บริการ API
  - name: api
    domains: [api.example.com]
  - name: api-v2
    domains: [api-v2.example.com]

  # บริการเว็บ
  - name: webapp
    domains: [example.com, www.example.com]
```

## การตรวจสอบความถูกต้อง

Suthep ตรวจสอบความถูกต้องของการตั้งค่าของคุณก่อน deploy ข้อผิดพลาดการตรวจสอบที่พบบ่อย:

- **ฟิลด์ที่จำเป็นหายไป** - ตรวจสอบว่าฟิลด์ที่จำเป็นทั้งหมดมีอยู่
- **หมายเลขพอร์ตไม่ถูกต้อง** - พอร์ตต้องอยู่ระหว่าง 1 และ 65535
- **ชื่อบริการซ้ำ** - แต่ละบริการต้องมีชื่อเฉพาะ
- **รูปแบบโดเมนไม่ถูกต้อง** - โดเมนต้องเป็น hostname ที่ถูกต้อง

## ขั้นตอนถัดไป

- [คำสั่งอ้างอิง](./05-commands.md) - เรียนรู้เกี่ยวกับคำสั่งทั้งหมดที่มี
- [ตัวอย่าง](./06-examples.md) - ดูตัวอย่างการตั้งค่าในโลกจริง

---

**ก่อนหน้า:** [เริ่มต้นใช้งาน](./03-quick-start.md) | **ถัดไป:** [คำสั่งอ้างอิง →](./05-commands.md)

