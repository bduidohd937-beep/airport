import { create } from "zustand";
import { BAG_ZONES, fitsTarget, isRevealed, TARGETS, zipperCost, type Mode, type TargetId, type Team } from "./rules";

type Inspection = Record<number, number>;

interface GameState {
  mode: Mode;
  selectedZone: number;
  targetId: TargetId;
  targetZone: number | null;
  points: number;
  extraZips: Inspection;
  opened: Inspection;
  timeLeft: number;
  torchOn: boolean;
  scanUsed: boolean;
  scanHint: number[] | null;
  cutterUses: number;
  result: Team | null;
  statusText: string;
  select: (id: number) => void;
  chooseTarget: (id: TargetId) => void;
  addZip: () => void;
  placeTarget: () => void;
  prepareHandoff: () => void;
  startSearch: () => void;
  inspect: () => void;
  toggleTorch: () => void;
  scan: () => void;
  cut: () => void;
  collect: () => void;
  pass: () => void;
  tick: () => void;
  reset: () => void;
}

const empty: Inspection = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
const initial = () => ({
  mode: "prep" as Mode,
  selectedZone: 0,
  targetId: "duck" as TargetId,
  targetZone: null as number | null,
  points: 7,
  extraZips: { ...empty },
  opened: { ...empty },
  timeLeft: 120,
  torchOn: false,
  scanUsed: false,
  scanHint: null as number[] | null,
  cutterUses: 1,
  result: null as Team | null,
  statusText: "수납 구획을 고르고 목표 물품을 배치하세요.",
});

function elapsedOrResult(state: GameState, cost: number): number {
  return Math.max(0, state.timeLeft - cost);
}

