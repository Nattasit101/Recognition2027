import { useEffect, useState } from "react";
import { Photo } from "../components/Avatar";
import { ROUNDS, TIMING, TOTAL_WINNERS } from "../config";
import { useSyncedState } from "../hooks/useSyncedState";
import type { PictureMap } from "../lib/channel";
import { chunk, pad } from "../lib/format";
import type { Employee, ShowState } from "../types";

type Row = { no: number; person: Employee };

/**
 * จอข้าง (แนวตั้ง 1:2) — แสดงคิวผู้โชคดีตามจอหลัก
 * พื้นหลังคือ Scene/Side cabinet.png (โปรแกรมของทีมจอจะดึงไปโชว์ซ้าย/ขวาเอง)
 */
export function SideScreen() {
  const { state, pictures } = useSyncedState();

  return (
    <div className="viewport">
      <div className="stage stage-side">
        {state ? (
          <SideContent state={state} pictures={pictures} />
        ) : (
          <>
            <Title small="WAITING" label="รอเชื่อมต่อจอหลัก" />
            <div className="side-screen">
              <Ready text="เปิด ?screen=main ก่อน" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Title({ small, label }: { small: string; label: string }) {
  return (
    <header className="side-title">
      <small className="pixel green">{small}</small>
      <h2>{label}</h2>
    </header>
  );
}

function Ready({ text }: { text: string }) {
  return (
    <div className="side-ready">
      <Photo mystery className="card-green" />
      <strong className="pixel yellow">READY?</strong>
      <p>{text}</p>
    </div>
  );
}

function Panel({ text, value, total }: { text: string; value: number; total: number }) {
  return (
    <footer className="side-panel">
      <b className="pixel">{text}</b>
      <span className="bar">
        <i style={{ width: `${Math.min(100, (value / Math.max(total, 1)) * 100)}%` }} />
      </span>
    </footer>
  );
}

function SideContent({ state, pictures }: { state: ShowState; pictures: PictureMap }) {
  const round = ROUNDS[state.roundIndex];
  const roundTitle = `ROUND ${pad(state.roundIndex + 1)}`;

  if (state.phase === "final") {
    const total = Object.values(state.results).reduce((n, l) => n + l.length, 0) || TOTAL_WINNERS;
    return (
      <>
        <Title small="GAME OVER" label="จบการสุ่ม" />
        <div className="side-screen">
          <div className="side-final">
            <strong className="pixel yellow">
              GAME
              <br />
              CLEAR!
            </strong>
            <p>ขอบคุณทุกท่าน</p>
          </div>
        </div>
        <Panel text={String(total)} value={1} total={1} />
      </>
    );
  }

  if (state.phase === "summary") {
    return (
      <>
        <Title small={roundTitle} label={round.label} />
        <SummaryPages key={round.code} winners={state.winners} pictures={pictures} />
      </>
    );
  }

  // idle / loading / spinning / reveal → คิว ล่าสุดอยู่บน (6 5 4 3 2 1) ครบ 6 พลิกหน้า
  const total = state.winners.length || round.winners;
  const size = TIMING.sideQueuePageSize;
  const page = state.queued === 0 ? 0 : Math.floor((state.queued - 1) / size);
  const rows: Row[] = state.winners
    .slice(page * size, Math.min(state.queued, page * size + size))
    .map((person, i) => ({ no: page * size + i + 1, person }))
    .reverse();

  return (
    <>
      <Title small={roundTitle} label={round.label} />
      <div className="side-screen">
        {rows.length ? (
          <div className="queue flip-in" key={page}>
            <small className="range pixel pink">
              NO.{pad(page * size + 1)}-{pad(page * size + size)}
            </small>
            {rows.map((row, i) => (
              <div className={`q-row ${i === 0 ? "latest" : ""}`} key={row.person.gid}>
                <Photo src={pictures[row.person.gid]} className="card-green" />
                <div>
                  <b className="pixel">{pad(row.no)}</b>
                  <span>
                    {row.person.th_fname} {row.person.th_lname}
                  </span>
                  <small>{row.person.full_name}</small>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Ready text="รูปผู้โชคดีจะแสดงที่นี่" />
        )}
      </div>
      <Panel text={`${pad(state.queued)}/${pad(total)}`} value={state.queued} total={total} />
    </>
  );
}

/** สรุปรอบ: หน้าละ 12 คน เปลี่ยนหน้าทุก 10 วิ */
function SummaryPages({ winners, pictures }: { winners: Employee[]; pictures: PictureMap }) {
  const size = TIMING.sideSummaryPageSize;
  const pages = chunk(
    winners.map((person, i) => ({ no: i + 1, person })),
    size,
  );
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (pages.length <= 1) return;
    const t = window.setInterval(() => setPage((p) => (p + 1) % pages.length), TIMING.sideSummaryRotateMs);
    return () => window.clearInterval(t);
  }, [pages.length]);

  const current = pages[page] ?? [];
  const from = page * size + 1;
  return (
    <>
      <div className="side-screen">
        <div className="summary-list flip-in" key={page}>
          <small className="range pixel pink">
            NO.{pad(from)}-{pad(page * size + size)}
          </small>
          {current.map((row) => (
            <div className="s-row" key={row.person.gid}>
              <Photo src={pictures[row.person.gid]} className="card-green" />
              <b className="pixel">{pad(row.no)}</b>
              <span>
                {row.person.th_fname} {row.person.th_lname}
              </span>
            </div>
          ))}
        </div>
      </div>
      <Panel text={`P.${page + 1}/${pages.length}`} value={page + 1} total={pages.length} />
    </>
  );
}
