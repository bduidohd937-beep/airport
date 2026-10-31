import { BAG_ZONES, TARGETS, asClock, fitsTarget, isRevealed, zipperCost, type TargetId } from "./rules";
import { useGame } from "./store";

export function GameHUD() {
  const s = useGame();
  const zone = BAG_ZONES.find((item) => item.id === s.selectedZone);
  const selectedZip = s.extraZips[s.selectedZone] ?? 0;
  const opened = s.opened[s.selectedZone] ?? 0;
  const revealed = s.selectedZone >= 0 && isRevealed(opened, selectedZip);
  const currentTarget = TARGETS[s.targetId];
  const canPlace = zone ? fitsTarget(s.targetId, zone.id) : false;

  return (
    <aside className="hud" aria-label="게임 조작 패널">
      <header className="brand">
        <div className="brand-mark">A<span>✦</span></div>
        <div><strong>AIRPORT</strong><small>RED ALERT / INSPECTION SIM</small></div>
      </header>
      <div className="phase-header">
        <span className="eyebrow">MISSION CONTROL · {s.mode === "prep" ? "01/03" : s.mode === "search" ? "02/03" : "03/03"}</span>
        <h1>{s.mode === "prep" ? "은닉 준비" : s.mode === "handoff" ? "역할 전환" : s.mode === "search" ? "수하물 수색" : "라운드 종료"}</h1>
        <p>{s.mode === "prep" ? "가방 속 가상 구획을 설계하고, 지정된 목표물을 배치하세요." : s.mode === "search" ? "구획을 직접 열어 제한시간 내 지정된 목표물을 찾으세요." : "이번 라운드의 결과를 확인하세요."}</p>
      </div>
      <section className="status-band">
        <div><span>{s.mode === "prep" ? "REMAINING BUDGET" : "INSPECTION TIMER"}</span>
          <strong className={s.mode === "search" && s.timeLeft < 30 ? "danger-text" : ""}>{s.mode === "prep" ? String(s.points).padStart(2, "0") + " P" : asClock(s.timeLeft)}</strong>
        </div><span className={"phase-dot " + (s.mode === "search" ? "pulse" : "")} />
      </section>
      <div className="hud-scroll">
        {s.mode === "prep" && <>
          <section className="panel-section">
            <div className="section-heading"><span className="count">01</span><h3>수송 대상 선택</h3></div>
            <div className="target-list">
              {(Object.keys(TARGETS) as TargetId[]).map((id) => (
                <button key={id} className={"target-option " + (s.targetId === id ? "active" : "")} onClick={() => s.chooseTarget(id)}>
                  <span className="target-indicator" style={{ backgroundColor: TARGETS[id].color }} />
                  <span><strong>{TARGETS[id].name}</strong><small>{TARGETS[id].category}</small></span>
                  <span className="radio-icon">{s.targetId === id ? "●" : "○"}</span>
                </button>
              ))}
            </div>
            <p className="microcopy">크기 {currentTarget.width.toFixed(2)} × {currentTarget.depth.toFixed(2)} 유닛 · {currentTarget.desc}</p>
          </section>
          <section className="panel-section">
            <div className="section-heading"><span className="count">02</span><h3>가방 구획 선택</h3></div>
            <div className="zone-picker">
              {BAG_ZONES.map((z) => (
                <button key={z.id} className={"zone-button " + (s.selectedZone === z.id ? "selected" : "") + (s.targetZone === z.id ? " planted" : "")} onClick={() => s.select(z.id)}>
                  <span>{z.label.slice(0, 2)}</span>
                  <small>{s.targetZone === z.id ? "물품 배치됨" : "ZIP " + s.extraZips[z.id]}</small>
                </button>
              ))}
            </div>
            <p className="microcopy">3D 가방의 수납칸을 클릭해도 선택됩니다.</p>
          </section>
          <section className="panel-section">
            <div className="section-heading"><span className="count">03</span><h3>구획 편집</h3></div>
            <div className="selected-zone"><span>현재 선택</span><strong>{zone?.label ?? "구획을 고르세요"}</strong>
              <small>추가 지퍼 {selectedZip}/2 · 적재 가능: {canPlace ? "YES" : "NO"}</small>
            </div>
            <div className="edit-actions">
              <button className="button dark" disabled={zipperCost(selectedZip) === null || s.points < (zipperCost(selectedZip) ?? Infinity)} onClick={s.addZip}>
                ＋ 지퍼 추가 <em>{zipperCost(selectedZip) === null ? "MAX" : zipperCost(selectedZip) + " P"}</em>
              </button>
              <button className="button accent" disabled={!canPlace} onClick={s.placeTarget}>◈ 물품 이곳에 배치</button>
            </div>
            <p className="microcopy">기본 덮개 1층 + 지퍼 최대 2층. 가상 수납칸의 크기 제한을 적용합니다.</p>
          </section>
        </>}
        {s.mode === "search" && <>
          <section className="panel-section">
            <div className="section-heading"><span className="count">01</span><h3>현재 검사 구획</h3></div>
            <div className="selected-zone"><span>{zone ? zone.label : "미선택"}</span>
              <strong>{!zone ? "가방의 칸을 선택" : revealed ? "모든 덮개 개방" : opened === 0 ? "외부 덮개 잠김" : "내부 지퍼 조사 중"}</strong>
              <small>{!zone ? "3D 가방을 클릭하세요." : "조사 완료 층 " + opened + (revealed ? " · 내부 확인 가능" : " · 계속 열어야 함")}</small>
            </div>
            <button className="button primary wide" disabled={!zone || revealed} onClick={s.inspect}>지퍼 / 덮개 열기 <em>−05초</em></button>
            {zone && revealed && <button className="button accent wide" onClick={s.collect}>◈ 이 구획의 물품 확인 / 증거 등록</button>}
          </section>
          <section className="panel-section">
            <div className="section-heading"><span className="count">02</span><h3>수색 장비</h3></div>
            <div className="tool-grid">
              <button onClick={s.toggleTorch} className={"tool-card " + (s.torchOn ? "on" : "")}><strong>⌁</strong><span>손전등</span><small>{s.torchOn ? "켜짐" : "OFF"}</small></button>
              <button onClick={s.scan} disabled={s.scanUsed} className="tool-card"><strong>▧</strong><span>스캔</span><small>{s.scanUsed ? "사용 완료" : "−12초"}</small></button>
              <button onClick={s.cut} disabled={s.cutterUses < 1 || !zone || revealed} className="tool-card"><strong>✂</strong><span>가상 절개</span><small>{s.cutterUses < 1 ? "사용 완료" : "−24초"}</small></button>
            </div>
            {s.scanHint && <div className="scan-result"><span>SCAN DETECTION</span><strong>구획 {s.scanHint.map((i) => BAG_ZONES[i].label.slice(0, 2)).join(" / ")}</strong><small>두 구획 중 하나에서 이상 신호 감지</small></div>}
          </section>
          <section className="panel-section">
            <div className="section-heading"><span className="count">03</span><h3>검사 진행</h3></div>
            <div className="progress-mini">{BAG_ZONES.map((z) => <div key={z.id} title={z.label + (isRevealed(s.opened[z.id], s.extraZips[z.id]) ? " 검사 완료" : " 미완료")} className={isRevealed(s.opened[z.id], s.extraZips[z.id]) ? "done" : ""} />)}</div>
            <p className="microcopy">초록색은 모든 덮개를 확인한 구획입니다. 정답은 공개되지 않습니다.</p>
          </section>
        </>}
        {(s.mode === "handoff" || s.mode === "result") && <section className="panel-section"><div className="section-heading"><span className="count">◈</span><h3>{s.mode === "result" ? "결과 기록" : "검사 대기"}</h3></div><p className="microcopy">모든 수색 도구와 목표물은 가상 게임 소품입니다.</p></section>}
      </div>
      <div className="hud-footer">
        <div className="toast"><span className="toast-dot" /><span>{s.statusText}</span></div>
        {s.mode === "prep" && <button className="button primary wide" onClick={s.prepareHandoff} disabled={s.targetZone === null}>준비 완료 · 수색팀에게 전달 →</button>}
        {s.mode === "search" && <button className="button outline wide" onClick={() => { if (window.confirm("가방을 통과시키면 밀반입팀이 승리합니다. 검사 종료할까요?")) s.pass(); }}>검사 종료 · 가방 통과시키기</button>}
        {s.mode === "result" && <button className="button primary wide" onClick={s.reset}>새 라운드 시작 ↻</button>}
        <div className="hud-bottom"><span>LOCAL HOTSEAT BUILD</span><span>© 2026 / PROTOTYPE</span></div>
      </div>
    </aside>
  );
}