export const useGame = create<GameState>((set, get) => ({
  ...initial(),
  select: (id) => {
    if (!BAG_ZONES.some((z) => z.id === id)) return;
    set({ selectedZone: id, statusText: get().mode === "search" ? "구획을 조사할 도구를 선택하세요." : "선택한 구획을 편집할 수 있습니다." });
  },
  chooseTarget: (id) => {
    if (get().mode !== "prep" || !TARGETS[id]) return;
    set({ targetId: id, targetZone: null, statusText: "선택한 물품을 수납할 구획을 고르세요." });
  },
  addZip: () => {
    const state = get();
    if (state.mode !== "prep") return;
    const current = state.extraZips[state.selectedZone] ?? 0;
    const cost = zipperCost(current);
    if (cost === null || state.points < cost) {
      set({ statusText: "포인트가 부족하거나 최대 중첩 단계입니다." });
      return;
    }
    set({
      extraZips: { ...state.extraZips, [state.selectedZone]: current + 1 },
      points: state.points - cost,
      statusText: "가상 수납 구획에 지퍼를 추가했습니다.",
    });
  },
  placeTarget: () => {
    const state = get();
    if (state.mode !== "prep") return;
    if (!fitsTarget(state.targetId, state.selectedZone)) {
      set({ statusText: "물품이 수납 공간보다 큽니다. 다른 구획을 선택하세요." });
      return;
    }
    set({ targetZone: state.selectedZone, statusText: "목표 물품을 배치했습니다. 필요하면 지퍼를 추가하세요." });
  },
  prepareHandoff: () => {
    if (get().mode !== "prep") return;
    if (get().targetZone === null) {
      set({ statusText: "먼저 목표 물품을 가방 안에 배치해야 합니다." });
      return;
    }
    set({ mode: "handoff", selectedZone: -1, statusText: "수색 담당자에게 화면을 넘겨주세요." });
  },
  startSearch: () => {
    if (get().mode !== "handoff") return;
    set({ mode: "search", timeLeft: 120, opened: { ...empty }, scanUsed: false, scanHint: null, cutterUses: 1, selectedZone: -1, statusText: "구획을 선택한 뒤 직접 열어 보세요." });
  },
  inspect: () => {
    const state = get();
    if (state.mode !== "search" || state.selectedZone < 0) return;
    const id = state.selectedZone;
    if (isRevealed(state.opened[id] ?? 0, state.extraZips[id] ?? 0)) {
      set({ statusText: "이미 모든 수납층을 열었습니다." });
      return;
    }
    const next = elapsedOrResult(state, 5);
    const newOpened = { ...state.opened, [id]: (state.opened[id] ?? 0) + 1 };
    if (next === 0) {
      set({ opened: newOpened, timeLeft: 0, mode: "result", result: "courier", statusText: "시간 초과! 목표 물품을 통과시켰습니다." });
    } else {
      set({ opened: newOpened, timeLeft: next, statusText: isRevealed(newOpened[id], state.extraZips[id] ?? 0) ? "마지막 덮개를 열었습니다. 물품을 확인하세요." : "지퍼를 열었습니다. 한 층 더 남아 있습니다." });
    }
  },
  toggleTorch: () => {
    if (get().mode !== "search") return;
    set((s) => ({ torchOn: !s.torchOn, statusText: s.torchOn ? "손전등을 껐습니다." : "손전등을 켰습니다. 선택 구획이 밝아집니다." }));
  },
  scan: () => {
    const state = get();
    if (state.mode !== "search" || state.scanUsed || state.targetZone === null) return;
    const newTime = elapsedOrResult(state, 12);
    if (!newTime) {
      set({ timeLeft: 0, mode: "result", result: "courier", statusText: "스캔 도중 검사 시간이 종료되었습니다." });
      return;
    }
    const hint = [state.targetZone, (state.targetZone + 3) % BAG_ZONES.length].sort((a, b) => a - b);
    set({ timeLeft: newTime, scanUsed: true, scanHint: hint, statusText: "스캔 신호: 두 구획 중 하나에서 이상 반응이 감지됐습니다." });
  },
  cut: () => {
    const state = get();
    if (state.mode !== "search" || state.selectedZone < 0 || state.cutterUses < 1) return;
    const time = elapsedOrResult(state, 24);
    if (!time) {
      set({ timeLeft: 0, mode: "result", result: "courier", statusText: "절개 작업 중 시간이 종료되었습니다." });
      return;
    }
    set({
      cutterUses: state.cutterUses - 1,
      opened: { ...state.opened, [state.selectedZone]: (state.extraZips[state.selectedZone] ?? 0) + 1 },
      timeLeft: time,
      statusText: "가상 절개 도구로 선택 구획을 한 번에 열었습니다.",
    });
  },
  collect: () => {
    const state = get();
    if (state.mode !== "search" || state.selectedZone < 0) return;
    if (state.selectedZone === state.targetZone && isRevealed(state.opened[state.selectedZone] ?? 0, state.extraZips[state.selectedZone] ?? 0)) {
      set({ mode: "result", result: "security", statusText: "RED ALERT! 지정 물품을 적발했습니다." });
    } else {
      const newTime = elapsedOrResult(state, 10);
      if (!newTime) {
        set({ timeLeft: 0, mode: "result", result: "courier", statusText: "잘못된 적발로 시간이 종료되었습니다." });
      } else {
        set({ timeLeft: newTime, statusText: "지정 물품이 아닙니다. 오적발로 10초가 차감됐습니다." });
      }
    }
  },
  pass: () => {
    if (get().mode === "search") set({ mode: "result", result: "courier", statusText: "검사를 종료했습니다. 숨겨진 목표물이 통과했습니다." });
  },
  tick: () => {
    const state = get();
    if (state.mode !== "search") return;
    if (state.timeLeft <= 1) {
      set({ timeLeft: 0, mode: "result", result: "courier", statusText: "시간 초과! 밀반입팀이 승리했습니다." });
    } else {
      set({ timeLeft: state.timeLeft - 1 });
    }
  },
  reset: () => set(initial()),
}));