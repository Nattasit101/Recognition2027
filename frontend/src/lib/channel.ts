import type { Command, ShowState } from "../types";

/**
 * ซิงก์จอหลักกับจอข้างผ่าน BroadcastChannel (เบราว์เซอร์เดียวกัน เครื่องเดียวกัน)
 * จอหลัก (?screen=main) เป็นตัวคุม state แล้ว broadcast ให้จอข้าง (?screen=side)
 *
 * รูป base64 ส่งแยกเป็นข้อความ "pictures" ครั้งเดียวต่อรอบ
 * ไม่ต้องแนบรูปไปกับ state ที่ส่งทุก 1-2 วินาที
 */
export type PictureMap = Record<string, string>;

export type ChannelMessage =
  | { type: "state"; state: ShowState }
  | { type: "pictures"; pictures: PictureMap }
  | { type: "hello" }
  | { type: "command"; command: Command };

const CHANNEL_NAME = "recognition2027-show";

export function openChannel(onMessage: (msg: ChannelMessage) => void) {
  const channel = new BroadcastChannel(CHANNEL_NAME);
  channel.onmessage = (event: MessageEvent<ChannelMessage>) => onMessage(event.data);
  return {
    post: (msg: ChannelMessage) => channel.postMessage(msg),
    close: () => channel.close(),
  };
}

export function stripPictures(state: ShowState): ShowState {
  const strip = (list: ShowState["winners"]) =>
    list.map(({ picture_base64: _omit, ...rest }) => rest);
  return {
    ...state,
    winners: strip(state.winners),
    results: Object.fromEntries(Object.entries(state.results).map(([k, v]) => [k, strip(v)])),
  };
}

export function collectPictures(state: ShowState): PictureMap {
  const map: PictureMap = {};
  for (const e of state.winners) if (e.picture_base64) map[e.gid] = e.picture_base64;
  return map;
}
