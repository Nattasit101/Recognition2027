// Mock backend สำหรับเว็บสุ่มแจกทอง Recognition 2027
//
// เลียนแบบ API ของ backend จริง (ใช้ข้อมูลปลอม ไม่ต้องมี emp_old.db / ไม่ดึงรูปจากเซิร์ฟเวอร์บริษัท)
//
//	GET /api/health        → {"status":"ok"}
//	GET /random?round=A    → {"saved":true,"file":"random_....json","count":35,"data":[...]}
//	                          (เหมือนของจริง: เรียกกี่ครั้งก็สุ่มใหม่ทุกครั้ง)
//	GET /all               → {"count":N}
//	GET /pool?round=A      → (ไม่บังคับ) รายชื่อสุ่มๆ สำหรับแอนิเมชันหมุน
//	                          ถ้า backend จริงไม่มี frontend จะใช้รายชื่อผู้โชคดีแทน
package main

import (
	"bufio"
	"crypto/sha1"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math/rand/v2"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

const defaultPort = "4000"

type employee struct {
	GID           string `json:"gid"`
	FullName      string `json:"full_name"`
	THFName       string `json:"th_fname"`
	THLName       string `json:"th_lname"`
	ShiftCode     string `json:"shift_code"`
	Picture       string `json:"PiCTURE"`
	PictureBase64 string `json:"picture_base64,omitempty"`
}

type randomResponse struct {
	Saved bool       `json:"saved"`
	File  *string    `json:"file"`
	Count int        `json:"count"`
	Data  []employee `json:"data"`
}

// รอบ → เงื่อนไข shift_code (เทียบเท่า WHERE ใน backend จริง)
type roundRule struct {
	match func(shift string) bool
	limit int
}

var rounds = map[string]roundRule{
	"A":      {func(s string) bool { return s == "THAI-TDA" || s == "THAI-TDAMH" }, 35},
	"B":      {func(s string) bool { return s == "THAI-TDB" || s == "THAI-TDBMH" }, 35},
	"C":      {func(s string) bool { return s == "THAI-TDC" || s == "THAI-TDCMH" }, 35},
	"OFFICE": {func(s string) bool { return strings.HasPrefix(s, "THAI-O") }, 15},
}

type server struct {
	employees     []employee
	excludeShifts map[string]bool
	excludeGIDs   map[string]bool
	imageCacheDir string
	outputDir     string
}

func main() {
	loadDotEnv(".env")
	s := &server{
		employees:     mockEmployees(),
		excludeShifts: toSet(envOrDefault("EXCLUDE_SHIFT_CODES", "THAI-ODIR,THAI-OINT")),
		excludeGIDs:   loadGIDList(envOrDefault("EXCLUDE_GIDS_FILE", "exclude_gids.txt")),
		imageCacheDir: envOrDefault("IMAGE_CACHE_DIR", "image-cache"),
		outputDir:     envOrDefault("OUTPUT_DIR", "output"),
	}
	port := envOrDefault("PORT", defaultPort)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})
	mux.HandleFunc("GET /random", s.randomHandler)
	mux.HandleFunc("GET /pool", s.poolHandler)
	mux.HandleFunc("GET /all", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]int{"count": len(s.employees)})
	})

	log.Printf("MOCK backend (fake data) %d employees at http://localhost:%s", len(s.employees), port)
	log.Fatal(http.ListenAndServe(":"+port, cors(mux)))
}

func (s *server) randomHandler(w http.ResponseWriter, r *http.Request) {
	code := strings.ToUpper(strings.TrimSpace(r.URL.Query().Get("round")))
	rule, ok := rounds[code]
	if !ok {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": fmt.Sprintf("unsupported round %q", code)})
		return
	}
	data := s.sample(rule, rule.limit)
	resp := randomResponse{Count: len(data), Data: data}
	if name, err := s.saveSnapshot(data); err != nil {
		log.Printf("save random snapshot: %v", err)
	} else {
		resp.Saved, resp.File = true, &name
	}
	log.Printf("round %s: drew %d", code, len(data))
	writeJSON(w, http.StatusOK, resp)
}

func (s *server) poolHandler(w http.ResponseWriter, r *http.Request) {
	rule, ok := rounds[strings.ToUpper(r.URL.Query().Get("round"))]
	if !ok {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "unsupported round"})
		return
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 || limit > 200 {
		limit = 40
	}
	data := s.sample(rule, limit)
	writeJSON(w, http.StatusOK, map[string]any{"count": len(data), "data": data})
}

