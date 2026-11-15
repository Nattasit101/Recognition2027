import type { Round } from "./types";

export const ROUNDS: Round[] = [
  { code: "A", label: "พนักงานกะ A", winners: 35, panelLabel: "SHIFT", panelValue: "A" },
  { code: "B", label: "พนักงานกะ B", winners: 35, panelLabel: "SHIFT", panelValue: "B" },
  { code: "C", label: "พนักงานกะ C", winners: 35, panelLabel: "SHIFT", panelValue: "C" },
  { code: "OFFICE", label: "พนักงาน Office", winners: 15, panelLabel: "GROUP", panelValue: "OFFICE" },
];

export const TOTAL_WINNERS = ROUNDS.reduce((sum, r) => sum + r.winners, 0);

/** ซ้อมแบบเร่งเวลา: เพิ่ม &speed=10 ต่อท้าย URL (ทุกจอ) */
const SPEED = Math.max(1, Number(new URLSearchParams(window.location.search).get("speed")) || 1);

export const TIMING = {
  /** เวลาหมุนก่อนเฉลยแต่ละคน (ms) — 120 คน × (1.5+3) วิ ≈ 9 นาที */
  spinMs: 1500 / SPEED,
  /** ค้างหน้าผู้โชคดี (ms) */
  holdMs: 3000 / SPEED,
  /** จอข้าง: จำนวนคนต่อหน้าขณะสุ่ม (6 → 6 5 4 3 2 1 แล้วพลิกเป็น 12..7) */
  sideQueuePageSize: 6,
  /** จอข้าง: จำนวนคนต่อหน้าตอนสรุปรอบ */
  sideSummaryPageSize: 12,
  /** จอหลักตอนจบรอบ/สรุป: ไฮไลต์วิ่งไปทีละคน (ms) */
  spotlightMs: 1200 / SPEED,
  /** จอหลักหน้าสรุปสุดท้าย: เปลี่ยนหน้า (รวม → A → B → C → OFFICE) ทุกๆ (ms) */
  finalRotateMs: 10000 / SPEED,
  /** จอข้าง: เปลี่ยนหน้าสรุปทุกๆ (ms) */
  sideSummaryRotateMs: 10000 / SPEED,
};

/** ว่าง = ใช้ proxy ของ Vite (/random, /pool, /all, /api) */
export const API_BASE: string = import.meta.env.VITE_API_BASE ?? "";
