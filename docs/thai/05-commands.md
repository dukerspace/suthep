# คำสั่งอ้างอิง

คู่มือนี้ครอบคลุมคำสั่ง Suthep ทั้งหมดที่มีและตัวเลือกของพวกเขา

## ภาพรวมคำสั่ง

Suthep ให้คำสั่งต่อไปนี้:

- `suthep init` - เริ่มต้นไฟล์การตั้งค่า
- `suthep setup` - ตั้งค่าสิ่งที่จำเป็น
- `suthep deploy` - Deploy บริการ
- `suthep down` - หยุดบริการ
- `suthep up` - เริ่มบริการ

## suthep init

เริ่มต้นไฟล์การตั้งค่า deployment ใหม่พร้อมพร้อมต์แบบโต้ตอบ

### การใช้งาน

```bash
suthep init [options]
```

### ตัวเลือก

| ตัวเลือก | ตัวย่อ | คำอธิบาย | ค่าเริ่มต้น |
|---------|--------|----------|-----------|
| `--file` | `-f` | Path ไฟล์การตั้งค่า | `suthep.yml` |

### ตัวอย่าง

```bash
# สร้างไฟล์การตั้งค่าเริ่มต้น
suthep init

# สร้างไฟล์การตั้งค่าแบบกำหนดเอง
suthep init -f my-config.yml
```

### พร้อมต์แบบโต้ตอบ

คำสั่ง `init` จะถามคุณเกี่ยวกับ:

1. **ข้อมูลโปรเจกต์**
   - ชื่อโปรเจกต์
   - เวอร์ชันโปรเจกต์

2. **การตั้งค่าบริการ** (สำหรับแต่ละบริการ)
   - ชื่อบริการ
   - พอร์ตบริการ
   - ชื่อโดเมน (คั่นด้วยเครื่องหมายจุลภาค)
   - การใช้ Docker
   - Docker image (หากใช้ Docker)
   - ชื่อ container
   - พอร์ต container
   - การตั้งค่า health check
   - Health check path
   - ช่วงเวลา health check

3. **ใบรับรอง SSL**
   - อีเมลสำหรับ Let's Encrypt
   - สภาพแวดล้อม staging (สำหรับการทดสอบ)

## suthep setup

ติดตั้งและตั้งค่า Nginx และ Certbot บนระบบของคุณ

### การใช้งาน

```bash
suthep setup [options]
```

### ตัวเลือก

| ตัวเลือก | คำอธิบาย |
|---------|----------|
| `--nginx-only` | ติดตั้งและตั้งค่าเฉพาะ Nginx |
| `--certbot-only` | ติดตั้งและตั้งค่าเฉพาะ Certbot |

### ตัวอย่าง

```bash
# ตั้งค่าทั้ง Nginx และ Certbot
suthep setup

# ตั้งค่าเฉพาะ Nginx
suthep setup --nginx-only

# ตั้งค่าเฉพาะ Certbot
suthep setup --certbot-only
```

### สิ่งที่มันทำ

1. **ตรวจสอบการติดตั้งที่มีอยู่**
2. **ติดตั้งส่วนประกอบที่หายไป:**
   - Nginx (ผ่าน apt-get, yum, หรือ Homebrew)
   - Certbot (ผ่าน apt-get, yum, หรือ Homebrew)
3. **เริ่มและเปิดใช้งานบริการ**

**หมายเหตุ:** ต้องการสิทธิ์ sudo

## suthep deploy

Deploy โปรเจกต์ของคุณโดยใช้ไฟล์การตั้งค่า

### การใช้งาน

```bash
suthep deploy [service-name] [options]
```

### อาร์กิวเมนต์

| อาร์กิวเมนต์ | คำอธิบาย |
|------------|----------|
| `service-name` | ชื่อของบริการที่จะ deploy (ไม่บังคับ, จะ deploy บริการทั้งหมดหากไม่ระบุ) |

### ตัวเลือก

| ตัวเลือก | ตัวย่อ | คำอธิบาย | ค่าเริ่มต้น |
|---------|--------|----------|-----------|
| `--file` | `-f` | Path ไฟล์การตั้งค่า | `suthep.yml` |
| `--no-https` | - | ข้ามการตั้งค่า HTTPS/SSL certificate | `false` |
| `--no-nginx` | - | ข้ามการตั้งค่า Nginx | `false` |
| `--env` | `-e` | ตั้งค่า environment variables (สามารถใช้หลายครั้ง เช่น `-e KEY1=value1 -e KEY2=value2`) | - |

### ตัวอย่าง

```bash
# Deploy บริการทั้งหมดด้วยการตั้งค่าเริ่มต้น
suthep deploy

# Deploy บริการเฉพาะ
suthep deploy api

# Deploy ด้วยไฟล์ config แบบกำหนดเอง
suthep deploy -f production.yml

# Deploy บริการเฉพาะโดยไม่มี HTTPS (สำหรับการทดสอบ)
suthep deploy api --no-https

# Deploy โดยไม่มี Nginx (สำหรับการทดสอบ)
suthep deploy --no-nginx

# Deploy โดยไม่มีทั้งสอง
suthep deploy --no-https --no-nginx

# Deploy พร้อม environment variables
suthep deploy api -e NODE_ENV=production -e API_KEY=secret123

# Deploy พร้อม environment variables และ config แบบกำหนดเอง
suthep deploy -f production.yml -e DATABASE_URL=postgres://localhost/db -e REDIS_URL=redis://localhost
```

### สิ่งที่มันทำ

