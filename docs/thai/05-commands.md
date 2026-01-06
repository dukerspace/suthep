# คำสั่งอ้างอิง

คู่มือนี้ครอบคลุมคำสั่ง Suthep ทั้งหมดที่มีและตัวเลือกของพวกเขา

## ภาพรวมคำสั่ง

Suthep ให้คำสั่งต่อไปนี้:

- `suthep init` - เริ่มต้นไฟล์การตั้งค่า
- `suthep setup` - ตั้งค่าสิ่งที่จำเป็น
- `suthep deploy` - Deploy บริการ
- `suthep down` - หยุดบริการ
- `suthep up` - เริ่มบริการ
- `suthep restart` - รีสตาร์ทบริการ
- `suthep list` - แสดงรายการบริการทั้งหมดและสถานะ
- `suthep logs` - ดู logs ของบริการ

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
| `service-name` | ชื่อหรือ index (1-based) ของบริการที่จะ deploy (ไม่บังคับ, จะ deploy บริการทั้งหมดหากไม่ระบุ). ใช้ `suthep list` เพื่อดูบริการที่มีพร้อม index |

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

# Deploy บริการเฉพาะด้วยชื่อ
suthep deploy api

# Deploy บริการเฉพาะด้วย index (ดู index ด้วย `suthep list`)
suthep deploy 1

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
| `service-name` | ชื่อหรือ index (1-based) ของบริการที่จะหยุด (ไม่บังคับ). ใช้ `suthep list` เพื่อดูบริการที่มีพร้อม index |

### ตัวเลือก

| ตัวเลือก | ตัวย่อ | คำอธิบาย | ค่าเริ่มต้น |
|---------|--------|----------|-----------|
| `--file` | `-f` | Path ไฟล์การตั้งค่า | `suthep.yml` |
| `--all` | - | หยุดบริการทั้งหมด | `false` |

### ตัวอย่าง

```bash
# หยุดบริการเฉพาะด้วยชื่อ
suthep down api

# หยุดบริการเฉพาะด้วย index
suthep down 1

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
| `service-name` | ชื่อหรือ index (1-based) ของบริการที่จะเริ่ม (ไม่บังคับ). ใช้ `suthep list` เพื่อดูบริการที่มีพร้อม index |

### ตัวเลือก

| ตัวเลือก | ตัวย่อ | คำอธิบาย | ค่าเริ่มต้น |
|---------|--------|----------|-----------|
| `--file` | `-f` | Path ไฟล์การตั้งค่า | `suthep.yml` |
| `--all` | - | เริ่มบริการทั้งหมด | `false` |
| `--no-https` | - | ข้ามการตั้งค่า HTTPS | `false` |
| `--no-nginx` | - | ข้ามการตั้งค่า Nginx | `false` |

### ตัวอย่าง

```bash
# เริ่มบริการเฉพาะด้วยชื่อ
suthep up api

# เริ่มบริการเฉพาะด้วย index
suthep up 1

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

## suthep restart

รีสตาร์ทบริการ (หยุดและเริ่ม containers อีกครั้ง, อัปเดต Nginx configs)

### การใช้งาน

```bash
suthep restart [service-name] [options]
```

### อาร์กิวเมนต์

| อาร์กิวเมนต์ | คำอธิบาย |
|------------|----------|
| `service-name` | ชื่อหรือ index (1-based) ของบริการที่จะรีสตาร์ท (ไม่บังคับ). ใช้ `suthep list` เพื่อดูบริการที่มีพร้อม index |

### ตัวเลือก

| ตัวเลือก | ตัวย่อ | คำอธิบาย | ค่าเริ่มต้น |
|---------|--------|----------|-----------|
| `--file` | `-f` | Path ไฟล์การตั้งค่า | `suthep.yml` |
| `--all` | - | รีสตาร์ทบริการทั้งหมด | `false` |
| `--no-https` | - | ข้ามการตั้งค่า HTTPS | `false` |
| `--no-nginx` | - | ข้ามการตั้งค่า Nginx | `false` |

### ตัวอย่าง

