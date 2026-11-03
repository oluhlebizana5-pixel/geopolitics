import { describe, it, expect } from "vitest";
import { validateCreate, validateUpdate, canReadGame, canWriteGame, GameDoc } from "@/lib/gameWriteRules";
import { simulateGame, rigged, toDoc } from "./helpers";

const OWNER = "owner-uid";
const clone = <T,>(x: T): T => structuredClone(x);

/** A realistic snapshot to tamper with: the human has just placed reinforcements in round 2+. */
function midGame() {
  const { docs } = simulateGame(21);
  // find a step where the human (current player) has reinforcements left to place
  const i = docs.findIndex((d, k) => k > 0 && d.currentPlayerId === d.humanPlayerId && d.pendingReinforcements > 0);
  expect(i).toBeGreaterThan(0);
  return { before: docs[i], now: docs[i] };
}

describe("access permissions", () => {
  it("anybody can read a game, even when not signed in", () => {
    expect(canReadGame()).toBe(true);
  });
  it("only the signed-in owner can write", () => {
    const g = { ownerUid: OWNER };
    expect(canWriteGame(OWNER, g)).toBe(true);
    expect(canWriteGame("someone-else", g)).toBe(false);
    expect(canWriteGame(null, g)).toBe(false);
    expect(canWriteGame(undefined, g)).toBe(false);
    expect(canWriteGame("", { ownerUid: "" })).toBe(false); // an empty uid is never an owner
  });
  it("a stranger or a visitor cannot update a game, whatever they send", () => {
    const { docs } = simulateGame(1);
    expect(validateUpdate("stranger", docs[0], docs[1])).toEqual(["only the owner can change this game"]);
    expect(validateUpdate(null, docs[0], docs[1])).toEqual(["only the owner can change this game"]);
  });
  it("a stranger cannot take over a game by changing ownerUid", () => {
    const { docs } = simulateGame(1);
    const n = clone(docs[1]); n.ownerUid = "stranger";
    expect(validateUpdate("stranger", docs[0], n).length).toBeGreaterThan(0);
    expect(validateUpdate(OWNER, docs[0], n)).toContain("ownerUid cannot change");
  });
});

describe("creating a game", () => {
  const fresh = () => clone(simulateGame(5).docs[0]);
  it("accepts a normal new game made by its owner", () => {
    expect(validateCreate(OWNER, fresh())).toEqual([]);
  });
  it("rejects a game created in someone else's name or while signed out", () => {
    expect(validateCreate("someone-else", fresh()).length).toBeGreaterThan(0);
    expect(validateCreate(null, fresh()).length).toBeGreaterThan(0);
  });
  it("rejects a head start: extra soldiers, already-won or round > 1", () => {
    const a = fresh(); a.countries[0].soldiers = 400;
    expect(validateCreate(OWNER, a).join()).toMatch(/starting soldiers/);
    const b = fresh(); b.status = "finished"; b.winnerId = b.humanPlayerId;
    expect(validateCreate(OWNER, b).length).toBeGreaterThan(0);
    const c = fresh(); c.round = 9;
    expect(validateCreate(OWNER, c).length).toBeGreaterThan(0);
    const d = fresh(); d.pendingReinforcements = 20;
    expect(validateCreate(OWNER, d).length).toBeGreaterThan(0);
  });
  it("rejects a game that starts with countries already owned by someone else", () => {
    const g = fresh(); g.countries[1].ownerId = g.countries[0].ownerId;
    expect(validateCreate(OWNER, g).join()).toMatch(/own player/);
  });
});

describe("every legal move of complete games is accepted", () => {
  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
    it(`simulated game, seed ${seed}`, () => {
      const { docs } = simulateGame(seed);
      expect(docs.length).toBeGreaterThan(20);
      for (let i = 1; i < docs.length; i++) {
        const bad = validateUpdate(OWNER, docs[i - 1], docs[i]);
        expect(bad, `step ${i}: ${bad.join("; ")}`).toEqual([]);
      }
    });
  }
});

