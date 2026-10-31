import { useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { ACESFilmicToneMapping } from "three";
import { BagScene } from "./game/BagScene";
import { GameHUD } from "./game/GameHUD";
import { useGame } from "./game/store";

function Alarm() {
  const mode = useGame((s) => s.mode);
  const result = useGame((s) => s.result);
  const previous = useRef(mode);
  useEffect(() => {
    if (mode === "result" && previous.current !== "result" && result === "security") {
      try {
        const AudioCtx = window.AudioContext;
        if (AudioCtx) {
          const audio = new AudioCtx();
          const start = audio.currentTime;
          [0, 0.21, 0.42].forEach((offset) => {
            const oscillator = audio.createOscillator();
            const gain = audio.createGain();
            oscillator.type = "triangle";
            oscillator.frequency.setValueAtTime(offset === 0.21 ? 550 : 730, start + offset);
            gain.gain.setValueAtTime(0.0001, start + offset);
            gain.gain.exponentialRampToValueAtTime(0.12, start + offset + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.17);
            oscillator.connect(gain);
            gain.connect(audio.destination);
            oscillator.start(start + offset);
            oscillator.stop(start + offset + 0.18);
          });
          window.setTimeout(() => void audio.close(), 1300);
        }
      } catch {
        // Audio may be restricted by browser autoplay policy.
      }
    }
    previous.current = mode;
  }, [mode, result]);
  return null;
}

export default function App() {
  const mode = useGame((s) => s.mode);
  const tick = useGame((s) => s.tick);
  useEffect(() => {
    if (mode !== "search") return;
    const handle = window.setInterval(tick, 1000);
    return () => window.clearInterval(handle);
  }, [mode, tick]);
  return (
    <div className="app">
      <Alarm />
      <GameHUD />
      <main className="viewport">
        <div className="viewport-top">
          <span className="view-label"><span className="online-dot" /> LIVE 3D / INSPECTION TABLE 01</span>
          <span className="view-label secondary">LMB 구획 선택 · DRAG 회전 · WHEEL 확대</span>
        </div>
        <Canvas shadows dpr={[1, 1.75]}
          camera={{ position: [4.6, 6.9, 7.4], fov: 38, near: 0.1, far: 100 }}
          gl={{ antialias: true, powerPreference: "high-performance" }}
          onCreated={({ gl }) => { gl.toneMapping = ACESFilmicToneMapping; gl.toneMappingExposure = 1.35; }}>
          <BagScene />
        </Canvas>
        <div className="viewport-foot"><span>● REALTIME RENDER</span><span>PROTOTYPE V0.1 · SINGLE SCREEN / HOT SEAT</span></div>
        {mode === "handoff" && (
          <div className="handoff-curtain" role="status">
            <div className="curtain-icon">◈</div>
            <p className="eyebrow">ROLE SWITCH / PRIVACY SCREEN</p>
            <h2>수색 담당자에게<br/>화면을 넘기세요.</h2>
            <p>가방의 위치와 내부 배치 정보는 가려졌습니다.<br/>준비가 되면 검사 시작을 누르세요.</p>
            <button className="button primary large" onClick={useGame.getState().startSearch}>수색 시작 →</button>
          </div>
        )}
        {mode === "result" && <ResultCurtain />}
      </main>
    </div>
  );
}

function ResultCurtain() {
  const result = useGame((s) => s.result);
  const reset = useGame((s) => s.reset);
  const time = useGame((s) => s.timeLeft);
  return (
    <div className={"result-curtain " + (result === "security" ? "caught" : "escaped")}>
      <span className="eyebrow">{result === "security" ? "SECURITY BREACH DETECTED" : "BAG CLEARED"}</span>
      <div className="result-emoji">{result === "security" ? "🚨" : "🧳"}</div>
      <h2>{result === "security" ? "RED ALERT!" : "통과 성공!"}</h2>
      <p>{result === "security" ? "수색팀이 목표 물품을 발견했습니다." : "밀반입팀이 수색을 피하는 데 성공했습니다."}</p>
      <div className="result-meta">남은 시간 <strong>{Math.floor(time)}초</strong></div>
      <button className="button primary large" onClick={reset}>새 라운드 시작 ↗</button>
    </div>
  );
}