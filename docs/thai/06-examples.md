# ตัวอย่าง

คู่มือนี้ให้ตัวอย่างในโลกจริงของการ deploy ประเภทบริการต่างๆ ด้วย Suthep

## ตัวอย่างที่ 1: Node.js API แบบง่าย

Deploy บริการ API Node.js พร้อม health checks

### การตั้งค่า

```yaml
project:
  name: my-api
  version: 1.0.0

services:
  - name: api
    port: 3000
    domains:
      - api.example.com
    healthCheck:
      path: /health
      interval: 30
    environment:
      NODE_ENV: production
      PORT: 3000

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

### การ Deploy

```bash
suthep setup
suthep deploy
```

### ผลลัพธ์

- บริการพร้อมใช้งานที่ `https://api.example.com`
- Health checks ทำงานทุก 30 วินาที
- ใบรับรอง SSL อัตโนมัติจาก Let's Encrypt

## ตัวอย่างที่ 2: เว็บแอปพลิเคชัน Docker

Deploy เว็บแอปพลิเคชันโดยใช้ Docker container

### การตั้งค่า

```yaml
project:
  name: webapp
  version: 1.0.0

services:
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

### การ Deploy

```bash
suthep deploy
```

### ผลลัพธ์

- Docker container กำลังรันบนพอร์ต 8080
- บริการพร้อมใช้งานที่ `https://example.com` และ `https://www.example.com`
- การจัดการ container อัตโนมัติ

## ตัวอย่างที่ 3: หลายบริการบนโดเมนเดียวกัน

กำหนดเส้นทางหลายบริการบนโดเมนเดียวกันโดยใช้ path-based routing

### การตั้งค่า

```yaml
project:
  name: fullstack-app
  version: 1.0.0

services:
  # บริการ API บน path /api
  - name: api
    port: 3001
    path: /api
    domains:
      - example.com
    docker:
      image: myapp/api:latest
      container: api-container
      port: 3001
    healthCheck:
      path: /api/health
      interval: 30

  # บริการ UI บน root path
  - name: ui
    port: 3000
    path: /
    domains:
      - example.com
    docker:
      image: myapp/ui:latest
      container: ui-container
      port: 3000
    healthCheck:
      path: /
      interval: 30

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

### การ Deploy

```bash
suthep deploy
```

### ผลลัพธ์

- API พร้อมใช้งานที่ `https://example.com/api`
- UI พร้อมใช้งานที่ `https://example.com`
- ทั้งสองบริการใช้โดเมนเดียวกัน

## ตัวอย่างที่ 4: หลายโดเมนสำหรับบริการเดียว

กำหนดเส้นทางหลายโดเมนไปยังบริการเดียวกัน

### การตั้งค่า

```yaml
project:
  name: dashboard
  version: 1.0.0

services:
  - name: dashboard
    port: 5000
    domains:
      - dashboard.example.com
      - admin.example.com
      - app.example.com
    healthCheck:
      path: /api/health
      interval: 60
    environment:
      DATABASE_URL: postgresql://localhost:5432/dashboard
      REDIS_URL: redis://localhost:6379

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

### การ Deploy

```bash
suthep deploy
```

### ผลลัพธ์

- บริการพร้อมใช้งานที่:
  - `https://dashboard.example.com`
  - `https://admin.example.com`
  - `https://app.example.com`
- โดเมนทั้งหมดกำหนดเส้นทางไปยังบริการเดียวกัน

## ตัวอย่างที่ 5: เชื่อมต่อกับ Docker Container ที่มีอยู่

เชื่อมต่อกับ Docker container ที่กำลังรันอยู่แล้ว

### การตั้งค่า

```yaml
project:
  name: database-proxy
  version: 1.0.0

services:
  - name: database-proxy
    port: 5432
    docker:
      container: postgres-container
      port: 5432
    domains:
      - db.example.com

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

### การ Deploy

```bash
# ตรวจสอบว่า container กำลังรัน
docker start postgres-container

# Deploy
suthep deploy
```

### ผลลัพธ์

- Nginx ตั้งค่าให้ proxy ไปยัง container ที่มีอยู่
- ไม่มีการสร้าง container ใหม่

## ตัวอย่างที่ 6: สถาปัตยกรรม Microservices

Deploy หลาย microservices พร้อมโดเมนต่างกัน

### การตั้งค่า

```yaml
project:
  name: microservices-platform
  version: 1.0.0

