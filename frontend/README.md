# Recognition 2027 – Lucky Draw (Frontend)

เว็บสุ่มแจกทองให้พนักงาน 4 รอบ (กะ A / B / C รอบละ 35 คน + Office 15 คน รวม 120 คน)
แสดงบนจอ LED 2 หน้า:

- **จอหลัก** (`?screen=main`) สัดส่วน 3:2 (จอ LED 6×4 m) — ใช้กดสุ่มด้วย
- **จอข้าง** (`?screen=side`) สัดส่วน 1:2 — ทีมจอเอาไปแสดงทั้งซ้ายและขวาเอง

React 19 + TypeScript + Vite · ฟอนต์ Press Start 2P (ตัว pixel) + Kanit (ภาษาไทย) · ดีไซน์อยู่ที่ `docs/ui`

---

## สารบัญ
1. [เริ่มใช้งาน](#1-เริ่มใช้งาน)
2. [วิธีใช้วันงาน](#2-วิธีใช้วันงาน)
3. [โครงสร้างไฟล์ และแต่ละไฟล์ทำอะไร](#3-โครงสร้างไฟล์-และแต่ละไฟล์ทำอะไร)
4. [การทำงานภายใน (flow / state / ซิงก์จอ)](#4-การทำงานภายใน)
5. [อยากแก้ X ต้องไปแก้ที่ไฟล์ไหน](#5-อยากแก้-x-ต้องไปแก้ที่ไฟล์ไหน)
6. [API ที่ต้องมีใน backend](#6-api-ที่ต้องมีใน-backend)
7. [Build / Deploy](#7-build--deploy)
8. [ปัญหาที่เจอบ่อย](#8-ปัญหาที่เจอบ่อย)

---

## 1. เริ่มใช้งาน

ต้องมี **Node.js 20+** (ทดสอบกับ v22)

```bash
npm install
npm run dev          # เปิด http://localhost:5173
```

ต้องเปิด backend ไว้ด้วย (ค่าเริ่มต้น `http://localhost:4000`)
ถ้า backend อยู่ที่อื่น สร้างไฟล์ `.env.local` ในโฟลเดอร์ `frontend`:

```
VITE_BACKEND_URL=http://localhost:4000
```

> ในโปรเจกต์นี้มี `../backend` เป็น **mock backend (ข้อมูลปลอม)** ไว้ทดสอบ — รัน `cd ../backend && go run .`
> ตอนใช้จริงให้ชี้ไป backend ของบริษัทแทน

คำสั่งอื่นๆ

| คำสั่ง | ทำอะไร |
| --- | --- |
| `npm run dev` | รันโหมดพัฒนา (แก้โค้ดแล้วหน้าเว็บอัปเดตทันที) |
| `npm run build` | เช็ก TypeScript แล้ว build ไฟล์จริงไปที่ `dist/` |
| `npm run preview` | เปิดดูไฟล์ใน `dist/` (มี proxy ไป backend เหมือนตอน dev) |
| `npm run lint` | ตรวจโค้ดด้วย oxlint |

---

## 2. วิธีใช้วันงาน

### URL

| URL | ใช้ทำอะไร |
| --- | --- |
| `/` | หน้า **preview** เห็นจอหลัก + จอข้าง พร้อมปุ่มควบคุมทั้งหมด (ใช้เป็นหน้าคุมของ operator ได้) |
| `/?screen=main` | จอหลัก — **เปิดได้ที่เดียว** (เป็นตัวคุมการสุ่ม) |
| `/?screen=side` | จอข้าง |
| ต่อท้าย `&speed=10` | ซ้อมแบบเร่งเวลา 10 เท่า เช่น `/?speed=10` |

- จอหลักกับจอข้าง **ต้องเปิดในเบราว์เซอร์เดียวกัน เครื่องเดียวกัน** (คุยกันผ่าน `BroadcastChannel`)
- ถ้าเปิดจอหลักเป็นหน้าต่างแยก ให้ **ปิดหน้า `/` ก่อน** (เพราะในหน้า `/` ก็มีจอหลักอยู่ใน iframe จะกลายเป็นมีตัวคุม 2 ตัว)
- หน้าจอย่อ/ขยายตามขนาดหน้าต่างเอง โดยคงสัดส่วน (ส่วนเกินเป็นขอบดำ) กด F11 ให้เต็มจอ

### ปุ่มควบคุม

| ปุ่มในหน้า `/` | คีย์บนจอหลัก | ทำอะไร | ใช้ได้ตอนไหน |
| --- | --- | --- | --- |
| ▶ เริ่มสุ่มรอบนี้ | `Space` `Enter` `→` `PageDown` หรือคลิกจอ | เริ่มสุ่มรอบปัจจุบัน | ตอนรอสุ่ม (หน้า PRESS START) เท่านั้น |
| ⏭ รอบถัดไป | `N` | ไปรอบถัดไป / ไปหน้าจบงานหลังรอบ Office | ตอนจบรอบ (หน้า ROUND CLEAR) |
| 📜 หน้ารายชื่อตอนจบ | `L` | รายชื่อผู้โชคดี ค้างทีละรอบ เปลี่ยนทุก 10 วิ | หลังจบรอบสุดท้ายแล้ว |
| 🙏 หน้าขอบคุณ | `T` | หน้า THANK YOU ค้างไว้ (เช่น ตอนถ่ายรูป) | หลังจบรอบสุดท้ายแล้ว |
| ⬇ Export CSV (Excel) | `Ctrl+Shift+E` | ดาวน์โหลดรายชื่อผู้โชคดีเป็น CSV | ตลอดเวลา |
| ↺ รีเซ็ต (ซ้อม) | `Ctrl+Shift+Backspace` | ล้างผลสุ่มทั้งหมด เริ่มรอบ 1 ใหม่ (มีถามยืนยัน) | ตลอดเวลา — **ห้ามกดวันงานจริง** |

> ปุ่มเริ่มสุ่ม (Space/clicker) **ข้ามรอบไม่ได้** ตั้งใจไว้กันผู้บริหารกดเกิน — การไปรอบถัดไปต้องกด `N` เท่านั้น

### ลำดับวันงาน
1. **รอสุ่ม** — จอหลักขึ้น "35 WINNERS / PRESS START"
2. ผู้บริหารกด → เรียก backend **ครั้งเดียว** ได้ผู้โชคดีทั้งรอบ แล้วเก็บไว้ในเบราว์เซอร์
3. ทีละคน: **หมุน** รูป/ชื่อ 1.5 วิ → **เฉลย** (รูป + ชื่อ + gid) ค้าง 3 วิ → คนถัดไป
4. **จอข้าง**: คนที่เฉลยครบ 3 วิแล้วเข้าคิว ล่าสุดอยู่บน (6 5 4 3 2 1) ครบ 6 คนพลิกหน้าเป็น 12…7
5. **จบรอบ** — จอหลักโชว์ทุกคนในรอบ (รูป + ชื่อ + gid) มีไฮไลต์วิ่งวนไม่หยุด / จอข้างวนหน้าละ 12 คน ทุก 10 วิ → รอ operator กด `N`
6. ทำซ้ำรอบ B, C, OFFICE
7. **จบงาน** — หน้ารายชื่อ (`L`) / หน้าขอบคุณ (`T`) สลับไปมาได้
8. กด **Export CSV** เก็บผล

### Export CSV
ได้ไฟล์ `recognition2027_winners_<วันเวลา>.csv` เปิดด้วย Excel ได้เลย ภาษาไทยไม่เพี้ยน (UTF-8 BOM)

คอลัมน์: รอบ, กลุ่ม, ลำดับ, รหัสพนักงาน, ชื่อ, นามสกุล, ชื่อ-นามสกุล (EN), shift_code, สถานะ (ประกาศแล้ว / ยังไม่ประกาศ)

> ผลสุ่มเก็บอยู่ใน **เบราว์เซอร์ของเครื่องที่เปิดจอหลัก** → ต้อง export จากเครื่องนั้น และอย่ากดรีเซ็ตก่อน export
> (backend จริงก็เขียนไฟล์ `output/random_*.json` ไว้ทุกครั้งที่สุ่ม เป็นสำรองอีกทาง)

### ถ้ารีเฟรช / เบราว์เซอร์ค้างกลางงาน
เปิดจอหลักใหม่ได้เลย ระบบจะกลับมาที่รอบเดิม **รายชื่อเดิม ไม่สุ่มใหม่**
- ถ้าค้างกลางรอบ → กลับมาที่หน้า PRESS START กดอีกครั้งจะเล่นต่อจากคนถัดไป
- ถ้าค้างตอนจบรอบ / จบงาน → กลับมาหน้าเดิม

---

## 3. โครงสร้างไฟล์ และแต่ละไฟล์ทำอะไร

```
frontend/
├── index.html                 หน้า HTML หลัก (มีแค่ <div id="root"> แล้วโหลด src/main.tsx)
├── package.json               รายการ library + คำสั่ง npm
├── package-lock.json          ล็อกเวอร์ชัน library (อย่าแก้มือ)
├── vite.config.ts             ตั้งค่า Vite + proxy ไป backend
├── tsconfig.json              ตั้งค่า TypeScript (แยกเป็น app / node)
├── tsconfig.app.json          ตั้งค่า TypeScript ของโค้ดใน src/
├── tsconfig.node.json         ตั้งค่า TypeScript ของ vite.config.ts
├── .oxlintrc.json             กฎของ linter (npm run lint)
├── .gitignore                 ไฟล์ที่ไม่เอาขึ้น git (node_modules, dist, .env.local ฯลฯ)
├── docs/ui/                   ไฟล์ดีไซน์ต้นฉบับ (รูปตัวอย่างทุกหน้า + Scene + Photo)
├── public/
│   ├── favicon.svg            ไอคอนบนแท็บเบราว์เซอร์
│   └── icons.svg              (ยังไม่ได้ใช้)
└── src/
    ├── main.tsx               จุดเริ่มของแอป: โหลดฟอนต์ + index.css แล้ว render <App />
    ├── App.tsx                เลือกว่าจะแสดงจอไหนจาก ?screen=main | side | (ว่าง = preview)
    ├── App.css                สไตล์ทั้งหมด (ตำแหน่ง ขนาด สี แอนิเมชัน)
    ├── index.css              สไตล์พื้นฐาน (margin 0, พื้นหลัง body)
    ├── vite-env.d.ts          type ของ Vite (import รูป, import.meta.env)
    ├── config.ts              ★ ค่าที่ปรับบ่อย: รอบ, จำนวนคน, เวลาแต่ละช่วง
    ├── types.ts               โครงสร้างข้อมูล (Employee, ShowState, Phase ฯลฯ)
    ├── assets/
    │   ├── main-screen.png        พื้นหลังจอหลัก (ตัดจาก docs/ui/Scene/Main cabinet.png เอาแต่จอ)
    │   ├── side-cabinet.png       พื้นหลังจอข้าง (= docs/ui/Scene/Side cabinet.png)
    │   └── employee-placeholder.png  รูปแทนตอนไม่มีรูปพนักงาน / การ์ด "?"
    ├── components/
    │   └── Avatar.tsx         <Photo> รูปพนักงาน (ไม่มีรูป → ใช้ placeholder, mystery → แสดง "?")
    ├── hooks/
    │   ├── useShowController.ts  ★ สมองของระบบ: state ทั้งหมด, เรียก API, จับเวลา, คีย์ลัด, ส่ง state ให้จอข้าง
    │   └── useSyncedState.ts     จอข้างใช้รับ state + รูปจากจอหลัก
    ├── lib/
    │   ├── api.ts             เรียก backend (/random, /pool)
    │   ├── channel.ts         ส่งข้อความระหว่างจอ (BroadcastChannel) + แยกรูปออกจาก state
    │   ├── storage.ts         บันทึก/โหลดผลสุ่มใน localStorage (กันสุ่มซ้ำตอนรีเฟรช)
    │   ├── exportCsv.ts       สร้างไฟล์ CSV สำหรับ Excel
    │   └── format.ts          ฟังก์ชันเล็กๆ: pad(7) → "07", chunk(list, 12)
    └── screens/
        ├── MainScreen.tsx     หน้าจอหลักทุกช่วง (รอสุ่ม/หมุน/เฉลย/จบรอบ/รายชื่อตอนจบ/ขอบคุณ)
        ├── SideScreen.tsx     หน้าจอข้างทุกช่วง (READY / คิว 6 คน / สรุปหน้าละ 12 / GAME CLEAR)
        └── PreviewScreen.tsx  หน้า / : iframe 2 จอ + ปุ่มควบคุม + Export
```

### รายละเอียดไฟล์สำคัญ

#### `src/config.ts` ★ แก้บ่อยสุด
- `ROUNDS` — รายการรอบ: `code` (ส่งให้ backend), `label` (ชื่อที่ขึ้นจอ), `winners` (จำนวนผู้โชคดี)
- `TIMING` — เวลาทุกอย่าง (หน่วย ms)
  | ค่า | ปัจจุบัน | ความหมาย |
  | --- | --- | --- |
  | `spinMs` | 1500 | หมุนก่อนเฉลยแต่ละคน |
  | `holdMs` | 3000 | ค้างหน้าผู้โชคดี |
  | `sideQueuePageSize` | 6 | จอข้าง: กี่คนต่อหน้าขณะสุ่ม |
  | `sideSummaryPageSize` | 12 | จอข้าง: กี่คนต่อหน้าตอนจบรอบ |
  | `sideSummaryRotateMs` | 10000 | จอข้าง: เปลี่ยนหน้าทุกกี่ ms |
  | `spotlightMs` | 1200 | จอหลักตอนจบรอบ: ไฮไลต์เลื่อนทุกกี่ ms |
  | `finalRotateMs` | 10000 | จอหลักหน้ารายชื่อตอนจบ: เปลี่ยนรอบทุกกี่ ms |
- `API_BASE` — ปกติว่างไว้ (ใช้ proxy ของ Vite) ถ้าจะให้เรียก backend ตรงๆ ให้ตั้ง `VITE_API_BASE` ใน `.env.local`

> เวลารวมโดยประมาณ: 120 คน × (1.5 + 3) วิ ≈ 9 นาที + ช่วงจบรอบ

#### `src/types.ts`
- `Employee` — ข้อมูลพนักงานจาก backend: `gid, full_name, th_fname, th_lname, shift_code, PiCTURE, picture_base64`
- `Phase` — ช่วงของจอหลัก: `idle → loading → spinning ⇄ reveal → summary → … → final`
- `ShowState` — state ทั้งหมดของการแสดง (รอบที่เท่าไร, คนที่เท่าไร, ผลแต่ละรอบ, หน้าจบงานแบบไหน)
- `Command` — คำสั่งที่หน้า preview ส่งไปจอหลัก (`start`, `next`, `show-names`, `show-thanks`, `reset`)

#### `src/hooks/useShowController.ts` ★ logic หลัก (ใช้ในจอหลักเท่านั้น)
- `start()` — กดเริ่มสุ่ม: ถ้ารอบนี้เคยสุ่มแล้วใช้ผลเดิม ไม่งั้นเรียก `/random` แล้วเก็บผล
- `next()` — ไปรอบถัดไป / ไปหน้าจบงาน
- `showFinal("names" | "thanks")` — สลับหน้าจบงาน
- `reset()` — ล้างทุกอย่าง
- ส่วน **timers** — `spinning` ครบ `spinMs` → `reveal` ครบ `holdMs` → คนถัดไป (หรือ `summary` ถ้าครบรอบ)
- ส่วน **persist** — บันทึก state ลง localStorage ทุกครั้งที่เปลี่ยน
- ส่วน **sync** — ส่ง state ให้จอข้าง + รับคำสั่งจากหน้า preview
- ส่วน **keyboard** — คีย์ลัดทั้งหมด (ดูตารางในหัวข้อ 2)

#### `src/screens/MainScreen.tsx`
| component | แสดงตอน |
| --- | --- |
| `MainContent` | เลือกหน้าตาม `state.phase` |
| (case `idle` / `loading`) | การ์ด "?" 5 ใบ + "35 WINNERS" + PRESS START |
| `Spinning` | หมุนรูป/ชื่อสลับเร็วๆ แล้วช้าลง (การ์ด 3 ใบ) |
| (case `reveal`) | WINNER! + รูปใหญ่ + NO.xx + ชื่อ + gid + แถบ HOLD |
| `WinnerGrid` | ตารางรูป + ชื่อ + gid (35 คน = 9 คอลัมน์, 15 คน = 5 คอลัมน์) มีไฮไลต์วิ่งได้ |
| `FinalNames` | หน้ารายชื่อตอนจบ (ค้างทีละรอบ ไม่มีไฮไลต์) |
| `ThanksScreen` | หน้าขอบคุณ |

#### `src/screens/SideScreen.tsx`
| component | แสดงตอน |
| --- | --- |
| `Ready` | ก่อนมีผู้โชคดี: การ์ด "?" + READY? |
| (คิว) | ระหว่างสุ่ม: หน้าละ 6 คน ล่าสุดอยู่บน ไฮไลต์เขียว |
| `SummaryPages` | จบรอบ: หน้าละ 12 คน วนหน้า P.1/3 → P.2/3 … |
| (final) | จบงาน: GAME CLEAR! ขอบคุณทุกท่าน |
| `Title` / `Panel` | หัวตู้ (ROUND xx + ชื่อรอบ) / แผงล่างตู้ (ตัวนับ + แถบ) |

#### `src/App.css`
แบ่งเป็นหมวดตามคอมเมนต์ `/* ===== ... ===== */`: stage, shared, MAIN, SIDE, PREVIEW
- ขนาดทุกอย่างใช้หน่วย `calc(N * var(--u))` → **ย่อขยายตามจอเอง** ไม่ต้องแก้ตามความละเอียดจอ
  - จอหลัก: `--u` = 1.778% ของความกว้างจอ · จอข้าง: `--u` = 1% ของความกว้างจอ
  - อยากให้อะไรใหญ่ขึ้น 20% → คูณเลข N ด้วย 1.2
- ตำแหน่งจอ/แผงของจอข้าง (`.side-title`, `.side-screen`, `.side-panel`) เป็น % ที่วัดจากรูป `side-cabinet.png` — ถ้าเปลี่ยนรูปพื้นหลังต้องวัดใหม่
- สีหลักอยู่ใน `:root` ด้านบนสุด (`--yellow`, `--green`, `--pink`, …)

#### `src/lib/channel.ts` + `src/hooks/useSyncedState.ts`
จอหลักส่งข้อความผ่าน `BroadcastChannel("recognition2027-show")`:
- `state` — ส่งทุกครั้งที่ state เปลี่ยน (ตัดรูปออกให้เบา)
- `pictures` — รูป base64 ของผู้โชคดีรอบนั้น ส่งครั้งเดียวต่อรอบ
- `hello` — จอข้างเพิ่งเปิด ขอ state ล่าสุด (ถามซ้ำทุก 3 วิจนกว่าจะได้)
- `command` — คำสั่งจากหน้า preview

#### `src/lib/storage.ts`
เก็บ `{ roundIndex, queued, phase, results, finalView }` ใน localStorage key `r2027-show`
ถ้ารูปจริงใหญ่จนเกินโควตา (~5MB) จะเก็บเฉพาะชื่อ (ตัดรูปออก) อัตโนมัติ

#### `vite.config.ts`
proxy path `/random`, `/pool`, `/all`, `/api` ไปที่ `VITE_BACKEND_URL` (ค่าเริ่มต้น `http://localhost:4000`)
ถ้า backend มี endpoint ใหม่ที่ frontend ต้องเรียก ให้เพิ่มใน `API_PATHS`

---

## 4. การทำงานภายใน

```
             ┌───────────── BroadcastChannel ─────────────┐
             │                                            ▼
 [หน้า / preview] ──command──▶ [จอหลัก ?screen=main] ──state/pictures──▶ [จอข้าง ?screen=side]
                                 │  useShowController
                                 │   ├─ GET /random (ครั้งเดียวต่อรอบ)
                                 │   ├─ GET /pool   (รายชื่อสำหรับหมุน, ไม่บังคับ)
                                 │   └─ localStorage (เก็บผล กันสุ่มซ้ำ)
                                 ▼
                              backend
```

ลำดับ phase ของ 1 รอบ:

```
idle ──กดเริ่ม──▶ loading ──ได้ผล──▶ spinning ─1.5s─▶ reveal ─3s─▶ spinning ─▶ … ─▶ summary ──N──▶ idle (รอบถัดไป)
                                                                                  └─N (รอบสุดท้าย)─▶ final (names ⇄ thanks ด้วย L / T)
```

- `queued` = จำนวนคนที่เฉลยครบแล้ว (จอข้างใช้ค่านี้แสดงคิว)
- `current` = คนที่กำลังหมุน/เฉลยอยู่บนจอหลัก

---

## 5. อยากแก้ X ต้องไปแก้ที่ไฟล์ไหน

| อยากแก้ | ไปที่ |
| --- | --- |
| จำนวนผู้โชคดี / ชื่อรอบ / เพิ่ม-ลดรอบ | `src/config.ts` → `ROUNDS` (และ backend ต้องรองรับ `code` ใหม่) |
| เวลาหมุน / เวลาค้าง / ความเร็วเปลี่ยนหน้า | `src/config.ts` → `TIMING` |
| ข้อความบนจอ (เช่น "ขอบคุณทุกท่าน", "PRESS START") | `src/screens/MainScreen.tsx` / `SideScreen.tsx` (ค้นหาข้อความนั้น) |
| บรรทัดใต้ชื่อ (ตอนนี้เป็นชื่อ EN) เช่น อยากใส่แผนก | `MainScreen.tsx` case `reveal` (`winner.full_name`) และ `SideScreen.tsx` (`row.person.full_name`) + เพิ่ม field ใน `types.ts` → `Employee` |
| สี | `src/App.css` → `:root` |
| ขนาดตัวอักษร / ขนาดรูป | `src/App.css` หาชื่อ class เช่น `.reveal-info h1`, `.grid-9 .photo` |
| ฟอนต์ | `src/main.tsx` (import ฟอนต์) + `src/App.css` → `--pixel`, `--thai` |
| รูปพื้นหลังจอ | แทนไฟล์ใน `src/assets/` (ชื่อเดิม) — จอข้างถ้าตำแหน่งจอในรูปเปลี่ยนต้องแก้ % ใน `.side-*` |
| รูป placeholder พนักงาน | `src/assets/employee-placeholder.png` |
| คีย์ลัด | `src/hooks/useShowController.ts` ส่วน `keyboard` |
| ปุ่มในหน้า preview | `src/screens/PreviewScreen.tsx` |
| คอลัมน์ CSV | `src/lib/exportCsv.ts` → `HEADERS` และแถวใน `buildWinnersCsv` |
| URL / พอร์ต backend | `.env.local` → `VITE_BACKEND_URL` |
| จำนวนคนต่อหน้าในจอข้าง | `src/config.ts` → `sideQueuePageSize`, `sideSummaryPageSize` (ถ้าเปลี่ยนต้องแก้ `repeat(6, …)` / `repeat(12, …)` ใน `.queue`, `.summary-list` ใน `App.css` ด้วย) |
| จำนวนคอลัมน์ตารางจบรอบ | `MainScreen.tsx` → `WinnerGrid` (`many ? "grid-9" : "grid-5"`) + `.grid-9`, `.grid-5` ใน `App.css` |

---

## 6. API ที่ต้องมีใน backend

### `GET /random?round=A|B|C|OFFICE` (จำเป็น)
สุ่มผู้โชคดีทั้งรอบ — frontend เรียก **ครั้งเดียวต่อรอบ** แล้วล็อกผลไว้เอง

```json
{
  "saved": true,
  "file": "random_2026-11-13-15-41-37.json",
  "count": 35,
  "data": [
    {
      "gid": "663523",
      "full_name": "Nattaporn Jiansunan",
      "th_fname": "ณัฐพร",
      "th_lname": "เจียรสุนันท์",
      "shift_code": "THAI-TDA",
      "PiCTURE": "663523",
      "picture_base64": "data:image/jpeg;base64,...."
    }
  ]
}
```
- frontend ใช้แค่ `data` · `picture_base64` ต้องขึ้นต้นด้วย `data:image/` ไม่งั้นจะใช้รูป placeholder
- **การตัด director / internship ต้องทำใน backend** (frontend ไม่ได้กรอง)

### `GET /pool?round=X&limit=40` (ไม่บังคับ)
รายชื่อพนักงานสุ่มๆ ของรอบนั้น (มีรูป) ใช้ทำแอนิเมชันหมุนให้เห็นหน้าคนหลากหลาย
ถ้า backend ไม่มี → frontend หมุนจากรายชื่อผู้โชคดีของรอบนั้นแทน (ใช้งานได้ปกติ)

```json
{ "count": 40, "data": [ /* Employee เหมือนข้างบน */ ] }
```

---

## 7. Build / Deploy

```bash
npm run build        # ได้ไฟล์ใน dist/
```

**ใช้ offline ได้** — ฟอนต์และรูปทั้งหมดถูกรวมในไฟล์ build แล้ว ไม่โหลดอะไรจากอินเทอร์เน็ต
(แต่ `npm install` ต้องทำตอนมีเน็ต · รูปพนักงานต้อง preload ที่ backend — ดู `../backend/README.md`)

ทางเลือกตอนใช้จริง:
1. **ง่ายสุด** — ใช้ `npm run dev` หรือ `npm run preview` บนเครื่องที่ต่อจอ (มี proxy ไป backend ให้แล้ว)
2. **เสิร์ฟ `dist/` จาก backend** — เอาโฟลเดอร์ `dist/` ไปให้ Go เสิร์ฟเป็น static ที่ path `/`
   (frontend เรียก `/random` แบบ relative → อยู่ origin เดียวกับ backend ใช้ได้เลย)
3. **เสิร์ฟแยกที่อื่น** — ตั้ง `VITE_API_BASE=http://<backend>:4000` ใน `.env.local` ก่อน build
   (backend ต้องเปิด CORS ซึ่งของเดิมเปิด `*` ไว้แล้ว)

---

## 8. ปัญหาที่เจอบ่อย

| อาการ | สาเหตุ / วิธีแก้ |
| --- | --- |
| กดเริ่มแล้วขึ้น "เชื่อมต่อระบบสุ่มไม่ได้" | backend ไม่ได้เปิด / พอร์ตไม่ตรง → เช็ก `VITE_BACKEND_URL` แล้วรัน `npm run dev` ใหม่ |
| จอข้างค้าง "WAITING รอเชื่อมต่อจอหลัก" | ยังไม่ได้เปิดจอหลัก หรือเปิดคนละเบราว์เซอร์/คนละเครื่อง/โหมดไม่ระบุตัวตน |
| ทุกอย่างเด้ง 2 รอบ / สุ่มซ้อน | เปิดจอหลักไว้ 2 ที่ (เช่น หน้า `/` + `?screen=main`) → ปิดอันหนึ่ง |
| อยากเริ่มใหม่ตอนซ้อม | ปุ่ม ↺ รีเซ็ต หรือ `Ctrl+Shift+Backspace` บนจอหลัก |
| กด Space ตอนจบรอบแล้วไม่ไปรอบถัดไป | ตั้งใจไว้ — ต้องกด `N` หรือปุ่ม ⏭ รอบถัดไป |
| กด `L` / `T` แล้วไม่เปลี่ยน | ใช้ได้หลังจบรอบสุดท้ายเท่านั้น |
| รูปไม่ขึ้น ขึ้นรูปคนสีม่วงแทน | backend ไม่ได้ส่ง `picture_base64` หรือไม่ได้ขึ้นต้นด้วย `data:image/` |
| Excel เปิด CSV แล้วภาษาไทยเพี้ยน | เปิดด้วยการดับเบิลคลิกไฟล์ (มี BOM แล้ว) ถ้ายังเพี้ยนใช้ Data → From Text/CSV → เลือก UTF-8 |
