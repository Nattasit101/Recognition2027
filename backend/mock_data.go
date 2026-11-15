package main

// ข้อมูลพนักงาน mock — โครงสร้างเดียวกับตาราง employees จริง
// (gid, full_name, th_fname, th_lname, shift_code, PiCTURE)
// ข้อมูลปลอมทั้งหมด — backend จริงอ่านจากตาราง employees ใน emp_old.db

import (
	"fmt"
	"math/rand/v2"
)

type namePair struct{ th, en string }

var firstNames = []namePair{
	{"สมชาย", "Somchai"}, {"สมหญิง", "Somying"}, {"ณัฐพร", "Nattaporn"}, {"กิตติ", "Kitti"},
	{"วรรณา", "Wanna"}, {"ธนพล", "Thanapol"}, {"ปิยะ", "Piya"}, {"สุภาพร", "Supaporn"},
	{"อรุณ", "Arun"}, {"จิราพร", "Jiraporn"}, {"ประเสริฐ", "Prasert"}, {"มาลี", "Malee"},
	{"วิชัย", "Wichai"}, {"รัตนา", "Rattana"}, {"ชัยวัฒน์", "Chaiwat"}, {"พิมพ์ชนก", "Pimchanok"},
	{"อนุชา", "Anucha"}, {"ศิริพร", "Siriporn"}, {"ธีรวัฒน์", "Teerawat"}, {"กมลวรรณ", "Kamonwan"},
	{"นพดล", "Noppadon"}, {"สุนิสา", "Sunisa"}, {"เกรียงไกร", "Kriangkrai"}, {"ปวีณา", "Paweena"},
	{"สุรชัย", "Surachai"}, {"อัญชลี", "Anchalee"}, {"ภานุวัฒน์", "Panuwat"}, {"ดวงใจ", "Duangjai"},
	{"วีระ", "Weera"}, {"นิตยา", "Nittaya"}, {"ศักดิ์ชัย", "Sakchai"}, {"ลัดดา", "Ladda"},
}

var lastNames = []namePair{
	{"ใจดี", "Jaidee"}, {"แสงทอง", "Saengthong"}, {"เจียรสุนันท์", "Jiansunan"}, {"ศรีสุข", "Srisuk"},
	{"บุญมา", "Boonma"}, {"วงศ์ใหญ่", "Wongyai"}, {"ทองดี", "Thongdee"}, {"มั่นคง", "Mankong"},
	{"รุ่งเรือง", "Rungrueang"}, {"พรหมมา", "Prommma"}, {"สายสุวรรณ", "Saisuwan"}, {"แก้วมณี", "Kaewmanee"},
	{"ชัยมงคล", "Chaimongkol"}, {"สมบูรณ์", "Somboon"}, {"อินทร์แก้ว", "Inkaew"}, {"เพชรรัตน์", "Petcharat"},
	{"ปัญญาดี", "Panyadee"}, {"สุขสวัสดิ์", "Suksawat"}, {"ศรีวงศ์", "Sriwong"}, {"นาคสุข", "Naksuk"},
}

// จำนวนพนักงาน mock ต่อ shift_code
var mockCounts = []struct {
	shift string
	count int
}{
	{"THAI-TDA", 70}, {"THAI-TDAMH", 20},
	{"THAI-TDB", 70}, {"THAI-TDBMH", 20},
	{"THAI-TDC", 70}, {"THAI-TDCMH", 20},
	{"THAI-OFF", 45},
	{"THAI-ODIR", 6},  // director  (ขึ้นต้น THAI-O เหมือน office) → ต้องถูกตัดออก
	{"THAI-OINT", 12}, // internship (ขึ้นต้น THAI-O เหมือน office) → ต้องถูกตัดออก
}

func mockEmployees() []employee {
	r := rand.New(rand.NewPCG(2027, 1))
	var list []employee
	gid := 660000
	for _, mc := range mockCounts {
		for i := 0; i < mc.count; i++ {
			gid += 1 + r.IntN(37)
			fn := firstNames[r.IntN(len(firstNames))]
			ln := lastNames[r.IntN(len(lastNames))]
			id := fmt.Sprintf("%06d", gid)
			list = append(list, employee{
				GID:       id,
				FullName:  fn.en + " " + ln.en,
				THFName:   fn.th,
				THLName:   ln.th,
				ShiftCode: mc.shift,
				Picture:   id,
			})
		}
	}
	return list
}
