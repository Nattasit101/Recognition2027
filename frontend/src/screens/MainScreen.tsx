import { useEffect, useState, type CSSProperties } from "react";
import { Photo } from "../components/Avatar";
import { ROUNDS, TIMING, TOTAL_WINNERS } from "../config";
import { useShowController } from "../hooks/useShowController";
import { pad } from "../lib/format";
import type { Employee, ShowState } from "../types";

/**
 * จอหลัก (LED 6×4 m = 3:2) — เป็นตัวคุมการสุ่ม
 * แสดงเฉพาะจอของตู้ (assets/main-screen.png ตัดจาก Scene/Main cabinet.png ไม่เอาปุ่มด้านล่าง)
 */
export function MainScreen() {
  const { state, pool, start } = useShowController();
  // คลิกจอได้แค่ตอนเริ่มสุ่ม — ไปรอบถัดไปต้องกดปุ่ม "รอบถัดไป" หรือคีย์ N เท่านั้น
  const onClick = state.phase === "idle" ? () => void start() : undefined;

  return (
    <div className="viewport">
      <div className="stage stage-main">
        <div className="main-screen" onClick={onClick}>
          <MainContent state={state} pool={pool} />
        </div>
        {state.error && <p className="error-toast">{state.error}</p>}
      </div>
    </div>
  );
}

const totalWinners = (state: ShowState) =>
  Object.values(state.results).reduce((n, list) => n + list.length, 0) || TOTAL_WINNERS;

function MainContent({ state, pool }: { state: ShowState; pool: Employee[] }) {
  const round = ROUNDS[state.roundIndex];
  const winner = state.winners[state.current];

  switch (state.phase) {
    case "idle":
    case "loading":
      return (
        <div className="scene idle">
          <small className="pixel pink">
            ROUND {pad(state.roundIndex + 1)}/{pad(ROUNDS.length)}
          </small>
          <div className="mystery-row">
            {[0, 1, 2, 3, 4].map((i) => (
              <Photo
                key={i}
                mystery
                className={`${i === 2 ? "card-yellow big" : i % 2 ? "card-green" : "card-green far"} ${
                  state.phase === "loading" ? "shake" : ""
                }`}
              />
            ))}
          </div>
          <h1 className="pixel yellow">{round.winners} WINNERS</h1>
          <p>ผู้โชคดี{round.label}</p>
          <em className="pixel pink blink">{state.phase === "loading" ? "LOADING..." : "› PRESS START ‹"}</em>
        </div>
      );

    case "spinning":
      return <Spinning key={state.current} pool={pool} no={state.current + 1} />;

    case "reveal":
      return winner ? (
        <div className="scene reveal" key={winner.gid}>
          <div className="reveal-photo">
            <span className="winner-tag pixel">WINNER!</span>
            <Photo employee={winner} className="card-yellow" />
          </div>
          <div className="reveal-info">
            <div className="pixel yellow no">NO.{pad(state.current + 1)}</div>
            <h1>
              {winner.th_fname}
              <br />
              {winner.th_lname}
            </h1>
            <p className="pink">{winner.full_name}</p>
            <p className="muted">GID {winner.gid}</p>
            <div className="hold">
              <small className="pixel">HOLD</small>
              <span>
                <i style={{ animationDuration: `${TIMING.holdMs}ms` }} />
              </span>
            </div>
          </div>
        </div>
      ) : null;

    case "summary":
      return (
        <div className="scene summary">
          <h1 className="pixel yellow">ROUND {pad(state.roundIndex + 1)} CLEAR!</h1>
          <WinnerGrid winners={state.winners} />
        </div>
      );

    case "final":
      return <FinalShow state={state} />;
  }
}

/**
 * ตารางผู้โชคดี (รูป + ชื่อ + gid) พร้อมไฮไลต์วิ่งวนทีละคนไม่หยุด
 * ใช้ตอนจบรอบ (ค้างไว้จนกว่าจะกดรอบถัดไป) และหน้าสรุปสุดท้าย
 */