services:
  # บริการผู้ใช้
  - name: user-service
    port: 3001
    domains:
      - users.api.example.com
    docker:
      image: myapp/user-service:latest
      container: user-service-container
      port: 3001
    healthCheck:
      path: /health
      interval: 30

  # บริการผลิตภัณฑ์
  - name: product-service
    port: 3002
    domains:
      - products.api.example.com
    docker:
      image: myapp/product-service:latest
      container: product-service-container
      port: 3002
    healthCheck:
      path: /health
      interval: 30

  # บริการคำสั่งซื้อ
  - name: order-service
    port: 3003
    domains:
      - orders.api.example.com
    docker:
      image: myapp/order-service:latest
      container: order-service-container
      port: 3003
    healthCheck:
      path: /health
      interval: 30

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

### การ Deploy

```bash
suthep deploy
```

### ผลลัพธ์

- แต่ละ microservice มี subdomain ของตัวเอง
- การ deploy และ scaling อิสระ
- บริการทั้งหมดมี HTTPS อัตโนมัติ

## ตัวอย่างที่ 7: สภาพแวดล้อมการพัฒนา

Deploy พร้อมใบรับรอง SSL staging สำหรับการทดสอบ

### การตั้งค่า

```yaml
project:
  name: dev-app
  version: 0.1.0

services:
  - name: api
    port: 3000
    domains:
      - api.dev.example.com
    healthCheck:
      path: /health
      interval: 60

nginx:
  configPath: /etc/nginx/sites-available
  reloadCommand: sudo nginx -t && sudo systemctl reload nginx

certbot:
  email: dev@example.com
  staging: true  # ใช้ staging สำหรับการทดสอบ

deployment:
  strategy: rolling
  healthCheckTimeout: 30000
```

### การ Deploy

```bash
suthep deploy
```

### ผลลัพธ์

- ใช้สภาพแวดล้อม staging ของ Let's Encrypt
- ไม่มี rate limits สำหรับการทดสอบ
- สามารถทดสอบ SSL โดยไม่กระทบ production

## ตัวอย่างที่ 8: Blue-Green Deployment

ใช้กลยุทธ์ blue-green deployment สำหรับ zero downtime

### การตั้งค่า

```yaml
project:
  name: production-app
  version: 2.0.0

services:
  - name: api
    port: 3000
    domains:
      - api.example.com
    docker:
      image: myapp/api:v2.0.0
      container: api-container
      port: 3000
    healthCheck:
      path: /health
      interval: 30

nginx:
  configPath: /etc/nginx/sites-available
  reloadCommand: sudo nginx -t && sudo systemctl reload nginx

certbot:
  email: admin@example.com
  staging: false

deployment:
  strategy: blue-green  # ใช้ blue-green deployment
  healthCheckTimeout: 30000
```

### การ Deploy

```bash
suthep deploy
```

### ผลลัพธ์

- สร้าง container ใหม่พร้อมกับ container เก่า
- สลับ traffic ไปยัง container ใหม่
- ลบ container เก่าหลังสลับ
- Zero downtime ระหว่างการ deploy

## วิธีปฏิบัติที่ดีจากตัวอย่าง

1. **ใช้ชื่อบริการที่อธิบายได้** - ทำให้การตั้งค่าเข้าใจง่ายขึ้น
2. **ตั้งค่าช่วงเวลา health check ที่เหมาะสม** - สมดุลระหว่างการตอบสนองและโหลด
3. **ใช้ staging สำหรับการพัฒนา** - หลีกเลี่ยง rate limits ระหว่างการทดสอบ
4. **จัดกลุ่มบริการที่เกี่ยวข้อง** - จัดระเบียบตามโดเมนหรือฟังก์ชันการทำงาน
5. **ใช้ path-based routing** - ใช้โดเมนเดียวอย่างมีประสิทธิภาพสำหรับหลายบริการ

## ขั้นตอนถัดไป

- [การแก้ปัญหา](./07-troubleshooting.md) - ปัญหาที่พบบ่อยและวิธีแก้ไข
- [หัวข้อขั้นสูง](./08-advanced.md) - ตัวเลือกการตั้งค่าขั้นสูง

---

**ก่อนหน้า:** [คำสั่งอ้างอิง](./05-commands.md) | **ถัดไป:** [การแก้ปัญหา →](./07-troubleshooting.md)

