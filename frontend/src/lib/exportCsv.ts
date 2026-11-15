import { ROUNDS } from "../config";
import { loadShow } from "./storage";

/**
 * Export รายชื่อผู้โชคดีเป็น CSV สำหรับเปิดใน Excel
 * - ใส่ BOM (UTF-8) ให้ Excel อ่านภาษาไทยถูก
 * - ใช้ CRLF และใส่ "..." ทุกช่อง
 * - รหัสที่ขึ้นต้นด้วย 0 เขียนเป็น ="0123" กัน Excel ตัด 0 หน้า
 *
 * อ่านข้อมูลจาก localStorage ของจอหลัก (ใช้ได้ทั้งจากจอหลักและหน้า preview)
 */
const HEADERS = [
  "รอบ",
  "กลุ่ม",
  "ลำดับ",
  "รหัสพนักงาน",
  "ชื่อ",
  "นามสกุล",
  "ชื่อ-นามสกุล (EN)",
  "shift_code",
  "สถานะ",
];

function cell(value: string | number): string {
  const text = String(value ?? "");
  if (/^0\d+$/.test(text)) return `="${text}"`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function buildWinnersCsv(): { csv: string; count: number } {
  const show = loadShow();
  const rows: string[] = [HEADERS.map(cell).join(",")];
  let count = 0;

  ROUNDS.forEach((round, roundIndex) => {
    const winners = show?.results[round.code] ?? [];
    winners.forEach((e, i) => {
      const announced =
        show?.phase === "final" ||
        roundIndex < (show?.roundIndex ?? 0) ||
        (roundIndex === show?.roundIndex && i < show.queued);
      rows.push(
        [
          roundIndex + 1,
          round.label,
          i + 1,
          e.gid,
          e.th_fname,
          e.th_lname,
          e.full_name,
          e.shift_code,
          announced ? "ประกาศแล้ว" : "ยังไม่ประกาศ",
        ]
          .map(cell)
          .join(","),
      );
      count++;
    });
  });

  return { csv: "﻿" + rows.join("\r\n") + "\r\n", count };
}

export function downloadWinnersCsv(): number {
  const { csv, count } = buildWinnersCsv();
  const stamp = new Date()
    .toLocaleString("sv-SE", { hour12: false })
    .replace(/[: ]/g, "-")
    .slice(0, 16);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `recognition2027_winners_${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return count;
}
