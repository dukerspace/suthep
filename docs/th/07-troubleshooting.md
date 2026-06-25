# คู่มือการแก้ปัญหา

คู่มือนี้ช่วยให้คุณแก้ปัญหาที่พบบ่อยเมื่อใช้ Suthep

## ปัญหาที่พบบ่อย

### ไม่พบไฟล์การตั้งค่า

**ข้อผิดพลาด:**
```
Configuration file not found: suthep.yml
```

**วิธีแก้ไข:**
1. ตรวจสอบว่าคุณอยู่ในไดเรกทอรีที่ถูกต้อง
2. ตรวจสอบว่า `suthep.yml` มีอยู่:
   ```bash
   ls -la suthep.yml
   ```
3. สร้างไฟล์การตั้งค่า:
   ```bash
   suthep init
   ```
4. หรือระบุ path แบบกำหนดเอง:
   ```bash
   suthep deploy -f /path/to/config.yml
   ```

### พอร์ตถูกใช้งานอยู่แล้ว

**ข้อผิดพลาด:**
```
Error: Port 3000 is already in use
```

**วิธีแก้ไข:**
1. ค้นหาสิ่งที่ใช้พอร์ต:
   ```bash
   sudo lsof -i :3000
   # หรือ
   sudo netstat -tulpn | grep 3000
   ```

2. หยุดบริการที่ขัดแย้งหรือเปลี่ยนพอร์ตใน `suthep.yml`:
   ```yaml
   services:
     - name: api
       port: 3001  # เปลี่ยนจาก 3000
   ```

### การสร้างใบรับรอง SSL ล้มเหลว

**ข้อผิดพลาด:**
```
Failed to obtain SSL certificate for example.com
```

**วิธีแก้ไข:**

1. **ตรวจสอบการตั้งค่า DNS**
   ```bash
   nslookup example.com
   # ตรวจสอบว่าโดเมนชี้ไปที่ IP เซิร์ฟเวอร์ของคุณ
   ```

2. **ตรวจสอบว่าพอร์ตเปิดอยู่**
   ```bash
   # ตรวจสอบว่าพอร์ต 80 และ 443 เปิดอยู่
   sudo ufw status
   # หรือ
   sudo iptables -L
   ```

3. **ใช้โหมด Staging สำหรับการทดสอบ**
   ```yaml
   certbot:
     staging: true  # ใช้ staging เพื่อหลีกเลี่ยง rate limits
   ```

4. **ตรวจสอบการเข้าถึงโดเมน**
   ```bash
   curl -I http://example.com
   # ควรคืนค่า HTTP response
   ```

5. **ตรวจสอบ Logs ของ Certbot**
   ```bash
   sudo tail -f /var/log/letsencrypt/letsencrypt.log
   ```

### ข้อผิดพลาดการตั้งค่า Nginx

**ข้อผิดพลาด:**
```
nginx: configuration file /etc/nginx/nginx.conf test failed
```

**วิธีแก้ไข:**

1. **ทดสอบการตั้งค่า Nginx**
   ```bash
   sudo nginx -t
   ```

2. **ตรวจสอบ Error Logs ของ Nginx**
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

3. **ตรวจสอบไฟล์ Config ที่สร้างขึ้น**
   ```bash
   ls -la /etc/nginx/sites-available/
   cat /etc/nginx/sites-available/example_com.conf
   ```

4. **ตรวจสอบไวยากรณ์ Nginx**
   ```bash
   sudo nginx -t -c /etc/nginx/nginx.conf
   ```

### ปัญหา Docker Container

**ข้อผิดพลาด:**
```
Error: Docker container failed to start
```

**วิธีแก้ไข:**

1. **ตรวจสอบสถานะ Docker**
   ```bash
   docker ps
   docker ps -a  # แสดง containers ทั้งหมด
   ```

2. **ตรวจสอบ Logs ของ Container**
   ```bash
   docker logs <container-name>
   ```

3. **ตรวจสอบ Docker Image**
   ```bash
   docker images
   docker pull <image-name>  # Pull image ล่าสุด
   ```

4. **ตรวจสอบความขัดแย้งของพอร์ต**
   ```bash
   docker ps | grep <port>
   ```

5. **ลบ Containers เก่า**
   ```bash
   docker rm <container-name>
   ```

### Health Check ล้มเหลว

**ข้อผิดพลาด:**
```
Health check failed for service api
```

**วิธีแก้ไข:**

1. **ตรวจสอบ Health Check Endpoint**
   ```bash
   curl http://localhost:3000/health
   ```

2. **ตรวจสอบว่าบริการกำลังรัน**
   ```bash
   # สำหรับ Docker
   docker ps
   docker logs <container-name>

   # สำหรับ non-Docker
   ps aux | grep <service>
   ```

3. **เพิ่ม Health Check Timeout**
   ```yaml
   deployment:
     healthCheckTimeout: 60000  # เพิ่มเป็น 60 วินาที
   ```

4. **ตรวจสอบ Health Check Path**
   ```yaml
   services:
     - name: api
       healthCheck:
         path: /health  # ตรวจสอบว่า path นี้มีอยู่
   ```

### ข้อผิดพลาด Permission Denied

**ข้อผิดพลาด:**
```
Permission denied: /etc/nginx/sites-available/example.conf
```

**วิธีแก้ไข:**

1. **ใช้ Sudo**
   ```bash
   sudo suthep deploy
   ```

2. **ตรวจสอบสิทธิ์ไฟล์**
   ```bash
   ls -la /etc/nginx/sites-available/
   ```

3. **ตรวจสอบสิทธิ์ผู้ใช้**
   ```bash
   groups  # ตรวจสอบกลุ่มผู้ใช้ของคุณ
   ```

