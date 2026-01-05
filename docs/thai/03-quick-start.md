# คู่มือเริ่มต้นใช้งาน

คู่มือนี้จะช่วยให้คุณ deploy บริการแรกของคุณด้วย Suthep ในไม่กี่นาที

## ขั้นตอนที่ 1: เริ่มต้นการตั้งค่า

สร้างไฟล์การตั้งค่าใหม่แบบโต้ตอบ:

```bash
suthep init
```

คำสั่งนี้จะถามคุณเกี่ยวกับ:
- ชื่อและเวอร์ชันโปรเจกต์
- รายละเอียดบริการ (ชื่อ, พอร์ต, โดเมน)
- การตั้งค่า Docker (หากจำเป็น)
- การตั้งค่า health check
- อีเมลสำหรับใบรับรอง SSL

หรือคุณสามารถคัดลอกการตั้งค่าตัวอย่าง:

```bash
cp suthep.example.yml suthep.yml
```

จากนั้นแก้ไข `suthep.yml` ด้วยการตั้งค่าของคุณ

## ขั้นตอนที่ 2: ตั้งค่าสิ่งที่จำเป็น

ติดตั้งและตั้งค่า Nginx และ Certbot:

```bash
suthep setup
```

สิ่งนี้จะ:
- ติดตั้ง Nginx (หากยังไม่ได้ติดตั้ง)
- ติดตั้ง Certbot (หากยังไม่ได้ติดตั้ง)
- ตั้งค่าการพึ่งพาระบบ

**หมายเหตุ:** คำสั่งนี้ต้องการสิทธิ์ sudo

## ขั้นตอนที่ 3: Deploy บริการของคุณ

Deploy โปรเจกต์ของคุณ:

```bash
suthep deploy
```

คำสั่งนี้จะ:
1. ตั้งค่า Nginx reverse proxy สำหรับบริการทั้งหมด
2. รับใบรับรอง SSL ผ่าน Certbot (หากเปิดใช้งาน)
3. Deploy บริการด้วยกลยุทธ์ zero-downtime

## ตัวอย่าง: Deploy API แบบง่าย

มาดูการ deploy บริการ API Node.js:

### 1. สร้างการตั้งค่า

สร้าง `suthep.yml`:

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

### 2. ตั้งค่าสิ่งที่จำเป็น

```bash
suthep setup
```

### 3. Deploy

```bash
suthep deploy
```

### 4. ตรวจสอบการ Deploy

หลังจาก deploy Suthep จะแสดง URL บริการ:

```
📋 Service URLs:
   api: https://api.example.com
```

เยี่ยมชม URL ในเบราว์เซอร์ของคุณเพื่อตรวจสอบว่าบริการทำงานอยู่

## ตัวอย่าง: Deploy Docker Container

เพื่อ deploy Docker container:

```yaml
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
```

จากนั้นรัน:

```bash
suthep deploy
```

## คำสั่งทั่วไป

### ตรวจสอบสถานะบริการ

```bash
# ดูการตั้งค่า Nginx
sudo nginx -t

# ตรวจสอบ containers ที่กำลังรัน
docker ps

# ดู logs บริการ
docker logs <container-name>
```

### อัปเดตการตั้งค่า

1. แก้ไข `suthep.yml`
2. Redeploy (หยุดและ deploy อีกครั้ง):
   ```bash
   suthep down <service-name> && suthep deploy <service-name>
   # หรือสำหรับบริการทั้งหมด:
   suthep down --all && suthep deploy
   ```

### หยุดบริการ

```bash
# หยุดบริการเฉพาะ
suthep down <service-name>

# หยุดบริการทั้งหมด
suthep down --all
```

### เริ่มบริการ

```bash
# เริ่มบริการเฉพาะ
suthep up <service-name>

# เริ่มบริการทั้งหมด
suthep up --all
```

## สิ่งที่เกิดขึ้นระหว่างการ Deploy?

เมื่อคุณรัน `suthep deploy`, Suthep จะ:

1. **โหลดการตั้งค่า** - อ่านไฟล์ `suthep.yml` ของคุณ
2. **เริ่ม Docker Containers** - หากตั้งค่า Docker แล้ว จะเริ่ม containers
3. **ตั้งค่า Nginx** - สร้างและเขียนไฟล์การตั้งค่า Nginx
4. **เปิดใช้งาน Sites** - สร้าง symlinks เพื่อเปิดใช้งาน Nginx sites
5. **รับใบรับรอง SSL** - ขอใบรับรองจาก Let's Encrypt
6. **อัปเดต Nginx สำหรับ HTTPS** - เพิ่มการตั้งค่า SSL ไปที่ Nginx
7. **Reload Nginx** - ใช้การเปลี่ยนแปลงทั้งหมด
8. **ทำ Health Checks** - ตรวจสอบว่าบริการทำงานถูกต้อง

## การแก้ปัญหาเริ่มต้นใช้งาน

### โดเมนไม่ resolve

ตรวจสอบว่าโดเมนของคุณชี้ไปที่เซิร์ฟเวอร์ของคุณ:

```bash
# ตรวจสอบ DNS
nslookup api.example.com

# ตรวจสอบว่า IP เซิร์ฟเวอร์ตรงกัน
curl -I http://api.example.com
```

### พอร์ตถูกใช้งานอยู่แล้ว

หากคุณได้รับข้อผิดพลาด "port already in use":

1. **ค้นหาสิ่งที่ใช้พอร์ต:**
   ```bash
   sudo lsof -i :3000
   ```

2. **หยุดบริการที่ขัดแย้ง** หรือ **เปลี่ยนพอร์ต** ใน `suthep.yml`

### ปัญหาใบรับรอง SSL

หากการสร้างใบรับรอง SSL ล้มเหลว:

1. **ตรวจสอบ DNS โดเมน** - ตรวจสอบว่าโดเมนชี้ไปที่เซิร์ฟเวอร์ของคุณ
2. **ใช้โหมด staging** สำหรับการทดสอบ:
   ```yaml
   certbot:
     staging: true
   ```

3. **ตรวจสอบ firewall** - ตรวจสอบว่าพอร์ต 80 และ 443 เปิดอยู่

### ข้อผิดพลาดการตั้งค่า Nginx

หาก Nginx reload ล้มเหลว:

```bash
# ทดสอบการตั้งค่า Nginx
sudo nginx -t

# ตรวจสอบ error logs ของ Nginx
sudo tail -f /var/log/nginx/error.log
```

## ขั้นตอนถัดไป

ตอนนี้คุณได้ deploy บริการแรกของคุณแล้ว:

- [คู่มือการตั้งค่า](./04-configuration.md) - เรียนรู้เกี่ยวกับตัวเลือกการตั้งค่าทั้งหมด
- [คำสั่งอ้างอิง](./05-commands.md) - สำรวจคำสั่งทั้งหมดที่มี
- [ตัวอย่าง](./06-examples.md) - ดูตัวอย่างการ deploy เพิ่มเติม

---

**ก่อนหน้า:** [การติดตั้ง](./02-installation.md) | **ถัดไป:** [คู่มือการตั้งค่า →](./04-configuration.md)

