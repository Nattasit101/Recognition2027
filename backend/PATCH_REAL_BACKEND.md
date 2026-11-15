# แพตช์สำหรับ backend จริง (main.go ในคอมบริษัท)

เป้าหมาย: **รูปพนักงานที่หาไม่เจอต้องไม่ทำให้การสุ่มทั้งรอบล้ม**

## ปัญหาเดิม
`addPictureBase64` เดิม: ถ้าคนไหนไม่มีรูปใน `image-cache/` และดาวน์โหลดไม่ได้ (เช่น วันงานที่ offline)
→ คืน error → `/random` ตอบ `502 Employee pictures could not be loaded` → **สุ่มรอบนั้นไม่ได้เลย**
และถ้าเครื่องมีเน็ตแต่เข้าเซิร์ฟเวอร์รูปไม่ได้ จะรอ timeout 15 วิ **ต่อรูป** (35 คน ≈ 9 นาที)

## หลังแก้
- หารูปไม่เจอ → `log` ไว้ แล้วส่ง `picture_base64` ว่าง → frontend ใช้รูป placeholder แทน การสุ่มเดินต่อ
- ตั้ง `OFFLINE=1` → ไม่พยายามดาวน์โหลดเลย ใช้เฉพาะรูปใน cache (กันค้างรอ timeout)
- `go run . preload` สรุปผลว่ามีรูปครบกี่คน และเขียนรายชื่อคนที่ไม่มีรูปไว้ที่ `output/preload_missing.txt`

> โค้ดชุดนี้ผ่านการทดสอบแยกแล้ว (go vet + unit test ครอบคลุม: มีใน cache / ดาวน์โหลดได้ / 404 / เซิร์ฟเวอร์ปิด / ไม่มีชื่อรูป / OFFLINE=1)
> แต่ยังไม่ได้ลองกับ `emp_old.db` จริง — แก้แล้วให้รัน `go build` และลองสุ่มดู 1 รอบ

---

## ขั้นที่ 1 — แทนที่ฟังก์ชัน `addPictureBase64` ทั้งฟังก์ชัน

ลบ `addPictureBase64` เดิมใน `main.go` แล้ววางโค้ดนี้แทน (รวมตัวแปร `offlineMode` ด้านบน):

```go
// offlineMode = true เมื่อตั้ง OFFLINE=1 → ไม่พยายามดาวน์โหลดรูปเลย ใช้เฉพาะรูปใน cache
// (กันกรณีเครื่องมีเน็ตแต่เข้าเซิร์ฟเวอร์รูปไม่ได้ แล้วค้างรอ timeout 15 วิ ต่อรูป)
var offlineMode = os.Getenv("OFFLINE") == "1"

// addPictureBase64 เติมรูปให้พนักงาน โดยอ่านจาก cache ก่อนและดาวน์โหลดเมื่อยังไม่มี.
// รูปที่หาไม่ได้ (ไม่มีใน cache + ดาวน์โหลดไม่ได้ เช่นวันงานที่ offline) จะ log ไว้
// แล้วปล่อย picture_base64 ว่าง → frontend ใช้รูป placeholder แทน การสุ่มทั้งรอบไม่ล้ม
// คืน error เฉพาะกรณีสร้างโฟลเดอร์ cache ไม่ได้เท่านั้น
func addPictureBase64(employees []employee, cacheDir string) error {
	if err := os.MkdirAll(cacheDir, 0o755); err != nil {
		return fmt.Errorf("create image cache: %w", err)
	}

	for index := range employees {
		item := &employees[index]
		if item.Picture == "" {
			log.Printf("picture: gid %s has no PiCTURE → placeholder", item.GID)
			continue
		}

		cachePath := filepath.Join(cacheDir, item.GID+".txt")
		if cached, err := os.ReadFile(cachePath); err == nil {
			item.PictureBase64 = string(cached)
			continue
		} else if !errors.Is(err, os.ErrNotExist) {
			log.Printf("picture: gid %s read cache %s: %v → placeholder", item.GID, cachePath, err)
			continue
		}

		if offlineMode {
			log.Printf("picture: gid %s not in cache (OFFLINE=1) → placeholder", item.GID)
			continue
		}

		pictureURL := imageBaseURL + url.PathEscape(item.Picture) + ".jpg"
		pictureBase64, err := imageURLToBase64(pictureURL)
		if err != nil {
			log.Printf("picture: gid %s not in cache and download failed: %v → placeholder", item.GID, err)
			continue
		}
		item.PictureBase64 = pictureBase64
		if err := os.WriteFile(cachePath, []byte(pictureBase64), 0o644); err != nil {
			log.Printf("picture: gid %s write cache %s: %v", item.GID, cachePath, err)
		}
	}
	return nil
}
```

