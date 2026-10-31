import { describe, expect, it } from "vitest";
import { BAG_ZONES, fitsTarget, isRevealed, zipperCost, asClock } from "./rules";

describe("가방 공간 규칙", () => {
  it("모든 구획은 고유 위치를 가진다", () => {
    expect(BAG_ZONES).toHaveLength(6);
    expect(new Set(BAG_ZONES.map((z) => z.id)).size).toBe(6);
  });
  it("큰 유물은 작은 메쉬 수납칸에 들어가지 않는다", () => {
    expect(fitsTarget("relic", 2)).toBe(false);
    expect(fitsTarget("relic", 3)).toBe(true);
  });
  it("공간이 없는 구획은 거절한다", () => {
    expect(fitsTarget("duck", 99)).toBe(false);
  });
  it("지퍼의 중첩은 2단계까지 비용이 증가한다", () => {
    expect(zipperCost(0)).toBe(1);
    expect(zipperCost(1)).toBe(2);
    expect(zipperCost(2)).toBe(null);
  });
  it("마지막 덮개까지 열어야 목표물이 노출된다", () => {
    expect(isRevealed(1, 1)).toBe(false);
    expect(isRevealed(2, 1)).toBe(true);
  });
  it("시간 표시는 0 이하로 내려가지 않는다", () => {
    expect(asClock(125)).toBe("02:05");
    expect(asClock(-8)).toBe("00:00");
  });
});