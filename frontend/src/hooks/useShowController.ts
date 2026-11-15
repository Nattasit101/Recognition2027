import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ROUNDS, TIMING } from "../config";
import { drawRound, fetchPool } from "../lib/api";
import { collectPictures, openChannel, stripPictures } from "../lib/channel";
import { downloadWinnersCsv } from "../lib/exportCsv";
import { clearShow, loadShow, saveShow } from "../lib/storage";
import type { Command, Employee, FinalView, ShowState } from "../types";

const initialState: ShowState = {
  roundIndex: 0,
  phase: "idle",
  winners: [],
  current: 0,
  queued: 0,
  results: {},
  error: "",
  finalView: "names",
};

/** กู้คืนจาก localStorage (กรณีรีเฟรช/เบราว์เซอร์ค้างกลางงาน) */
function restoreState(): ShowState {
  const saved = loadShow();
  if (!saved) return initialState;
  const roundIndex = Math.min(Math.max(saved.roundIndex, 0), ROUNDS.length - 1);
  const winners = saved.results[ROUNDS[roundIndex].code] ?? [];
  const queued = Math.min(saved.queued, winners.length);
  const roundDone = winners.length > 0 && queued >= winners.length;
  return {
    ...initialState,
    roundIndex,
    results: saved.results,
    winners: roundDone ? winners : [],
    queued,
    current: queued,
    // กลางรอบ → กลับไปหน้ารอกด START แล้วเล่นต่อจากคนถัดไป (รายชื่อเดิม)
    phase: saved.phase === "final" ? "final" : roundDone ? "summary" : "idle",
    finalView: saved.finalView ?? "names",
  };
}

/**
 * ตัวคุมการแสดงผล — ใช้ที่จอกลางเท่านั้น (เปิดได้หน้าต่างเดียว)
 * 1 รอบ: กด START → เรียก /random ครั้งเดียว (ล็อกผลไว้) → วนทีละคน
 * 1 คน: spinning (spinMs) → reveal (holdMs) → เข้าคิวจอข้าง → คนถัดไป
 */