// sample = SELECT ... WHERE <round> AND ไม่ใช่ director/intern ORDER BY RANDOM() LIMIT n
func (s *server) sample(rule roundRule, n int) []employee {
	var pool []employee
	for _, e := range s.employees {
		if rule.match(e.ShiftCode) && !s.excluded(e) {
			pool = append(pool, e)
		}
	}
	rand.Shuffle(len(pool), func(i, j int) { pool[i], pool[j] = pool[j], pool[i] })
	pool = pool[:min(n, len(pool))]
	for i := range pool {
		pool[i].PictureBase64 = s.picture(pool[i])
	}
	return pool
}

// ตัด director / internship — ฐานข้อมูลจริงยังไม่มีคอลัมน์ตำแหน่ง
// จึงรองรับ 2 แบบ: ตาม shift_code (EXCLUDE_SHIFT_CODES) และรายชื่อ gid (exclude_gids.txt)
func (s *server) excluded(e employee) bool {
	return s.excludeShifts[strings.ToUpper(e.ShiftCode)] || s.excludeGIDs[e.GID]
}

// รูป: ใช้ image-cache/<gid>.txt (data URL แบบเดียวกับ backend จริง) ถ้ามี
// ไม่มี → สร้าง avatar สีๆ (ค่าเริ่มต้น) หรือถ้า MOCK_AVATAR=off ส่งค่าว่าง
// (จำลองวันงานที่รูปไม่อยู่ใน cache → frontend ต้องใช้รูป placeholder)
func (s *server) picture(e employee) string {
	if b, err := os.ReadFile(filepath.Join(s.imageCacheDir, e.GID+".txt")); err == nil {
		return strings.TrimSpace(string(b))
	}
	if os.Getenv("MOCK_AVATAR") == "off" {
		log.Printf("picture: gid %s not in cache → placeholder", e.GID)
		return ""
	}
	return mockAvatar(e)
}

func mockAvatar(e employee) string {
	h := sha1.Sum([]byte(e.GID))
	palette := []string{"#ff52b8", "#2F46FA", "#7E2DE8", "#00b37e", "#ff8a00", "#e8384f", "#00a6d6", "#8a5a00"}
	bg := palette[int(h[0])%len(palette)]
	initial := "?"
	if r := []rune(e.THFName); len(r) > 0 {
		initial = string(r[0])
	}
	svg := fmt.Sprintf(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">`+
		`<rect width="120" height="120" fill="%s"/>`+
		`<circle cx="60" cy="46" r="22" fill="#fff" fill-opacity=".9"/>`+
		`<rect x="22" y="76" width="76" height="44" rx="30" fill="#fff" fill-opacity=".9"/>`+
		`<text x="60" y="56" font-size="28" text-anchor="middle" font-family="sans-serif" fill="%s">%s</text></svg>`, bg, bg, initial)
	return "data:image/svg+xml;base64," + base64.StdEncoding.EncodeToString([]byte(svg))
}

func (s *server) saveSnapshot(data []employee) (string, error) {
	if err := os.MkdirAll(s.outputDir, 0o755); err != nil {
		return "", err
	}
	// ไม่เก็บรูปลงไฟล์ snapshot ให้ไฟล์เล็ก
	slim := make([]employee, len(data))
	for i, e := range data {
		e.PictureBase64 = ""
		slim[i] = e
	}
	name := fmt.Sprintf("random_%s.json", time.Now().Format("2006-01-02-15-04-05"))
	content, err := json.MarshalIndent(slim, "", "  ")
	if err != nil {
		return "", err
	}
	return name, os.WriteFile(filepath.Join(s.outputDir, name), content, 0o644)
}

// ---------- helpers ----------

func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Accept")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("write JSON response: %v", err)
	}
}

func envOrDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func toSet(csv string) map[string]bool {
	set := map[string]bool{}
	for item := range strings.SplitSeq(csv, ",") {
		if item = strings.ToUpper(strings.TrimSpace(item)); item != "" {
			set[item] = true
		}
	}
	return set
}

func loadGIDList(path string) map[string]bool {
	set := map[string]bool{}
	f, err := os.Open(path)
	if err != nil {
		if !errors.Is(err, os.ErrNotExist) {
			log.Printf("read %s: %v", path, err)
		}
		return set
	}
	defer f.Close()
	sc := bufio.NewScanner(f)
	for sc.Scan() {
		if line := strings.TrimSpace(sc.Text()); line != "" && !strings.HasPrefix(line, "#") {
			set[line] = true
		}
	}
	return set
}

func loadDotEnv(path string) {
	f, err := os.Open(path)
	if err != nil {
		return
	}
	defer f.Close()
	sc := bufio.NewScanner(f)
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		if k, v, ok := strings.Cut(line, "="); ok && os.Getenv(strings.TrimSpace(k)) == "" {
			_ = os.Setenv(strings.TrimSpace(k), strings.Trim(strings.TrimSpace(v), `"`))
		}
	}
}
