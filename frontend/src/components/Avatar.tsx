import { useState } from "react";
import placeholder from "../assets/employee-placeholder.png";
import type { Employee } from "../types";

/** รูปพนักงาน — ไม่มีรูป/โหลดไม่ได้ ใช้รูป placeholder จากดีไซน์ */
export function Photo({
  employee,
  src,
  className = "",
  mystery = false,
}: {
  employee?: Employee;
  /** override รูป (จอข้างได้รูปผ่าน channel แยก) */
  src?: string;
  className?: string;
  /** แสดงเป็น "?" (ยังไม่เฉลย) */
  mystery?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const url = src ?? employee?.picture_base64;
  const usable = !mystery && !failed && !!url && url.startsWith("data:image/");

  return (
    <div className={`photo ${className}`}>
      <img src={usable ? url : placeholder} alt="" onError={() => setFailed(true)} draggable={false} />
      {mystery && <span className="photo-q">?</span>}
    </div>
  );
}
