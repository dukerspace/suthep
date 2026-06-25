# คู่มือการทดสอบ

Suthep ใช้ [Vitest](https://vitest.dev/) สำหรับ unit tests และ [vite-plugin-doctest](https://github.com/ssssota/doc-vitest) เพื่อให้ตัวอย่างในเอกสารรันได้จริง หน้านี้เป็นทั้งคู่มือผู้ใช้และชุดทดสอบแบบ live

## โครงสร้างโปรเจกต์

| Path | คำอธิบาย |
|------|----------|
| `packages/cli/src/**/__tests__/` | Unit tests อยู่ร่วมกับ source ของ CLI |
| `packages/cli/vitest.config.ts` | การตั้งค่า Vitest + doctest |
| `docs/09-testing.md` | ตัวอย่าง doctest ภาษาอังกฤษ |
| `docs/th/09-testing.md` | ตัวอย่าง doctest ภาษาไทย (ไฟล์นี้) |

## การติดตั้ง

Clone repository และติดตั้ง dependencies:

```bash
git clone https://github.com/dukerspace/suthep.git
cd suthep
pnpm install
```

## รัน Tests

```bash
# รัน tests ทั้งหมดครั้งเดียว (unit tests + ตัวอย่างในเอกสาร)
pnpm test

# โหมด watch ระหว่างพัฒนา
pnpm test:watch

# UI แบบ interactive
pnpm test:ui

# รายงาน coverage
pnpm test:coverage
```

รัน tests สำหรับ CLI package เท่านั้น:

```bash
pnpm --filter @suthep/cli test
```

## การเขียน Unit Tests

ไฟล์ test ใช้นามสกุล `.test.ts` และ API ของ Vitest (`describe` / `it` / `expect`):

```typescript
import { describe, it, expect } from 'vitest'

describe('myFeature', () => {
  it('should work correctly', () => {
    expect(true).toBe(true)
  })
})
```

วาง tests ใน `packages/cli/src/**/__tests__/` ข้างโค้ดที่ทดสอบ ดูตัวอย่างใน `config-loader.test.ts` และ `service-finder.test.ts` สำหรับรูปแบบการ mock `fs-extra`, `execa` และ I/O อื่นๆ

## Documentation Tests (Doctest)

บล็อกโค้ดที่มี `@import.meta.vitest` ในไฟล์นี้จะถูก Vitest รันเมื่อคุณใช้ `pnpm test` ทำให้ตัวอย่างสอดคล้องกับ implementation เสมอ

### ค้นหา service ตามชื่อ

คำสั่ง `suthep logs` และ `suthep restart` แก้ service ตามชื่อหรือ index แบบ 1-based ฟังก์ชัน `findServiceByIdentifier` ทำหน้าที่นี้:

```ts:find-by-name.md@import.meta.vitest
const { findServiceByIdentifier } = await import('../../../packages/cli/src/utils/service-finder.ts')
const service = findServiceByIdentifier(sampleConfig, 'api')
expect(service?.name).toBe('api')
```

### ค้นหา service ตาม index

```ts:find-by-index.md@import.meta.vitest
const { findServiceByIdentifier } = await import('../../../packages/cli/src/utils/service-finder.ts')
const service = findServiceByIdentifier(sampleConfig, '2')
expect(service?.name).toBe('web')
```

### แสดงรายการ service ที่มี

เมื่อไม่พบ service CLI จะแสดงรายการแบบมีเลข สร้างโดย `getAvailableServicesList`:

```ts:service-list.md@import.meta.vitest
const { getAvailableServicesList } = await import('../../../packages/cli/src/utils/service-finder.ts')
const list = getAvailableServicesList(sampleConfig)
expect(list).toContain('1. api')
expect(list).toContain('2. web')
```

### ข้อความเมื่อไม่พบ service

```ts:service-not-found.md@import.meta.vitest
const { getServiceNotFoundError } = await import('../../../packages/cli/src/utils/service-finder.ts')
const message = getServiceNotFoundError('missing', sampleConfig)
expect(message).toContain('Service "missing" not found')
expect(message).toContain('1. api')
```

## การรวมกับ CI

รวม tests ใน pipeline ก่อน `suthep deploy`:

```bash
pnpm test
suthep deploy
```

ตัวอย่างขั้นตอน GitHub Actions:

```yaml
- run: pnpm install
- run: pnpm test
```

## ขั้นตอนถัดไป

- ดู [ตัวอย่าง](./06-examples.md) สำหรับสถานการณ์ deploy
- ดู [หัวข้อขั้นสูง](./08-advanced.md) สำหรับ CI/CD และ automation
- ดู [การแก้ปัญหา](./07-troubleshooting.md) หาก tests ล้มเหลวในเครื่อง

---

**ก่อนหน้า:** [หัวข้อขั้นสูง](./08-advanced.md) | **กลับไป:** [หน้าแรก](/th/)
