import "./App.css";
import { MainScreen } from "./screens/MainScreen";
import { PreviewScreen } from "./screens/PreviewScreen";
import { SideScreen } from "./screens/SideScreen";

/**
 * เลือกจอด้วย query string
 *   /?screen=main   จอหลัก (ตัวคุมการสุ่ม) สัดส่วน 3:2
 *   /?screen=side   จอข้าง สัดส่วน 1:2 (ทีมจอดึงไปโชว์ซ้าย/ขวาเอง)
 *   /               หน้า preview + ปุ่มควบคุม
 */
function App() {
  const screen = new URLSearchParams(window.location.search).get("screen");

  if (screen === "main") return <MainScreen />;
  if (screen === "side" || screen === "left" || screen === "right") return <SideScreen />;
  return <PreviewScreen />;
}

export default App;
