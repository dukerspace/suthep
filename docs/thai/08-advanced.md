# หัวข้อขั้นสูง

คู่มือนี้ครอบคลุมตัวเลือกการตั้งค่าขั้นสูงและเทคนิคการเพิ่มประสิทธิภาพสำหรับ Suthep

## การตั้งค่าขั้นสูง

### การตั้งค่า Nginx แบบกำหนดเอง

ในขณะที่ Suthep สร้างการตั้งค่า Nginx อัตโนมัติ คุณสามารถปรับแต่งได้โดยแก้ไขไฟล์ที่สร้างขึ้น:

```bash
# แก้ไข config ที่สร้างขึ้น
sudo nano /etc/nginx/sites-available/example_com.conf
```

**หมายเหตุ:** การแก้ไขด้วยตนเองอาจถูกเขียนทับเมื่อ redeploy พิจารณาใช้ Nginx includes สำหรับการตั้งค่าแบบกำหนดเอง

### การตั้งค่าตามสภาพแวดล้อม

ใช้ไฟล์การตั้งค่าต่างกันสำหรับสภาพแวดล้อมต่างๆ:

```bash
# Development
suthep deploy -f suthep.dev.yml

# Staging
suthep deploy -f suthep.staging.yml

# Production
suthep deploy -f suthep.prod.yml
```

### กลยุทธ์การ Deploy หลายแบบ

ตั้งค่ากลยุทธ์ต่างๆ ต่อบริการ (ฟีเจอร์ในอนาคต):

```yaml
services:
  - name: api
    deployment:
      strategy: blue-green
  - name: webapp
    deployment:
      strategy: rolling
```

## การเพิ่มประสิทธิภาพ

### การเพิ่มประสิทธิภาพ Health Check

เพิ่มประสิทธิภาพช่วงเวลา health check ตามความสำคัญของบริการ:

```yaml
# บริการที่สำคัญ - ตรวจสอบบ่อย
services:
  - name: payment-api
    healthCheck:
      interval: 15  # ตรวจสอบทุก 15 วินาที

# บริการที่สำคัญน้อยกว่า - ตรวจสอบน้อยลง
services:
  - name: analytics
    healthCheck:
      interval: 120  # ตรวจสอบทุก 2 นาที
```

### การปรับแต่ง Deployment Timeout

ปรับ health check timeouts สำหรับบริการที่เริ่มช้า:

```yaml
deployment:
  healthCheckTimeout: 60000  # 60 วินาทีสำหรับบริการที่ช้า
```

### การจัดการทรัพยากร

ตรวจสอบและจัดการทรัพยากร:

```bash
# ตรวจสอบทรัพยากร Docker
docker stats

# ตรวจสอบการเชื่อมต่อ Nginx
sudo nginx -V  # ตรวจสอบ worker processes
```

## วิธีปฏิบัติด้านความปลอดภัยที่ดี

### การตั้งค่า SSL/TLS

ตรวจสอบการตั้งค่า SSL ที่แข็งแกร่ง:

1. **ใช้ใบรับรอง Production**
   ```yaml
   certbot:
     staging: false  # ใช้ใบรับรอง production
   ```

2. **ตรวจสอบวันหมดอายุของใบรับรอง**
   ```bash
   sudo certbot certificates
   ```

3. **ตั้งค่า Auto-Renewal**
   ```bash
   # Certbot auto-renewal (มักตั้งค่าอัตโนมัติ)
   sudo certbot renew --dry-run
   ```

### การตั้งค่า Firewall

ตั้งค่ากฎ firewall:

```bash
# อนุญาต HTTP และ HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# ปฏิเสธการเข้าถึงพอร์ตบริการโดยตรง
sudo ufw deny 3000/tcp
```

### ความปลอดภัยของ Container

รักษาความปลอดภัย Docker containers:

```yaml
services:
  - name: api
    docker:
      image: myapp/api:latest
      container: api-container
      # พิจารณาเพิ่ม:
      # - Resource limits
      # - Security options
      # - Network isolation
```

## การตรวจสอบและ Logging

### Nginx Access Logs

ตรวจสอบรูปแบบการเข้าถึง:

```bash
# ตรวจสอบการเข้าถึงแบบ real-time
sudo tail -f /var/log/nginx/access.log

# วิเคราะห์รูปแบบการเข้าถึง
sudo cat /var/log/nginx/access.log | grep "GET /api"
```

### Docker Container Logs

ตรวจสอบ logs ของ container:

```bash
# ติดตาม logs
docker logs -f <container-name>

# ดู 100 บรรทัดสุดท้าย
docker logs --tail 100 <container-name>

# Logs พร้อม timestamps
docker logs -t <container-name>
```

### การตรวจสอบ Health Check

ตรวจสอบสถานะ health check:

```bash
# Health check ด้วยตนเอง
curl http://localhost:3000/health

# สคริปต์ตรวจสอบอัตโนมัติ
while true; do
  curl -f http://localhost:3000/health || echo "Health check failed"
  sleep 30
done
```

## กลยุทธ์การขยาย

### Horizontal Scaling

Deploy หลาย instances:

```yaml
services:
  - name: api
    port: 3000
    instances: 3  # Deploy 3 instances
    domains:
      - api.example.com
```

**หมายเหตุ:** นี่เป็นตัวอย่างแนวคิด การใช้งานปัจจุบันจัดการ single instances ต่อบริการ

### Load Balancing

ใช้ Nginx สำหรับ load balancing (ขั้นสูง):

```nginx
upstream api_backend {
    server localhost:3000;
    server localhost:3001;
    server localhost:3002;
}
```

## การสำรองข้อมูลและการกู้คืน

### การสำรองข้อมูลการตั้งค่า

สำรองข้อมูลการตั้งค่าของคุณ:

```bash
# สำรองข้อมูลการตั้งค่า
cp suthep.yml suthep.yml.backup

# Version control
git add suthep.yml
git commit -m "Update deployment configuration"
```

### การสำรองข้อมูลการตั้งค่า Nginx

สำรองข้อมูลการตั้งค่า Nginx:

```bash
# สำรองข้อมูล configs ของ Nginx ทั้งหมด
sudo tar -czf nginx-configs-backup.tar.gz /etc/nginx/sites-available/
```

### การสำรองข้อมูล Container

สำรองข้อมูล Docker containers:

```bash
# Export container
docker export <container-name> > container-backup.tar

# หรือ commit เป็น image
docker commit <container-name> backup-image:latest
```

## การทำงานอัตโนมัติและ CI/CD

### สคริปต์การ Deploy

สร้างสคริปต์การ deploy:

```bash
#!/bin/bash
# deploy.sh

set -e

echo "Deploying services..."

# รัน tests
npm test

# Deploy
suthep deploy

echo "Deployment complete!"
```

### การรวม CI/CD

ตัวอย่าง workflow GitHub Actions:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: npm install -g suthep
      - run: suthep deploy
        env:
          SSH_KEY: ${{ secrets.SSH_KEY }}
```

## การใช้ Docker ขั้นสูง

### Multi-Stage Builds

ใช้ multi-stage builds สำหรับ images ที่เพิ่มประสิทธิภาพ:

```dockerfile
# Build stage
FROM node:16 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM node:16-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/index.js"]
```

### การรวม Docker Compose

ใช้ Docker Compose ร่วมกับ Suthep:

```yaml
# docker-compose.yml
version: '3'
services:
  database:
    image: postgres:14
    # ... database config
```

จากนั้นเชื่อมต่อ Suthep กับ container:

```yaml
services:
  - name: api
    docker:
      container: myapp_database_1  # จาก docker-compose
      port: 5432
```

## การแก้ปัญหาขั้นสูง

### Performance Debugging

ระบุจุดอ bottleneck ของประสิทธิภาพ:

```bash
# ตรวจสอบประสิทธิภาพ Nginx
sudo nginx -V  # ตรวจสอบ compiled modules
sudo nginx -T  # ทดสอบและแสดง config เต็ม

# ตรวจสอบทรัพยากรระบบ
htop
iostat
```

### Network Debugging

แก้ปัญหาปัญหาเครือข่าย:

```bash
# ตรวจสอบ port binding
sudo netstat -tulpn | grep 3000

# ทดสอบการเชื่อมต่อ
curl -v http://localhost:3000

# ตรวจสอบ DNS
dig example.com
nslookup example.com
```

### Container Debugging

แก้ปัญหาปัญหา container:

```bash
# ตรวจสอบ container
docker inspect <container-name>

# รันคำสั่งใน container
docker exec -it <container-name> /bin/sh

# ตรวจสอบเครือข่าย container
docker network ls
docker network inspect bridge
```

## สรุปวิธีปฏิบัติที่ดี

1. **ใช้ Version Control** - ติดตามการเปลี่ยนแปลงการตั้งค่า
2. **ทดสอบใน Staging** - ทดสอบเสมอก่อน production
3. **ตรวจสอบ Health Checks** - ตั้งค่าช่วงเวลาที่เหมาะสม
4. **สำรองข้อมูลการตั้งค่า** - สำรองข้อมูลเป็นประจำ
5. **รักษาความปลอดภัยการเข้าถึง** - ใช้ HTTPS, ตั้งค่า firewalls
6. **เพิ่มประสิทธิภาพทรัพยากร** - ตรวจสอบและเพิ่มประสิทธิภาพการใช้งาน
7. **บันทึกการเปลี่ยนแปลง** - เก็บ deployment logs
8. **ทำงานอัตโนมัติการ Deploy** - ใช้ CI/CD pipelines

## ขั้นตอนถัดไป

- ตรวจสอบ [ตัวอย่าง](./06-examples.md) สำหรับกรณีการใช้งานจริง
- ดู [การแก้ปัญหา](./07-troubleshooting.md) สำหรับปัญหาที่พบบ่อย
- อ้างอิง [คู่มือการตั้งค่า](./04-configuration.md) สำหรับตัวเลือกทั้งหมด

---

**ก่อนหน้า:** [การแก้ปัญหา](./07-troubleshooting.md) | **กลับไป:** [README](./README.md)