```bash
# รีสตาร์ทบริการเฉพาะด้วยชื่อ
suthep restart api

# รีสตาร์ทบริการเฉพาะด้วย index
suthep restart 1

# รีสตาร์ทบริการทั้งหมด
suthep restart --all

# รีสตาร์ทโดยไม่มี HTTPS
suthep restart api --no-https

# รีสตาร์ทโดยไม่อัปเดต Nginx
suthep restart api --no-nginx

# รีสตาร์ทด้วย config แบบกำหนดเอง
suthep restart api -f production.yml
```

### สิ่งที่มันทำ

1. **หยุด Docker containers** (หากกำลังทำงาน)
2. **เริ่ม Docker containers** อีกครั้ง
3. **รอ health checks** (หากตั้งค่าแล้ว)
4. **อัปเดตการตั้งค่า Nginx**
5. **ตั้งค่า HTTPS** (หากเปิดใช้งาน)
6. **Reload Nginx** เพื่อใช้การเปลี่ยนแปลง

## suthep list

แสดงรายการบริการทั้งหมดและสถานะ (running, stopped, สถานะ container, การตั้งค่า Nginx)

### การใช้งาน

```bash
suthep list [options]
# หรือ
suthep ls [options]
```

### ตัวเลือก

| ตัวเลือก | ตัวย่อ | คำอธิบาย | ค่าเริ่มต้น |
|---------|--------|----------|-----------|
| `--file` | `-f` | Path ไฟล์การตั้งค่า | `suthep.yml` |

### ตัวอย่าง

```bash
# แสดงรายการบริการทั้งหมด
suthep list

# ใช้ alias
suthep ls

# แสดงรายการด้วยไฟล์ config แบบกำหนดเอง
suthep list -f production.yml
```

### สิ่งที่มันทำ

1. **โหลดการตั้งค่า** จาก `suthep.yml`
2. **ตรวจสอบสถานะ Docker container** สำหรับแต่ละบริการ (หากตั้งค่าแล้ว)
3. **ตรวจสอบสถานะการตั้งค่า Nginx** สำหรับแต่ละบริการ
4. **แสดงตารางที่จัดรูปแบบ** แสดง:
   - หมายเลข index ของบริการ (1, 2, 3...)
   - ชื่อบริการ
   - สถานะโดยรวม (Running/Stopped/Partial)
   - หมายเลขพอร์ต
   - ชื่อ container และสถานะ
   - สถานะการตั้งค่า Nginx
   - ชื่อโดเมน
5. **แสดงสถิติสรุป** (running, stopped, total)

### รูปแบบ Output

คำสั่งจะแสดงตารางที่มีสี:

- **● Running** (สีเขียว) - บริการทำงานเต็มที่ (container ทำงาน + Nginx เปิดใช้งาน)
- **○ Stopped** (สีแดง) - บริการหยุดทำงาน (container หยุด + Nginx ปิดใช้งาน)
- **⚠ Partial** (สีเหลือง) - สถานะผสม (เช่น container ทำงานแต่ Nginx ไม่ได้เปิดใช้งาน)

### ตัวบ่งชี้สถานะ

- **สถานะ Container**: แสดงว่า Docker containers กำลังทำงานหรือหยุด
- **สถานะ Nginx**: แสดงว่าการตั้งค่า Nginx เปิดใช้งาน ปิดใช้งาน หรือไม่ได้ตั้งค่า
- **สถานะโดยรวม**: รวมสถานะ container และ Nginx เพื่อแสดงสถานะบริการที่สมบูรณ์

### หมายเหตุ

