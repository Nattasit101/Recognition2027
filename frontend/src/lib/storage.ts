import type { Employee, FinalView, Phase } from "../types";

/**
 * เก็บผลสุ่มไว้ในเบราว์เซอร์ของจอกลาง
 * เพราะ backend สุ่มใหม่ทุกครั้งที่เรียก /random — ถ้ารีเฟรชหน้ากลางรอบ
 * จะต้องได้รายชื่อเดิม ไม่ใช่สุ่มใหม่
 */
const KEY = "r2027-show";

export type SavedShow = {
  roundIndex: number;
  queued: number;
  phase: Phase;
  /** ผลสุ่มของแต่ละรอบ (สุ่มแล้ว = ล็อก) */
  results: Record<string, Employee[]>;
  finalView?: FinalView;
};

export function loadShow(): SavedShow | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedShow) : null;
  } catch {
    return null;
  }
}

export function saveShow(show: SavedShow) {
  try {
    localStorage.setItem(KEY, JSON.stringify(show));
  } catch {
    // รูปจริงแบบ base64 อาจทำให้เกินโควตา (~5MB) → เก็บเฉพาะชื่อแทน
    const slim = Object.fromEntries(
      Object.entries(show.results).map(([k, list]) => [
        k,
        list.map(({ picture_base64: _omit, ...rest }) => rest),
      ]),
    );
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...show, results: slim }));
    } catch {
      console.error("บันทึกผลสุ่มลง localStorage ไม่ได้");
    }
  }
}

export function clearShow() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
