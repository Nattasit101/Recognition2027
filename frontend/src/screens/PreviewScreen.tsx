import { useEffect, useRef } from "react";
import { openChannel } from "../lib/channel";
import { downloadWinnersCsv } from "../lib/exportCsv";
import type { Command } from "../types";

/**
 * หน้าทดสอบ: จอหลัก + จอข้าง (iframe) พร้อมปุ่มควบคุม
 * ใช้งานจริงให้เปิด ?screen=main และ ?screen=side เป็น 2 หน้าต่าง ให้โปรแกรมของทีมจอดึงไปแสดง
 */
export function PreviewScreen() {
  const channelRef = useRef<ReturnType<typeof openChannel> | null>(null);

  useEffect(() => {
    const channel = openChannel(() => {});
    channelRef.current = channel;
    return () => channel.close();
  }, []);

  // ส่ง &speed=... ต่อให้ iframe/หน้าต่างแยก (ซ้อมแบบเร่งเวลา)
  const speed = new URLSearchParams(window.location.search).get("speed");
  const extra = speed ? `&speed=${encodeURIComponent(speed)}` : "";

  const send = (command: Command) => channelRef.current?.post({ type: "command", command });
  const open = (screen: string, w: number, h: number) =>
    window.open(`?screen=${screen}${extra}`, `r2027-${screen}`, `popup,width=${w},height=${h}`);

  return (
    <div className="preview">
      <header className="preview-bar">
        <strong>Recognition 2027 · Preview</strong>
        <div>
          <button onClick={() => send("start")}>▶ เริ่มสุ่มรอบนี้</button>
          <button onClick={() => send("next")}>⏭ รอบถัดไป (N)</button>
          <button onClick={() => send("show-names")}>📜 หน้ารายชื่อตอนจบ (L)</button>
          <button onClick={() => send("show-thanks")}>🙏 หน้าขอบคุณ (T)</button>
          <button
            onClick={() => {
              if (downloadWinnersCsv() === 0) window.alert("ยังไม่มีผลสุ่ม");
            }}
          >
            ⬇ Export CSV (Excel)
          </button>
          <button className="danger" onClick={() => send("reset")}>
            ↺ รีเซ็ต (ซ้อม)
          </button>
        </div>
        <div>
          เปิดหน้าต่างแยก:
          <button onClick={() => open("main", 1500, 1000)}>จอหลัก</button>
          <button onClick={() => open("side", 512, 1024)}>จอข้าง</button>
        </div>
      </header>
      <div className="preview-stage">
        <iframe className="pv-main" src={`?screen=main${extra}`} title="main" />
        <iframe className="pv-side" src={`?screen=side${extra}`} title="side" />
      </div>
      <p className="preview-note">
        จอหลักเปิดได้ที่เดียว (ถ้าเปิดหน้าต่างแยก ให้ปิดหน้า preview นี้ก่อน) · คีย์ลัดบนจอหลัก: Space / Enter / → /
        PageDown = เริ่มสุ่ม · N = รอบถัดไป · L = หน้ารายชื่อตอนจบ · T = หน้าขอบคุณ · Ctrl+Shift+E = Export CSV · Ctrl+Shift+Backspace = รีเซ็ต
      </p>
    </div>
  );
}
