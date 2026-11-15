import { useEffect, useState } from "react";
import { openChannel, type PictureMap } from "../lib/channel";
import type { ShowState } from "../types";

/** จอข้าง: รับ state + รูปจากจอหลักผ่าน BroadcastChannel */
export function useSyncedState() {
  const [state, setState] = useState<ShowState | null>(null);
  const [pictures, setPictures] = useState<PictureMap>({});

  useEffect(() => {
    const channel = openChannel((msg) => {
      if (msg.type === "state") setState(msg.state);
      if (msg.type === "pictures") setPictures((prev) => ({ ...prev, ...msg.pictures }));
    });
    channel.post({ type: "hello" });
    // ถ้าจอหลักเปิดทีหลัง ให้ถามซ้ำเรื่อยๆ
    const retry = window.setInterval(() => channel.post({ type: "hello" }), 3000);
    return () => {
      window.clearInterval(retry);
      channel.close();
    };
  }, []);

  return { state, pictures };
}