1. **โหลดการตั้งค่า** จาก `suthep.yml`
2. **เริ่ม Docker containers** (หากตั้งค่าแล้ว)
3. **ตั้งค่า Nginx** reverse proxy
4. **รับใบรับรอง SSL** (หากเปิดใช้งาน)
5. **อัปเดต Nginx** ด้วยการตั้งค่า HTTPS
6. **Reload Nginx** เพื่อใช้การเปลี่ยนแปลง
7. **ทำ health checks** (หากตั้งค่าแล้ว)

## suthep down

หยุดบริการ (หยุด containers และปิดการใช้งาน Nginx configs)

### การใช้งาน

```bash
suthep down [service-name] [options]
```

### อาร์กิวเมนต์

| อาร์กิวเมนต์ | คำอธิบาย |
|------------|----------|
| `service-name` | ชื่อของบริการที่จะหยุด (ไม่บังคับ) |

### ตัวเลือก

| ตัวเลือก | ตัวย่อ | คำอธิบาย | ค่าเริ่มต้น |
|---------|--------|----------|-----------|
| `--file` | `-f` | Path ไฟล์การตั้งค่า | `suthep.yml` |
| `--all` | - | หยุดบริการทั้งหมด | `false` |

### ตัวอย่าง

```bash
# หยุดบริการเฉพาะ
suthep down api

# หยุดบริการทั้งหมด
suthep down --all

# หยุดด้วย config แบบกำหนดเอง
suthep down api -f production.yml
```

### สิ่งที่มันทำ

1. **หยุด Docker containers** (หากตั้งค่าแล้ว)
2. **ปิดการใช้งานการตั้งค่า Nginx**
3. **Reload Nginx** เพื่อใช้การเปลี่ยนแปลง

## suthep up

เริ่มบริการ (เริ่ม containers และเปิดใช้งาน Nginx configs)

### การใช้งาน

```bash
suthep up [service-name] [options]
```

### อาร์กิวเมนต์

| อาร์กิวเมนต์ | คำอธิบาย |
|------------|----------|
| `service-name` | ชื่อของบริการที่จะเริ่ม (ไม่บังคับ) |

### ตัวเลือก

| ตัวเลือก | ตัวย่อ | คำอธิบาย | ค่าเริ่มต้น |
|---------|--------|----------|-----------|
| `--file` | `-f` | Path ไฟล์การตั้งค่า | `suthep.yml` |
| `--all` | - | เริ่มบริการทั้งหมด | `false` |
| `--no-https` | - | ข้ามการตั้งค่า HTTPS | `false` |
| `--no-nginx` | - | ข้ามการตั้งค่า Nginx | `false` |

### ตัวอย่าง

```bash
# เริ่มบริการเฉพาะ
suthep up api

# เริ่มบริการทั้งหมด
suthep up --all

# เริ่มโดยไม่มี HTTPS
suthep up api --no-https
```

### สิ่งที่มันทำ

1. **เริ่ม Docker containers** (หากตั้งค่าแล้ว)
2. **เปิดใช้งานการตั้งค่า Nginx**
3. **ตั้งค่า HTTPS** (หากเปิดใช้งาน)
4. **Reload Nginx** เพื่อใช้การเปลี่ยนแปลง

## ตัวเลือก Global

คำสั่งทั้งหมดรองรับ:

- `--help` หรือ `-h` - แสดงข้อความช่วยเหลือ
- `--version` หรือ `-V` - แสดงหมายเลขเวอร์ชัน

### ตัวอย่าง

```bash
# แสดงความช่วยเหลือสำหรับคำสั่ง deploy
suthep deploy --help

# แสดงเวอร์ชัน
suthep --version
```

## Workflow คำสั่ง

### Workflow การ Deploy ทั่วไป

```bash
# 1. เริ่มต้นการตั้งค่า
suthep init

# 2. ตั้งค่าสิ่งที่จำเป็น (ครั้งแรกเท่านั้น)
suthep setup

# 3. Deploy บริการ
suthep deploy
```

### Workflow การอัปเดต

```bash
# 1. แก้ไข suthep.yml
nano suthep.yml

# 2. Redeploy (หยุดและ deploy อีกครั้ง)
suthep down api && suthep deploy api

# หรือ redeploy บริการทั้งหมด
suthep down --all && suthep deploy
```

### Workflow การบำรุงรักษา

```bash
# หยุดบริการเพื่อการบำรุงรักษา
suthep down --all

# ... ทำการบำรุงรักษา ...

# เริ่มบริการอีกครั้ง
suthep up --all
```

## Exit Codes

Suthep ใช้ exit codes ต่อไปนี้:

- `0` - สำเร็จ
- `1` - ข้อผิดพลาด (ข้อผิดพลาดการตั้งค่า, การ deploy ล้มเหลว, ฯลฯ)

## การจัดการข้อผิดพลาด

หากคำสั่งล้มเหลว:

1. **ตรวจสอบข้อความข้อผิดพลาด** - มักจะระบุสิ่งที่ผิดพลาด
2. **ตรวจสอบการตั้งค่า** - ตรวจสอบว่า `suthep.yml` ถูกต้อง
3. **ตรวจสอบสิ่งที่จำเป็น** - ตรวจสอบว่า Nginx และ Certbot ติดตั้งแล้ว
4. **ตรวจสอบ logs** - ตรวจสอบ logs ของ Nginx และ Docker สำหรับรายละเอียด

## ขั้นตอนถัดไป

- [ตัวอย่าง](./06-examples.md) - ดูคำสั่งในการทำงาน
- [การแก้ปัญหา](./07-troubleshooting.md) - ปัญหาที่พบบ่อยและวิธีแก้ไข

---

**ก่อนหน้า:** [คู่มือการตั้งค่า](./04-configuration.md) | **ถัดไป:** [ตัวอย่าง →](./06-examples.md)

