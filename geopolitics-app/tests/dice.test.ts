import { describe, it, expect } from "vitest";
import { BattleEngine } from "@/lib/classes/BattleEngine";
import { DIE, scriptedRng } from "./helpers";

describe("dice calculations", () => {
  it("uses min(attacker - 1, defender) dice", () => {
    expect(BattleEngine.diceCount(2, 5)).toBe(1);
    expect(BattleEngine.diceCount(5, 2)).toBe(2);
    expect(BattleEngine.diceCount(4, 4)).toBe(3);
    expect(BattleEngine.diceCount(9, 9)).toBe(8);
    expect(BattleEngine.diceCount(1, 5)).toBe(0);
  });

  it("an attacker needs at least 2 soldiers", () => {
    expect(BattleEngine.canAttack(1)).toBe(false);
    expect(BattleEngine.canAttack(2)).toBe(true);
  });

  it("every die shows 1 to 6 (edge values of the random source)", () => {
    for (const [value, face] of [[0, 1], [0.1666, 1], [0.1667, 2], [0.5, 4], [0.9999, 6]] as const) {
      const engine = new BattleEngine(scriptedRng([value, 0.0]));
      expect(engine.resolveRound(2, 1).pairs[0].attackerRoll).toBe(face);
    }
  });

  it("the higher die wins and the loser loses one soldier", () => {
    const engine = new BattleEngine(scriptedRng([DIE(6), DIE(1)])); // attacker 6 vs defender 1
    const r = engine.resolveRound(5, 5);
    expect(r.pairs[0]).toEqual({ attackerRoll: 6, defenderRoll: 1, winner: "attacker" });
    expect(r.defenderLosses).toBeGreaterThan(0);
    expect(r.attackerLosses).toBe(0);
  });

  it("the defender wins when the defender die is higher", () => {
    const engine = new BattleEngine(scriptedRng([DIE(2), DIE(5)]));
    const r = engine.resolveRound(2, 3);
    expect(r.pairs[0].winner).toBe("defender");
    expect(r).toMatchObject({ attackerLosses: 1, defenderLosses: 0 });
  });

  it("a tie costs nobody a soldier", () => {
    const engine = new BattleEngine(scriptedRng([DIE(4), DIE(4)]));
    const r = engine.resolveRound(3, 3);
    expect(r.pairs.every((p) => p.winner === "tie")).toBe(true);
    expect(r.attackerLosses + r.defenderLosses).toBe(0);
  });

  it("total losses never exceed the number of dice pairs", () => {
    const engine = new BattleEngine();
    for (let i = 0; i < 500; i++) {
      const a = 2 + (i % 8), d = 1 + (i % 9);
      const r = engine.resolveRound(a, d);
      expect(r.attackerLosses + r.defenderLosses).toBeLessThanOrEqual(r.diceCount);
      expect(r.pairs).toHaveLength(r.diceCount);
    }
  });

  it("rejects impossible battles", () => {
    const engine = new BattleEngine();
    expect(() => engine.resolveRound(1, 3)).toThrow(/at least 2/);
    expect(() => engine.resolveRound(5, 0)).toThrow(/no soldiers/);
  });

  it("is fair: over many rolls each side wins about the same (within a wide margin)", () => {
    const engine = new BattleEngine();
    let a = 0, d = 0;
    for (let i = 0; i < 4000; i++) {
      const p = engine.resolveRound(2, 1).pairs[0];
      if (p.winner === "attacker") a++;
      if (p.winner === "defender") d++;
    }
    // One die each: both sides win 15/36 of the time, the rest are ties
    expect(Math.abs(a - d)).toBeLessThan(400);
  });
});