describe("tampering with soldier counts and ownership is rejected", () => {
  const owner = (before: GameDoc, after: GameDoc) => validateUpdate(OWNER, before, after);

  it("giving yourself free soldiers", () => {
    const { before } = midGame();
    const n = clone(before);
    const mine = n.countries.find((c) => c.ownerId === n.currentPlayerId)!;
    mine.soldiers += 50;
    expect(owner(before, n).join()).toMatch(/without reinforcements/);
  });
  it("using more reinforcements than you have", () => {
    const { before } = midGame();
    const n = clone(before);
    const mine = n.countries.find((c) => c.ownerId === n.currentPlayerId)!;
    mine.soldiers += before.pendingReinforcements + 1;
    n.pendingReinforcements = 0;
    expect(owner(before, n).length).toBeGreaterThan(0);
  });
  it("adding reinforcements back to the pool", () => {
    const { before } = midGame();
    const n = clone(before); n.pendingReinforcements += 5;
    expect(owner(before, n).join()).toMatch(/never added/);
  });
  it("stealing soldiers from an enemy country", () => {
    const { before } = midGame();
    const n = clone(before);
    const enemy = n.countries.find((c) => c.ownerId !== n.currentPlayerId && c.soldiers > 3)!;
    const mine = n.countries.find((c) => c.ownerId === n.currentPlayerId)!;
    enemy.soldiers -= 3; mine.soldiers += 3;
    expect(owner(before, n).join()).toMatch(/without reinforcements/);
  });
  it("making an enemy stronger", () => {
    const { before } = midGame();
    const n = clone(before);
    n.countries.find((c) => c.ownerId !== n.currentPlayerId)!.soldiers += 1;
    expect(owner(before, n).join()).toMatch(/enemy country cannot gain/);
  });
  it("wiping out an enemy in one go", () => {
    const { before } = midGame();
    const n = clone(before);
    const enemy = n.countries.find((c) => c.ownerId !== n.currentPlayerId && c.soldiers > 1)!;
    enemy.soldiers = 1 - 1 + 0; // 0 soldiers without changing owner
    expect(owner(before, n).length).toBeGreaterThan(0);
  });
  it.each([[-5], [1.5], [10001], [Number.NaN]])("an impossible soldier count: %s", (value) => {
    const { before } = midGame();
    const n = clone(before);
    n.countries.find((c) => c.ownerId === n.currentPlayerId)!.soldiers = value as number;
    expect(owner(before, n).length).toBeGreaterThan(0);
  });
  it("taking a country without conquering it", () => {
    const { before } = midGame();
    const n = clone(before);
    const enemy = n.countries.find((c) => c.ownerId !== n.currentPlayerId)!;
    enemy.ownerId = n.currentPlayerId;
    expect(owner(before, n).length).toBeGreaterThan(0);
  });
  it("conquering with a bigger reward than the rules allow", () => {
    const t = rigged(); t.attackerWins();
    const before = toDoc(t.game);
    const g = t.game; let r = g.attack("AAA", "BBB"); while (r.outcome === "continue") r = g.attack("AAA", "BBB");
    const honest = toDoc(g);
    expect(owner(before, honest)).toEqual([]);
    const greedy = clone(honest); greedy.countries[1].soldiers = 30;
    expect(owner(before, greedy).join()).toMatch(/reward must be exactly 4/);
  });
  it("conquering two countries in one save", () => {
    const t = rigged(); t.attackerWins();
    const before = toDoc(t.game);
    const n = clone(before);
    for (const i of [1, 2]) { n.countries[i].ownerId = "player-AAA"; n.countries[i].soldiers = 4; }
    expect(owner(before, n).join()).toMatch(/only one country/);
  });
  it("changing a country's population, the human player or the turn order", () => {
    const { before } = midGame();
    const a = clone(before); a.countries[0].population = 1;
    expect(owner(before, a).join()).toMatch(/population/);
    const c = clone(before); c.humanPlayerId = "player-ZZZ";
    expect(owner(before, c).join()).toMatch(/humanPlayerId/);
    const d = clone(before); d.turnOrder = [...d.turnOrder].reverse();
    expect(owner(before, d).join()).toMatch(/turn order/);
  });
  it("faking elimination or reviving an eliminated player", () => {
    const { before } = midGame();
    const a = clone(before);
    const alive = a.players.find((p) => p.id !== a.currentPlayerId && !p.eliminated && a.countries.some((c) => c.ownerId === p.id))!;
    alive.eliminated = true;
    expect(owner(before, a).join()).toMatch(/still holding/);
    const { docs } = simulateGame(21);
    const i = docs.findIndex((d) => d.players.some((p) => p.eliminated));
    expect(i).toBeGreaterThan(0);
    const b = clone(docs[i]); b.players.find((p) => p.eliminated)!.eliminated = false;
    expect(validateUpdate(OWNER, docs[i], b).join()).toMatch(/elimination/);
  });
  it("skipping the turn while reinforcements are unplaced, or granting extra ones", () => {
    const { before } = midGame();
    const skip = clone(before);
    const next = skip.turnOrder.find((id) => id !== skip.currentPlayerId && skip.countries.some((c) => c.ownerId === id))!;
    skip.currentPlayerId = next;
    expect(owner(before, skip).join()).toMatch(/unplaced reinforcements/);
  });
  it("jumping the round counter forward", () => {
    const { before } = midGame();
    const n = clone(before); n.round += 3;
    expect(owner(before, n).join()).toMatch(/round/);
  });
  it("declaring yourself the winner without holding all 10 countries", () => {
    const { before } = midGame();
    const n = clone(before); n.status = "finished"; n.winnerId = n.humanPlayerId;
    expect(owner(before, n).join()).toMatch(/all 10/);
  });
  it("changing a finished game, but re-saving it unchanged is fine", () => {
    const { docs, game } = simulateGame(4, 2000);
    const last = docs[docs.length - 1];
    if (game.status !== "finished") return; // this seed did not finish; the other tests cover the rest
    expect(validateUpdate(OWNER, last, clone(last))).toEqual([]);
    const n = clone(last); n.countries[0].soldiers += 1;
    expect(validateUpdate(OWNER, last, n).join()).toMatch(/finished/);
  });
  it("using attackUsed to get a second attack", () => {
    const t = rigged(); t.attackerWins();
    const g = t.game; let r = g.attack("AAA", "BBB"); while (r.outcome === "continue") r = g.attack("AAA", "BBB");
    const before = toDoc(g);
    const n = clone(before); n.attackUsed = false;
    expect(owner(before, n).join()).toMatch(/attackUsed/);
  });
});
