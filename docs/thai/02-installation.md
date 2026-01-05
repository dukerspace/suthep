# คู่มือการติดตั้ง

คู่มือนี้จะแนะนำคุณผ่านการติดตั้ง Suthep บนระบบของคุณ

## ความต้องการของระบบ

ก่อนติดตั้ง Suthep ตรวจสอบว่าระบบของคุณตรงตามความต้องการเหล่านี้:

- **Node.js** เวอร์ชัน 16 หรือสูงกว่า
- **npm**, **yarn**, หรือ **pnpm** package manager
- **สิทธิ์ sudo/administrator** (จำเป็นสำหรับการตั้งค่า Nginx และ Certbot)
- **ระบบปฏิบัติการ Linux** หรือ **macOS**

## การติดตั้ง Suthep

Suthep สามารถติดตั้งแบบ global โดยใช้ package manager ของ Node.js ใดก็ได้

### ใช้ npm

```bash
npm install -g suthep
```

### ใช้ yarn

```bash
yarn global add suthep
```

### ใช้ pnpm

```bash
pnpm add -g suthep
```

## ตรวจสอบการติดตั้ง

หลังจากติดตั้ง ตรวจสอบว่า Suthep ติดตั้งถูกต้อง:

```bash
suthep --version
```

คุณควรเห็นหมายเลขเวอร์ชัน (เช่น `0.1.0-beta.1`)

คุณยังสามารถตรวจสอบเมนูช่วยเหลือ:

```bash
suthep --help
```

## การติดตั้งสิ่งที่จำเป็น

Suthep ต้องการ Nginx และ Certbot เพื่อทำงาน คุณสามารถติดตั้งสิ่งเหล่านี้โดยอัตโนมัติโดยใช้คำสั่ง `setup`:

```bash
suthep setup
```

คำสั่งนี้จะ:
- ติดตั้ง Nginx (หากยังไม่ได้ติดตั้ง)
- ติดตั้ง Certbot (หากยังไม่ได้ติดตั้ง)
- ตั้งค่าการพึ่งพาระบบ

### การติดตั้งด้วยตนเอง (ไม่บังคับ)

หากคุณต้องการติดตั้งสิ่งที่จำเป็นด้วยตนเอง:

#### การติดตั้ง Nginx

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install -y nginx
```

**CentOS/RHEL:**
```bash
sudo yum install -y nginx
```

**macOS:**
```bash
brew install nginx
```

#### การติดตั้ง Certbot

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx
```

**CentOS/RHEL:**
```bash
sudo yum install -y certbot python3-certbot-nginx
```

**macOS:**
```bash
brew install certbot
```

## Docker (ไม่บังคับ)

หากคุณวางแผนจะ deploy Docker containers ติดตั้ง Docker:

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install -y docker.io
sudo systemctl start docker
sudo systemctl enable docker
```

**macOS:**
```bash
brew install docker
```

หรือดาวน์โหลด Docker Desktop จาก [docker.com](https://www.docker.com/products/docker-desktop)

## หลังการติดตั้ง

หลังจากติดตั้ง คุณพร้อมที่จะ:

1. **เริ่มต้นการตั้งค่าแรก:**
   ```bash
   suthep init
   ```

2. **หรือไปต่อที่คู่มือเริ่มต้นใช้งาน:**
   ดู [คู่มือเริ่มต้นใช้งาน](./03-quick-start.md)

## การแก้ปัญหาการติดตั้ง

### Command Not Found

หากคุณได้รับข้อผิดพลาด "command not found":

1. **ตรวจสอบการติดตั้ง Node.js:**
   ```bash
   node --version
   npm --version
   ```

2. **ตรวจสอบ global bin path:**
   ```bash
   npm config get prefix
   ```

3. **เพิ่ม npm global bin ไปที่ PATH** (หากจำเป็น):
   ```bash
   export PATH="$PATH:$(npm config get prefix)/bin"
   ```

### ข้อผิดพลาดสิทธิ์

หากคุณพบข้อผิดพลาดสิทธิ์:

1. **ใช้ sudo สำหรับการติดตั้งแบบ global:**
   ```bash
   sudo npm install -g suthep
   ```

2. **หรือตั้งค่า npm ให้ใช้ไดเรกทอรีอื่น:**
   ```bash
   mkdir ~/.npm-global
   npm config set prefix '~/.npm-global'
   export PATH=~/.npm-global/bin:$PATH
   ```

### ปัญหาการติดตั้ง Nginx/Certbot

หาก `suthep setup` ล้มเหลว:

1. **ตรวจสอบ package manager ของคุณ:**
   - Ubuntu/Debian: ตรวจสอบว่า `apt-get` พร้อมใช้งาน
   - CentOS/RHEL: ตรวจสอบว่า `yum` พร้อมใช้งาน
   - macOS: ตรวจสอบว่า Homebrew ติดตั้งแล้ว

2. **รัน setup พร้อม verbose output:**
   ```bash
   suthep setup --verbose
   ```

3. **ติดตั้งสิ่งที่จำเป็นด้วยตนเอง** (ดูการติดตั้งด้วยตนเองด้านบน)

## ขั้นตอนถัดไป

ตอนนี้ Suthep ติดตั้งแล้ว:

- [คู่มือเริ่มต้นใช้งาน](./03-quick-start.md) - Deploy บริการแรกของคุณ
- [คู่มือการตั้งค่า](./04-configuration.md) - เรียนรู้เกี่ยวกับตัวเลือกการตั้งค่า

---

**ก่อนหน้า:** [บทนำ](./01-introduction.md) | **ถัดไป:** [เริ่มต้นใช้งาน →](./03-quick-start.md)