### บริการไม่สามารถเข้าถึงได้

**ปัญหา:** บริการ deploy แล้วแต่ไม่สามารถเข้าถึงผ่านโดเมนได้

**วิธีแก้ไข:**

1. **ตรวจสอบสถานะ Nginx**
   ```bash
   sudo systemctl status nginx
   ```

2. **ตรวจสอบว่า Site เปิดใช้งาน**
   ```bash
   ls -la /etc/nginx/sites-enabled/
   # ควรมี symlink ไปยัง sites-available config
   ```

3. **ตรวจสอบ DNS Resolution**
   ```bash
   nslookup example.com
   dig example.com
   ```

4. **ทดสอบการเชื่อมต่อ Local**
   ```bash
   curl http://localhost:3000
   ```

5. **ตรวจสอบ Firewall**
   ```bash
   sudo ufw status
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   ```

### ปัญหา Zero-Downtime Deployment

**ปัญหา:** การ deploy ทำให้เกิด downtime

**วิธีแก้ไข:**

1. **ตรวจสอบกลยุทธ์การ Deploy**
   ```yaml
   deployment:
     strategy: rolling  # หรือ blue-green
   ```

2. **ตรวจสอบสุขภาพ Container**
   ```bash
   docker ps
   # ทั้ง container เก่าและใหม่ควรกำลังรันระหว่างการ deploy
   ```

3. **ตรวจสอบ Nginx Reload**
   ```bash
   sudo nginx -t  # ทดสอบก่อน reload
   sudo systemctl reload nginx  # Graceful reload
   ```

### หลายบริการบนโดเมนเดียวกัน

**ปัญหา:** Path-based routing ไม่ทำงาน

**วิธีแก้ไข:**

1. **ตรวจสอบการตั้งค่า Path**
   ```yaml
   services:
     - name: api
       path: /api  # ตรวจสอบว่า path ถูกตั้งค่า
     - name: ui
       path: /     # Root path
   ```

2. **ตรวจสอบ Nginx Config**
   ```bash
   cat /etc/nginx/sites-available/example_com.conf
   # ควรมี location blocks สำหรับแต่ละ path
   ```

3. **ทดสอบ Paths**
   ```bash
   curl http://example.com/api/health
   curl http://example.com/
   ```

## เคล็ดลับการ Debug

### เปิดใช้งาน Verbose Output

คำสั่งบางคำสั่งรองรับ verbose output ตรวจสอบ logs:

```bash
# ตรวจสอบ logs ของ Nginx
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# ตรวจสอบ logs ของ Docker
docker logs <container-name>

# ตรวจสอบ system logs
sudo journalctl -u nginx -f
```

### ทดสอบการตั้งค่า

ก่อน deploy ทดสอบการตั้งค่าของคุณ:

```bash
# ตรวจสอบความถูกต้องของไวยากรณ์ YAML
yamllint suthep.yml

# ทดสอบ config ของ Nginx
sudo nginx -t

# ทดสอบ Docker image
docker run --rm <image-name>
```

### การ Deploy แบบทีละขั้นตอน

Deploy ทีละขั้นตอนเพื่อแยกปัญหา:

```bash
# 1. Deploy โดยไม่มี Nginx
suthep deploy --no-nginx

# 2. Deploy โดยไม่มี HTTPS
suthep deploy --no-https

# 3. Full deployment
suthep deploy
```

## ขอความช่วยเหลือ

หากคุณยังพบปัญหา:

1. **ตรวจสอบ Logs**
   - Nginx: `/var/log/nginx/`
   - Certbot: `/var/log/letsencrypt/`
   - Docker: `docker logs <container>`

2. **ตรวจสอบการตั้งค่า**
   - ตรวจสอบไวยากรณ์ `suthep.yml`
   - ตรวจสอบว่าฟิลด์ที่จำเป็นทั้งหมดมีอยู่
   - ตรวจสอบความถูกต้องของหมายเลขพอร์ตและโดเมน

3. **ทดสอบส่วนประกอบทีละอย่าง**
   - ทดสอบ Nginx ด้วยตนเอง
   - ทดสอบ Docker containers
   - ทดสอบใบรับรอง SSL

4. **ตรวจสอบทรัพยากรระบบ**
   ```bash
   # ตรวจสอบพื้นที่ดิสก์
   df -h

   # ตรวจสอบหน่วยความจำ
   free -h

   # ตรวจสอบ CPU
   top
   ```

## การป้องกัน

เพื่อหลีกเลี่ยงปัญหาที่พบบ่อย:

1. **ใช้ Staging สำหรับการทดสอบ**
   ```yaml
   certbot:
     staging: true
   ```

2. **ตรวจสอบความถูกต้องของการตั้งค่า**
   ```bash
   suthep init  # การตรวจสอบแบบโต้ตอบ
   ```

3. **ทดสอบก่อน Production**
   - ทดสอบในสภาพแวดล้อม staging ก่อน
   - ตรวจสอบว่าบริการทั้งหมดทำงานแยกกัน
   - ทดสอบกระบวนการ deploy

4. **ตรวจสอบ Health Checks**
   - ตั้งค่าช่วงเวลาที่เหมาะสม
   - ตรวจสอบ health check endpoints
   - ตั้งค่า timeout ที่สมเหตุสมผล

## ขั้นตอนถัดไป

- [หัวข้อขั้นสูง](./08-advanced.md) - การตั้งค่าและเพิ่มประสิทธิภาพขั้นสูง
- [ตัวอย่าง](./06-examples.md) - ตรวจสอบตัวอย่างที่ทำงาน

---

**ก่อนหน้า:** [ตัวอย่าง](./06-examples.md) | **ถัดไป:** [หัวข้อขั้นสูง →](./08-advanced.md)