import ที่ใช้ (`errors`, `fmt`, `log`, `net/url`, `os`, `path/filepath`) มีอยู่ใน main.go เดิมครบแล้ว ไม่ต้องเพิ่ม

## ขั้นที่ 2 — แทนที่ฟังก์ชัน `preloadImages` ทั้งฟังก์ชัน

ของเดิมพึ่ง error จาก `addPictureBase64` เพื่อรู้ว่ารูปหาย — ตอนนี้ไม่มี error แล้ว จึงต้องนับเอง:

```go
// preloadImages โหลดรูปของพนักงานทุกคนลง cache โดยข้ามรูปที่มี cache อยู่แล้ว.
// รันตอนยังต่อเน็ตได้ (ก่อนวันงาน): go run . preload
// จบแล้วสรุปว่ามีรูปครบกี่คน และเขียนรายชื่อที่ยังไม่มีรูปไว้ที่ output/preload_missing.txt
func preloadImages(db *sql.DB, cacheDir string) error {
	rows, err := db.Query("SELECT gid, PiCTURE FROM employees")
	if err != nil {
		return err
	}
	defer rows.Close()

	total, missing := 0, []string{}
	for rows.Next() {
		var item employee
		if err := rows.Scan(&item.GID, &item.Picture); err != nil {
			return err
		}
		total++
		list := []employee{item}
		if err := addPictureBase64(list, cacheDir); err != nil {
			return err // สร้างโฟลเดอร์ cache ไม่ได้ → หยุด
		}
		if list[0].PictureBase64 == "" {
			missing = append(missing, item.GID+"\t"+item.Picture)
		}
		if total%100 == 0 {
			log.Printf("preload: %d done (%d missing)", total, len(missing))
		}
	}
	if err := rows.Err(); err != nil {
		return err
	}

	log.Printf("preload: pictures ready %d/%d, missing %d", total-len(missing), total, len(missing))
	if len(missing) > 0 {
		if err := os.MkdirAll("output", 0o755); err != nil {
			return err
		}
		path := filepath.Join("output", "preload_missing.txt")
		content := "gid\tPiCTURE\n" + strings.Join(missing, "\n") + "\n"
		if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
			return err
		}
		log.Printf("preload: missing list written to %s (คนเหล่านี้จะใช้รูป placeholder)", path)
	}

	return nil
}
```

ต้องเพิ่ม `"strings"` ใน import (ของเดิมมีอยู่แล้วเพราะ `randomHandler` ใช้ `strings.ToUpper`)

## ขั้นที่ 3 — (ไม่บังคับ) `randomHandler`
ไม่ต้องแก้ — ตอนนี้ `addPictureBase64` คืน error แค่กรณีสร้างโฟลเดอร์ cache ไม่ได้ ซึ่ง 502 ก็สมควรแล้ว

---

## ตรวจหลังแก้

```bash
go build ./...                 # ต้องผ่าน
go run . preload               # (ตอนต่อเน็ต) ดูสรุป "pictures ready X/Y"
OFFLINE=1 go run .             # จำลองวันงาน
curl "localhost:4000/random?round=A"   # ต้องได้ 200 + count 35 แม้บางคนไม่มีรูป
```
Windows (PowerShell): `$env:OFFLINE="1"; go run .`
