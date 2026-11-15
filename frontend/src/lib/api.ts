import { API_BASE } from "../config";
import type { DrawResult, Employee } from "../types";

async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

/**
 * สุ่มผู้โชคดีทั้งรอบ — backend สุ่มใหม่ทุกครั้งที่เรียก
 * frontend จึงเรียกแค่ครั้งเดียวต่อรอบ แล้วเก็บผลไว้ใน localStorage (ดู lib/storage.ts)
 */
export const drawRound = (round: string) =>
  request<DrawResult>(`/random?round=${encodeURIComponent(round)}`);

/** (ไม่บังคับ) รายชื่อสุ่มๆ สำหรับแอนิเมชันหมุน — ถ้า backend ไม่มี endpoint นี้จะคืน [] */
export const fetchPool = (round: string, limit = 40) =>
  request<{ data: Employee[] }>(`/pool?round=${encodeURIComponent(round)}&limit=${limit}`)
    .then((r) => r.data ?? [])
    .catch(() => [] as Employee[]);
