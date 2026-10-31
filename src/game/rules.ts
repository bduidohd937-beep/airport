export type Mode = "prep" | "handoff" | "search" | "result";
export type Team = "security" | "courier";
export type TargetId = "duck" | "core" | "drive" | "relic";
export type BagZone = {
  id: number;
  label: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  usableWidth: number;
  usableDepth: number;
};

export const BAG_ZONES: BagZone[] = [
  { id: 0, label: "A1 · 상부 파우치", x: -0.88, z: -0.55, width: 1.61, depth: 0.75, usableWidth: 1.32, usableDepth: 0.60 },
  { id: 1, label: "B1 · 상부 포켓", x: 0.88, z: -0.55, width: 1.61, depth: 0.75, usableWidth: 1.31, usableDepth: 0.63 },
  { id: 2, label: "A2 · 메쉬 수납칸", x: -0.88, z: 0.28, width: 1.61, depth: 0.75, usableWidth: 1.12, usableDepth: 0.46 },
  { id: 3, label: "B2 · 메인 수납칸", x: 0.88, z: 0.28, width: 1.61, depth: 0.75, usableWidth: 1.35, usableDepth: 0.64 },
  { id: 4, label: "A3 · 전면 포켓", x: -0.88, z: 1.11, width: 1.61, depth: 0.75, usableWidth: 1.24, usableDepth: 0.54 },
  { id: 5, label: "B3 · 하단 수납칸", x: 0.88, z: 1.11, width: 1.61, depth: 0.75, usableWidth: 1.40, usableDepth: 0.61 },
];

export const TARGETS: Record<TargetId, { name: string; category: string; width: number; depth: number; color: string; desc: string }> = {
  duck: { name: "황금 오리", category: "CLASSIFIED TOY", width: 0.52, depth: 0.36, color: "#f5b943", desc: "빛나는 금색 오리. 작은 소품이지만 자세히 보면 수상하다." },
  core: { name: "에너지 코어", category: "ALIEN TECH", width: 0.47, depth: 0.47, color: "#4ef2d1", desc: "민트색으로 발광하는 가상의 장치." },
  drive: { name: "기밀 데이터봉", category: "TOP SECRET", width: 0.90, depth: 0.29, color: "#d899fc", desc: "길쭉한 데이터 캡슐. 폭이 좁은 칸에는 들어가지 않는다." },
  relic: { name: "고대 유물", category: "LOST ARTIFACT", width: 0.82, depth: 0.57, color: "#f09c72", desc: "크고 무거운 가상 유물. 작은 수납칸에는 배치 불가." },
};

export function fitsTarget(target: TargetId, zoneId: number): boolean {
  const zone = BAG_ZONES.find((item) => item.id === zoneId);
  if (!zone) return false;
  const item = TARGETS[target];
  const margin = 0.025;
  return (
    (item.width + margin <= zone.usableWidth && item.depth + margin <= zone.usableDepth) ||
    (item.depth + margin <= zone.usableWidth && item.width + margin <= zone.usableDepth)
  );
}

export function zipperCost(depth: number): number | null {
  if (depth === 0) return 1;
  if (depth === 1) return 2;
  return null;
}

export function isRevealed(opened: number, extraZippers: number): boolean {
  return opened >= extraZippers + 1;
}

export function asClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  return String(Math.floor(safe / 60)).padStart(2, "0") + ":" + String(safe % 60).padStart(2, "0");
}