function WinnerGrid({ winners, spotlight = true }: { winners: Employee[]; spotlight?: boolean }) {
  const many = winners.length > 20;
  const [spot, setSpot] = useState(0);

  useEffect(() => {
    if (!spotlight || !winners.length) return;
    const t = window.setInterval(() => setSpot((i) => (i + 1) % winners.length), TIMING.spotlightMs);
    return () => window.clearInterval(t);
  }, [spotlight, winners.length]);

  return (
    <div className={`grid ${many ? "grid-9" : "grid-5"}`}>
      {winners.map((p, i) => (
        <figure key={p.gid} className={spotlight && i === spot ? "spot" : ""} style={{ "--i": i } as CSSProperties}>
          <Photo employee={p} className={i % 3 === 1 ? "card-pink" : "card-green"} />
          <figcaption>
            <span>{p.th_fname}</span>
            <span>{p.th_lname}</span>
            <small>{p.gid}</small>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

/** ตอนจบงาน: หน้ารายชื่อ (วนทีละรอบ) หรือหน้าขอบคุณ — สลับด้วยปุ่ม L / T */
function FinalShow({ state }: { state: ShowState }) {
  return state.finalView === "thanks" ? <ThanksScreen state={state} /> : <FinalNames state={state} />;
}

/** หน้าขอบคุณ — ค้างไว้นิ่งๆ สำหรับถ่ายรูป */
function ThanksScreen({ state }: { state: ShowState }) {
  const all = ROUNDS.flatMap((r) => state.results[r.code] ?? []);
  return (
    <div className="scene final thanks" key="thanks">
      <div className="mosaic" aria-hidden>
        {all.slice(0, 60).map((p) => (
          <Photo key={p.gid} employee={p} />
        ))}
      </div>
      <small className="pixel pink">RECOGNITION 2027</small>
      <div className="pixel yellow thank-title">THANK YOU</div>
      <h2>ขอบคุณทุกท่าน</h2>
      <p>ขอแสดงความยินดีกับผู้โชคดีทั้ง {totalWinners(state)} ท่าน</p>
      <div className="round-counts pixel">
        {ROUNDS.map((r, i) => (
          <span key={r.code} className={`c${i}`}>
            {r.code} {state.results[r.code]?.length ?? r.winners}
          </span>
        ))}
      </div>
    </div>
  );
}

/** หน้ารายชื่อตอนจบ — ค้างทีละรอบ (ไม่มีไฮไลต์วิ่ง) เปลี่ยนรอบทุก 10 วิ */
function FinalNames({ state }: { state: ShowState }) {
  const rounds = ROUNDS.filter((r) => state.results[r.code]?.length);
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (rounds.length <= 1) return;
    const t = window.setInterval(() => setPage((p) => (p + 1) % rounds.length), TIMING.finalRotateMs);
    return () => window.clearInterval(t);
  }, [rounds.length]);

  const round = rounds[page % Math.max(rounds.length, 1)];
  if (!round) return null;
  const roundNo = ROUNDS.indexOf(round) + 1;
  return (
    <div className="scene summary final-round" key={round.code}>
      <div className="page-dots">
        {rounds.map((r, i) => (
          <i key={r.code} className={i === page ? "on" : ""} />
        ))}
      </div>
      <div className="final-head">
        <span className="pixel yellow">ROUND {pad(roundNo)}</span>
        <h2>{round.label}</h2>
        <span className="pixel total">
          TOTAL <b>{totalWinners(state)}</b>
        </span>
      </div>
      <WinnerGrid winners={state.results[round.code]} spotlight={false} />
    </div>
  );
}

/** สลับรูป/ชื่อพนักงานรัวๆ ก่อนเฉลย — ช้าลงเรื่อยๆ ตอนท้าย */
function Spinning({ pool, no }: { pool: Employee[]; no: number }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!pool.length) return;
    let delay = 60;
    let timer = 0;
    const tick = () => {
      setIndex((i) => (i + 1) % pool.length);
      delay = Math.min(delay * 1.07, 240);
      timer = window.setTimeout(tick, delay);
    };
    timer = window.setTimeout(tick, delay);
    return () => window.clearTimeout(timer);
  }, [pool]);

  const n = Math.max(pool.length, 1);
  const at = (offset: number): Employee | undefined => pool[(index + offset + n) % n];
  const person = at(0);
  return (
    <div className="scene spinning">
      <small className="pixel pink">NO.{pad(no)}</small>
      <div className="reel">
        <Photo employee={at(-1)} className="card-pink side" />
        <Photo employee={person} className="card-yellow center" />
        <Photo employee={at(1)} className="card-green side" />
      </div>
      <h1>{person ? `${person.th_fname} ${person.th_lname}` : "กำลังสุ่ม..."}</h1>
      <strong className="pixel green">SPINNING...</strong>
    </div>
  );
}