export function useShowController() {
  const [state, setState] = useState<ShowState>(restoreState);
  const [pool, setPool] = useState<Employee[]>([]);
  const stateRef = useRef(state);
  useLayoutEffect(() => {
    stateRef.current = state;
  });

  // ---------- actions ----------
  const start = useCallback(async () => {
    const s = stateRef.current;
    if (s.phase !== "idle") return;
    const round = ROUNDS[s.roundIndex];
    setState((prev) => ({ ...prev, phase: "loading", error: "" }));
    try {
      // สุ่มแล้ว (เช่น รีเฟรชกลางรอบ) → ใช้รายชื่อเดิม ห้ามสุ่มซ้ำ
      let winners = s.results[round.code];
      if (!winners?.length) {
        const result = await drawRound(round.code);
        winners = result.data ?? [];
        if (!winners.length) throw new Error("empty result");
      }
      const spinPool = await fetchPool(round.code);
      setPool(spinPool.length ? spinPool : winners);
      const resumeFrom = Math.min(s.queued, winners.length);
      setState((prev) => ({
        ...prev,
        winners,
        results: { ...prev.results, [round.code]: winners },
        current: resumeFrom,
        queued: resumeFrom,
        phase: resumeFrom >= winners.length ? "summary" : "spinning",
      }));
    } catch {
      setState((prev) => ({
        ...prev,
        phase: "idle",
        error: "เชื่อมต่อระบบสุ่มไม่ได้ กรุณาตรวจสอบ backend",
      }));
    }
  }, []);

  const next = useCallback(() => {
    const s = stateRef.current;
    if (s.phase !== "summary") return;
    if (s.roundIndex + 1 >= ROUNDS.length) {
      setState((prev) => ({ ...prev, phase: "final", finalView: "names" }));
      return;
    }
    setState((prev) => ({
      ...prev,
      roundIndex: prev.roundIndex + 1,
      phase: "idle",
      winners: [],
      current: 0,
      queued: 0,
    }));
  }, []);

  /**
   * ตอนจบงาน: สลับหน้ารายชื่อ / หน้าขอบคุณ
   * กดได้เมื่อจบรอบสุดท้ายแล้ว (หน้าสรุป Office หรือหน้าจบงาน) กันกดพลาดระหว่างงาน
   */
  const showFinal = useCallback((view: FinalView) => {
    const s = stateRef.current;
    const lastRoundDone = s.phase === "summary" && s.roundIndex === ROUNDS.length - 1;
    if (s.phase !== "final" && !lastRoundDone) return;
    setState((prev) => ({ ...prev, phase: "final", finalView: view }));
  }, []);

  const reset = useCallback(() => {
    if (!window.confirm("ล้างผลสุ่มทั้งหมดและเริ่มใหม่? (ใช้ตอนซ้อมเท่านั้น)")) return;
    clearShow();
    setPool([]);
    setState(initialState);
  }, []);

  // ---------- timers ----------
  useEffect(() => {
    if (state.phase === "spinning") {
      const t = window.setTimeout(
        () => setState((prev) => ({ ...prev, phase: "reveal" })),
        TIMING.spinMs,
      );
      return () => window.clearTimeout(t);
    }
    if (state.phase === "reveal") {
      const t = window.setTimeout(() => {
        setState((prev) => {
          const queued = prev.current + 1;
          if (queued >= prev.winners.length) return { ...prev, queued, phase: "summary" };
          return { ...prev, queued, current: queued, phase: "spinning" };
        });
      }, TIMING.holdMs);
      return () => window.clearTimeout(t);
    }
  }, [state.phase, state.current]);

  // ---------- persist ----------
  useEffect(() => {
    saveShow({
      roundIndex: state.roundIndex,
      queued: state.queued,
      phase: state.phase,
      results: state.results,
      finalView: state.finalView,
    });
  }, [state.roundIndex, state.queued, state.phase, state.results, state.finalView]);

  // ---------- sync to side screens ----------
  const channelRef = useRef<ReturnType<typeof openChannel> | null>(null);
  const commandRef = useRef<(c: Command) => void>(() => {});
  useLayoutEffect(() => {
    commandRef.current = (command) => {
      if (command === "start") void start();
      else if (command === "next") next();
      else if (command === "reset") reset();
      else if (command === "show-names") showFinal("names");
      else if (command === "show-thanks") showFinal("thanks");
    };
  });
  useEffect(() => {
    const channel = openChannel((msg) => {
      if (msg.type === "hello") {
        channel.post({ type: "pictures", pictures: collectPictures(stateRef.current) });
        channel.post({ type: "state", state: stripPictures(stateRef.current) });
      }
      if (msg.type === "command") commandRef.current(msg.command);
    });
    channelRef.current = channel;
    return () => channel.close();
  }, []);

  // รูปส่งเฉพาะตอนรายชื่อรอบเปลี่ยน (ก่อน state เสมอ)
  useEffect(() => {
    channelRef.current?.post({ type: "pictures", pictures: collectPictures(stateRef.current) });
  }, [state.winners]);

  useEffect(() => {
    channelRef.current?.post({ type: "state", state: stripPictures(state) });
  }, [state]);

  // ---------- keyboard / presenter clicker ----------
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const advanceKeys = ["Space", "Enter", "NumpadEnter", "ArrowRight", "PageDown"];
      if (advanceKeys.includes(event.code)) {
        event.preventDefault();
        // Space/Enter/clicker = เริ่มสุ่มเท่านั้น (กันกดพลาดข้ามรอบ)
        if (stateRef.current.phase === "idle") void start();
      } else if (event.code === "KeyL" && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        showFinal("names");
      } else if (event.code === "KeyT" && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        showFinal("thanks");
      } else if (event.code === "KeyN" && !event.ctrlKey && !event.metaKey) {
        // ไปรอบถัดไป: ต้องกด N (หรือปุ่ม "รอบถัดไป" ในหน้า preview) เท่านั้น
        event.preventDefault();
        next();
      } else if (event.code === "KeyE" && event.ctrlKey && event.shiftKey) {
        event.preventDefault();
        downloadWinnersCsv();
      } else if (event.code === "Backspace" && event.ctrlKey && event.shiftKey) {
        event.preventDefault();
        reset();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [start, next, reset, showFinal]);

  return { state, pool, start, next, reset };
}
