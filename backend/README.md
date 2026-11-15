# Recognition 2027 – Backend

> ⚠️ **โฟลเดอร์นี้เป็น mock backend (ข้อมูลปลอมทั้งหมด)** ไว้ทดสอบ frontend โดยไม่ต้องใช้ข้อมูลบริษัท
> API เหมือน backend จริงทุกอย่าง (path, พอร์ต, รูปแบบ JSON, shift_code, image-cache)
> ตอนใช้จริงให้ใช้ **backend ของบริษัท** (`main.go` + `emp_old.db`) และดู [`PATCH_REAL_BACKEND.md`](PATCH_REAL_BACKEND.md) ⭐

---

## สารบัญ
1. [รัน mock backend](#1-รัน-mock-backend)
2. [ไฟล์ในโฟลเดอร์นี้](#2-ไฟล์ในโฟลเดอร์นี้)
3. [API](#3-api)
4. [การตั้งค่า (.env)](#4-การตั้งค่า-env)
5. [รูปพนักงาน / image-cache / preload](#5-รูปพนักงาน--image-cache--preload)
6. [Checklist ก่อนวันงาน (offline)](#6-checklist-ก่อนวันงาน-offline)
7. [ตัด director / internship](#7-ตัด-director--internship)
8. [ความต่างระหว่าง mock กับ backend จริง](#8-ความต่างระหว่าง-mock-กับ-backend-จริง)

---

## 1. รัน mock backend

ต้องมี **Go 1.24+** · ไม่ต้องใช้ฐานข้อมูล ไม่ต้องต่อเน็ต (ใช้แต่ standard library)

```bash
cd backend
go run .                     # http://localhost:4000
```

แล้วเปิด frontend (`cd ../frontend && npm run dev`) — frontend ส่ง request มาที่พอร์ต 4000 ให้เอง

ทดสอบด้วย curl:
```bash
curl localhost:4000/api/health
curl "localhost:4000/random?round=A"
```

---

## 2. ไฟล์ในโฟลเดอร์นี้

```
backend/
├── main.go                 server + API ทั้งหมด (เลียนแบบ backend จริง)
├── mock_data.go            สร้างพนักงานปลอม 333 คน (ชื่อไทย/อังกฤษ สุ่มแบบ seed คงที่)
├── go.mod                  Go module (ไม่มี dependency ภายนอก)
├── .env.example            ตัวอย่างค่าตั้ง — ก๊อปเป็น .env แล้วแก้
├── exclude_gids.txt        รายชื่อ gid ที่ไม่ร่วมสุ่ม (บรรทัดละ 1 gid)
├── image-cache/            รูปพนักงานแบบ cache: <gid>.txt (ข้างในเป็น data:image/...;base64,...)
├── output/                 ผลสุ่มทุกครั้ง: random_<วันเวลา>.json
├── PATCH_REAL_BACKEND.md   ⭐ วิธีแก้ backend จริงให้รูปหายแล้วไม่ล้ม + โหมด OFFLINE
└── README.md               ไฟล์นี้
```

### `main.go` — ฟังก์ชันหลัก
| ฟังก์ชัน | ทำอะไร |
| --- | --- |
| `main` | โหลด `.env`, สร้างข้อมูลปลอม, ลงทะเบียน route, เปิด server |
| `rounds` (ตัวแปร) | เงื่อนไข shift_code + จำนวนคนของแต่ละรอบ (เหมือน `WHERE` ใน backend จริง) |
| `randomHandler` | `GET /random` สุ่มตามรอบ + บันทึกไฟล์ใน `output/` |
| `poolHandler` | `GET /pool` รายชื่อสุ่มๆ สำหรับแอนิเมชันหมุนของ frontend |
| `sample` | กรองตามรอบ → ตัดคนที่ต้องตัดออก → สุ่มลำดับ → เอา n คน → ใส่รูป |
| `excluded` | ตัด director / intern (ตาม `EXCLUDE_SHIFT_CODES` และ `exclude_gids.txt`) |
| `picture` | หารูปจาก `image-cache/<gid>.txt` ถ้าไม่มี → avatar ปลอม (หรือค่าว่างถ้า `MOCK_AVATAR=off`) |
| `mockAvatar` | สร้างรูป SVG สีๆ พร้อมตัวอักษรแรกของชื่อ |
| `saveSnapshot` | เขียนผลสุ่มเป็น JSON ใน `output/` (ไม่รวมรูป ไฟล์จะได้เล็ก) |
| `cors`, `writeJSON`, `envOrDefault`, `loadDotEnv`, … | ตัวช่วยทั่วไป |

### `mock_data.go`
- `mockCounts` — จำนวนพนักงานปลอมต่อ shift_code (A/B/C แยกปกติ + MH, Office, Director, Intern)
- `mockEmployees()` — สร้างรายชื่อ ใช้ seed คงที่ (`2027`) รันกี่ครั้งก็ได้คนชุดเดิม

---

## 3. API

ทุก endpoint ตอบ JSON และเปิด CORS (`*`)

### `GET /api/health`
```json
{ "status": "ok" }
```

### `GET /random?round=A|B|C|OFFICE` — สุ่มผู้โชคดี
| round | เงื่อนไข shift_code | จำนวน |
| --- | --- | --- |
| `A` | `THAI-TDA`, `THAI-TDAMH` | 35 |
| `B` | `THAI-TDB`, `THAI-TDBMH` | 35 |
| `C` | `THAI-TDC`, `THAI-TDCMH` | 35 |
| `OFFICE` | ขึ้นต้น `THAI-O` | 15 |

```json
{
  "saved": true,
  "file": "random_2026-11-15-19-59-58.json",
  "count": 35,
  "data": [
    {
      "gid": "661169",
      "full_name": "Prasert Chaimongkol",
      "th_fname": "ประเสริฐ",
      "th_lname": "ชัยมงคล",
      "shift_code": "THAI-TDA",
      "PiCTURE": "661169",
      "picture_base64": "data:image/svg+xml;base64,...."
    }
  ]
}
```
- **เรียกกี่ครั้งก็สุ่มใหม่ทุกครั้ง** (เหมือนของจริง) — frontend เรียกแค่ครั้งเดียวต่อรอบแล้วล็อกผลไว้เอง
- `picture_base64` ไม่มี/ว่าง → frontend ใช้รูป placeholder
- round ไม่ถูกต้อง → `400 {"error": "unsupported round \"X\""}`

### `GET /pool?round=A&limit=40` — (เฉพาะ mock, ไม่บังคับ)
รายชื่อพนักงานสุ่มๆ ของรอบนั้น ใช้ทำแอนิเมชันหมุนให้เห็นหน้าคนหลากหลาย
**backend จริงยังไม่มี** — ถ้าไม่มี frontend จะหมุนจากรายชื่อผู้โชคดีแทน (ใช้ได้ปกติ)
```json
{ "count": 40, "data": [ /* employee */ ] }
```

### `GET /all` — จำนวนพนักงานทั้งหมด
```json
{ "count": 333 }
```

---

## 4. การตั้งค่า (.env)

ก๊อป `.env.example` เป็น `.env` แล้วแก้ (หรือตั้งเป็น environment variable)

| ตัวแปร | ค่าเริ่มต้น | ความหมาย |
| --- | --- | --- |
| `PORT` | `4000` | พอร์ตของ server |
| `EXCLUDE_SHIFT_CODES` | `THAI-ODIR,THAI-OINT` | shift_code ที่ไม่ร่วมสุ่ม (ค่าสมมติของ mock) |
| `EXCLUDE_GIDS_FILE` | `exclude_gids.txt` | ไฟล์รายชื่อ gid ที่ไม่ร่วมสุ่ม |
| `IMAGE_CACHE_DIR` | `image-cache` | โฟลเดอร์รูป cache |
| `OUTPUT_DIR` | `output` | โฟลเดอร์เก็บผลสุ่ม |
| `MOCK_AVATAR` | (เปิด) | `off` = ไม่สร้าง avatar ปลอม → จำลองรูปหาย ใช้ทดสอบรูป placeholder ของ frontend |

---

## 5. รูปพนักงาน / image-cache / preload

backend จริงทำงานกับรูปแบบนี้ (mock อ่าน cache รูปแบบเดียวกัน):

```
ขอรูปของ gid X
   ├─ มี image-cache/X.txt ?  → ใช้เลย (เร็ว ไม่ต้องใช้เน็ต)
   └─ ไม่มี → ดาวน์โหลดจากเซิร์ฟเวอร์รูปบริษัท → แปลงเป็น base64 → เก็บลง image-cache/X.txt
```

- ไฟล์ `.txt` ข้างในคือ data URL เช่น `data:image/jpeg;base64,/9j/4AAQ...`
- **`go run . preload`** (backend จริง) = ดาวน์โหลดรูปพนักงาน **ทุกคน** ลง cache ไว้ล่วงหน้า
  → ต้องรันตอนยังต่อเน็ตได้ เพราะวันงานเป็น offline
- เพราะงั้น frontend **ไม่ต้องมีปุ่ม preload** — รูปมากับ `/random` เป็น base64 อยู่แล้ว และ frontend ไม่โหลดอะไรจากอินเทอร์เน็ต

### ⚠️ ปัญหาของ backend จริงตอนนี้ → ต้องแก้ตาม [`PATCH_REAL_BACKEND.md`](PATCH_REAL_BACKEND.md)
ถ้าคนที่ถูกสุ่มได้ไม่มีรูปใน cache แม้แต่คนเดียว แล้ววันงานไม่มีเน็ต → `/random` ตอบ 502 → **สุ่มรอบนั้นไม่ได้**
หลังแก้: รูปหาย → log + ส่งรูปว่าง → frontend ใช้ placeholder → สุ่มต่อได้ และมี `OFFLINE=1` กันค้างรอ timeout

---

## 6. Checklist ก่อนวันงาน (offline)

**ตอนยังมีเน็ต (ก่อนวันงาน)**
- [ ] แก้ backend จริงตาม `PATCH_REAL_BACKEND.md` แล้ว `go build` ผ่าน
- [ ] `go run . preload` บนเครื่องที่จะใช้จริง → ดูสรุป `pictures ready X/Y`
- [ ] เปิด `output/preload_missing.txt` (ถ้ามี) ดูว่าใครไม่มีรูป → แจ้ง HR หรือยอมใช้ placeholder
- [ ] frontend: `npm install` (ต้องใช้เน็ต) แล้ว `npm run build` ให้ผ่าน
- [ ] ยืนยันเงื่อนไขตัด director / intern (หัวข้อ 7)

**ซ้อม offline**
- [ ] ถอดสาย LAN / ปิด Wi-Fi
- [ ] รัน backend ด้วย `OFFLINE=1` (PowerShell: `$env:OFFLINE="1"; go run .`)
- [ ] เปิด frontend สุ่มครบ 4 รอบ ดูว่ารูปขึ้น / Export CSV ได้
- [ ] กด ↺ รีเซ็ต (ซ้อม) ในหน้า frontend เพื่อล้างผลซ้อม

**วันงาน**
- [ ] เปิด backend (`OFFLINE=1`) → เปิด frontend → เปิด `?screen=main` และ `?screen=side`
- [ ] จบงาน: Export CSV + สำรองโฟลเดอร์ `output/`

---

## 7. ตัด director / internship

ข้อกำหนด: **director และ internship ต้องไม่ถูกสุ่ม**

- **backend จริงตอนนี้ยังไม่ได้ตัด** — ตาราง `employees` ไม่มีคอลัมน์ตำแหน่ง และรอบ OFFICE ดึงทุกคนที่ shift_code ขึ้นต้น `THAI-O`
- ต้องหาให้ได้ว่าในข้อมูลจริงแยก director / intern ด้วยอะไร (shift_code เฉพาะ? รหัส gid? ตารางอื่น?) แล้วเพิ่มเงื่อนไขใน `randomEmployees` เช่น
  ```go
  whereClause, limit = "shift_code LIKE 'THAI-O%' AND gid NOT IN (SELECT gid FROM excluded)", 15
  ```
- mock นี้สาธิตไว้ 2 วิธี: ตัดตาม shift_code (`EXCLUDE_SHIFT_CODES`) และตามรายชื่อ gid (`exclude_gids.txt`)
- frontend **ไม่ได้กรอง** — ต้องทำที่ backend เท่านั้น

---

## 8. ความต่างระหว่าง mock กับ backend จริง

| | mock (โฟลเดอร์นี้) | backend จริง |
| --- | --- | --- |
| ข้อมูล | สร้างปลอม 333 คน | `emp_old.db` (SQLite) ตาราง `employees` |
| dependency | ไม่มี | `modernc.org/sqlite` |
| รูป | `image-cache/<gid>.txt` หรือ avatar ปลอม | `image-cache/<gid>.txt` หรือดาวน์โหลดจากเซิร์ฟเวอร์บริษัท |
| `go run . preload` | ไม่มี | มี (ดาวน์โหลดรูปทุกคนลง cache) |
| `/pool` | มี | ไม่มี (ไม่บังคับ) |
| `/employee-images/` | ไม่มี | มี (เสิร์ฟโฟลเดอร์ `images`) — frontend ไม่ได้ใช้ |
| ตัด director / intern | มี (ค่าสมมติ) | **ยังไม่มี** — ต้องเพิ่ม |
| รูปหายแล้วไม่ล้ม | ✅ | ต้องแก้ตาม `PATCH_REAL_BACKEND.md` |
