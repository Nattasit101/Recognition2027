export type Employee = {
  gid: string;
  full_name: string;
  th_fname: string;
  th_lname: string;
  shift_code: string;
  PiCTURE: string;
  picture_base64?: string;
};

/** response ของ GET /random?round=X (backend จริง: สุ่มใหม่ทุกครั้งที่เรียก) */
export type DrawResult = {
  saved: boolean;
  file: string | null;
  count: number;
  data: Employee[];
};

export type Round = {
  code: string;
  label: string;
  winners: number;
  /** ป้ายบนแผงล่างของตู้ เช่น SHIFT A / GROUP OFFICE */
  panelLabel: string;
  panelValue: string;
};

/**
 * idle     รอผู้บริหารกดสุ่ม
 * loading  เรียก backend สุ่มทั้งรอบ (บันทึกลงฐานข้อมูลครั้งเดียว)
 * spinning หมุนชื่อ/หน้าคนก่อนเฉลย
 * reveal   แสดงผู้โชคดีค้างไว้ HOLD_MS
 * summary  ครบรอบ — จอกลางค้างรายชื่อทั้งรอบ, จอข้างวนหน้าทุก 10 วิ
 * final    จบทั้ง 4 รอบ
 */
export type Phase = "idle" | "loading" | "spinning" | "reveal" | "summary" | "final";

export type ShowState = {
  roundIndex: number;
  phase: Phase;
  /** ผู้โชคดีของรอบปัจจุบัน (ลำดับตามที่สุ่มได้) */
  winners: Employee[];
  /** index ของคนที่กำลังหมุน/เฉลยบนจอกลาง */
  current: number;
  /** จำนวนคนที่แสดงครบแล้วและเข้าคิวจอข้าง */
  queued: number;
  /** ผลของทุกรอบที่จบแล้ว key = round code */
  results: Record<string, Employee[]>;
  error: string;
  /** หน้าจอตอนจบงาน: names = วนรายชื่อทีละรอบ, thanks = หน้าขอบคุณ (กดสลับได้ เผื่อถ่ายรูป) */
  finalView: FinalView;
};

export type FinalView = "names" | "thanks";

export type Command = "start" | "next" | "reset" | "show-names" | "show-thanks";