- **Service indices**: หมายเลข index ที่แสดงในรายการสามารถใช้กับคำสั่งอื่นๆ ได้ (เช่น `suthep restart 1` แทน `suthep restart api`)
- **การเลือกด้วย index**: คำสั่งบริการทั้งหมด (`deploy`, `up`, `down`, `restart`, `logs`) รองรับทั้งชื่อบริการและ index
- **Docker services**: สถานะขึ้นอยู่กับทั้ง container และการตั้งค่า Nginx
- **Non-Docker services**: สถานะขึ้นอยู่กับการตั้งค่า Nginx เท่านั้น
- **สถานะ Partial**: บ่งชี้ว่าบริการที่ตั้งค่าบางส่วน (เช่น container ทำงานแต่ Nginx ไม่ได้เปิดใช้งาน)
- คำสั่งจะตรวจสอบสถานะ container และไฟล์ระบบจริง ไม่ใช่แค่การตั้งค่า

## suthep logs

ดู logs สำหรับ Docker services ที่ทำงานในโปรเจกต์ของคุณ

### การใช้งาน

```bash
suthep logs [service-name] [options]
```

### อาร์กิวเมนต์

| อาร์กิวเมนต์ | คำอธิบาย |
|-------------|----------|
| `service-name` | ชื่อหรือ index (1-based) ของบริการที่ต้องการดู logs (ไม่บังคับ, แสดงทั้งหมดถ้าไม่ระบุ). ใช้ `suthep list` เพื่อดูบริการที่มีพร้อม index |

### ตัวเลือก

| ตัวเลือก | ตัวย่อ | คำอธิบาย | ค่าเริ่มต้น |
|---------|--------|----------|------------|
| `--file` | `-f` |  path ของไฟล์การตั้งค่า | `suthep.yml` |
| `--follow` | - | ติดตาม log output (เหมือน `tail -f`) | `false` |
| `--tail` | - | จำนวนบรรทัดที่จะแสดงจากท้าย logs | `100` |

### ตัวอย่าง

```bash
# แสดง logs สำหรับบริการทั้งหมด (100 บรรทัดล่าสุด)
suthep logs

# แสดง logs สำหรับบริการเฉพาะด้วยชื่อ
suthep logs api

# แสดง logs สำหรับบริการเฉพาะด้วย index
suthep logs 1

# ติดตาม logs สำหรับบริการทั้งหมด (streaming แบบ real-time)
suthep logs --follow

# ติดตาม logs สำหรับบริการเฉพาะ
suthep logs api --follow

# แสดง 50 บรรทัดล่าสุดสำหรับบริการเฉพาะ
suthep logs api --tail 50

# ติดตาม logs พร้อมกำหนด tail
suthep logs api --follow --tail 200
```

### สิ่งที่ทำ

1. **โหลดการตั้งค่า** จาก `suthep.yml`
2. **กรอง Docker services** (เฉพาะ Docker services เท่านั้นที่มี container logs)
3. **ตรวจสอบสถานะ container** (แสดง logs เฉพาะ containers ที่กำลังทำงาน)
4. **แสดง logs**:
   - ในโหมด non-follow: แสดง logs ล่าสุดและออก
   - ในโหมด follow: stream logs แบบ real-time จนกว่าจะถูกขัดจังหวะ (Ctrl+C)
5. **ใส่สีให้ output** ตามชื่อบริการเพื่อให้แยกแยะง่าย

### หมายเหตุ

- **Docker services เท่านั้น**: Logs มีให้เฉพาะสำหรับ services ที่มีการตั้งค่า Docker. Services ที่ไม่ใช่ Docker จะถูกข้ามพร้อมคำเตือน
- **Running containers เท่านั้น**: แสดง logs เฉพาะ containers ที่กำลังทำงานอยู่. Containers ที่หยุดทำงานจะถูกแสดงแยกต่างหาก
- **โหมด follow**: ใช้ `--follow` เพื่อ stream logs แบบ real-time. กด `Ctrl+C` เพื่อหยุด
- **หลาย services**: เมื่อดู logs สำหรับหลาย services แต่ละบรรทัด log จะมี prefix เป็นชื่อบริการในสีที่แตกต่างกัน
- **ตัวเลือก tail**: ตัวเลือก `--tail` ควบคุมจำนวนบรรทัดที่จะแสดงจากท้ายไฟล์ log. ใช้ได้ทั้งโหมด follow และ non-follow

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

# หรือแค่รีสตาร์ทบริการ
suthep restart api
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

