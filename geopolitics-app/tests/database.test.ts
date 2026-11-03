import { describe, it, expect } from "vitest";
import { Game } from "@/lib/classes/Game";
import { recordFromData, outcomeOf, computeStats, computePlatformStats, leaderboard, GameRecord } from "@/lib/stats";
import { DeniedError, FakeGamesDb, simulateGame, toDoc, rigged } from "./helpers";

const OWNER = "owner-uid";

describe("database operations on a game", () => {
  it("create -> read -> update -> read keeps the data", () => {
    const db = new FakeGamesDb();
    const { docs } = simulateGame(9);
    db.create(OWNER, "g1", docs[0]);
    expect(db.read(null, "g1")?.round).toBe(1);
    db.update(OWNER, "g1", docs[1]);
    expect(db.read(null, "g1")).toEqual(docs[1]);
  });
  it("visitors (not signed in) and other users can read", () => {
    const db = new FakeGamesDb();
    db.create(OWNER, "g1", simulateGame(9).docs[0]);
    expect(db.read(null, "g1")).toBeDefined();
    expect(db.read("somebody-else", "g1")).toBeDefined();
  });
  it("reading a game that does not exist gives nothing", () => {
    expect(new FakeGamesDb().read(null, "nope")).toBeUndefined();
  });
  it("only the owner can update; strangers and visitors are denied and nothing changes", () => {
    const db = new FakeGamesDb();
    const { docs } = simulateGame(9);
    db.create(OWNER, "g1", docs[0]);
    expect(() => db.update("stranger", "g1", docs[1])).toThrow(DeniedError);
    expect(() => db.update(null, "g1", docs[1])).toThrow(DeniedError);
    expect(db.read(null, "g1")).toEqual(docs[0]);
  });
  it("nobody can delete a game", () => {
    const db = new FakeGamesDb();
    db.create(OWNER, "g1", simulateGame(9).docs[0]);
    expect(() => db.delete(OWNER, "g1")).toThrow(DeniedError);
    expect(() => db.delete(null, "g1")).toThrow(DeniedError);
    expect(db.list()).toEqual(["g1"]);
  });
  it("a forged write is refused and leaves the stored game untouched", () => {
    const db = new FakeGamesDb();
    const { docs } = simulateGame(9);
    db.create(OWNER, "g1", docs[0]);
    const forged = structuredClone(docs[0]); forged.countries[0].soldiers = 400;
    expect(() => db.update(OWNER, "g1", forged)).toThrow(/PERMISSION_DENIED/);
    expect(db.read(null, "g1")).toEqual(docs[0]);
  });
  it("a full game can be saved step by step and ends with the same result as the engine", () => {
    const db = new FakeGamesDb();
    const { docs, game } = simulateGame(12);
    db.create(OWNER, "g1", docs[0]);
    for (const d of docs.slice(1)) db.update(OWNER, "g1", d);
    const stored = db.read(null, "g1")!;
    expect(stored.round).toBe(game.round);
    expect(stored.status).toBe(game.status);
  });
});

describe("serialising a game (what is stored in the database)", () => {
  it("survives a JSON round trip at every step of a whole game", () => {
    const { docs } = simulateGame(6);
    for (const d of docs) {
      const copy = Game.fromJSON(JSON.parse(JSON.stringify(d)));
      expect(JSON.stringify(copy.toJSON())).toBe(JSON.stringify(JSON.parse(JSON.stringify({
        status: d.status, round: d.round, currentPlayerId: d.currentPlayerId, turnOrder: d.turnOrder,
        winnerId: d.winnerId, pendingReinforcements: d.pendingReinforcements, attackUsed: d.attackUsed,
        battle: d.battle, players: d.players, countries: d.countries,
      }))));
    }
  });
  it("stores only plain values (no undefined, no functions), as Firestore requires", () => {
    const json = JSON.stringify(toDoc(rigged().game));
    expect(json).not.toMatch(/undefined|function/);
  });
});

describe("game records for the statistics page", () => {
  const doc = (over: Record<string, unknown> = {}) => ({
    ownerUid: "u1", ownerName: "Sam", status: "active", round: 3, humanPlayerId: "player-AAA", winnerId: null,
    players: [{ id: "player-AAA", eliminated: false }], countries: [{ ownerId: "player-AAA" }, { ownerId: "player-BBB" }],
    updatedAt: { toMillis: () => 1234 }, ...over,
  });

  it("turns a stored document into a record", () => {
    expect(recordFromData("g1", doc())).toMatchObject({ id: "g1", ownerName: "Sam", round: 3, countriesHeld: 1, updatedAtMs: 1234 });
  });
  it("copes with missing or damaged fields", () => {
    const r = recordFromData("g2", { status: "weird" });
    expect(r).toMatchObject({ status: "active", round: 1, ownerName: "Player", countriesHeld: 0 });
  });
  it("works out won / lost / playing", () => {
    expect(outcomeOf(recordFromData("a", doc({ status: "finished", winnerId: "player-AAA" })))).toBe("won");
    expect(outcomeOf(recordFromData("b", doc({ status: "finished", winnerId: "player-BBB" })))).toBe("lost");
    expect(outcomeOf(recordFromData("c", doc({ players: [{ id: "player-AAA", eliminated: true }] })))).toBe("lost");
    expect(outcomeOf(recordFromData("d", doc()))).toBe("playing");
  });
  it("computes totals, win rate and the leaderboard", () => {
    const mk = (id: string, uid: string, status: "won" | "lost" | "playing", round: number): GameRecord => ({
      id, ownerUid: uid, ownerName: uid, status: status === "playing" ? "active" : "finished", round,
      humanPlayerId: "h", winnerId: status === "won" ? "h" : status === "lost" ? "x" : null, humanEliminated: false,
      countriesHeld: round, updatedAtMs: 0,
    });
    const recs = [mk("1", "ann", "won", 8), mk("2", "ann", "won", 12), mk("3", "bob", "lost", 5), mk("4", "bob", "playing", 2)];
    const s = computeStats(recs);
    expect(s).toMatchObject({ total: 4, won: 2, lost: 1, playing: 1, fastestWinRound: 8, mostCountriesHeld: 12 });
    expect(s.winRate).toBeCloseTo(2 / 3);
    expect(s.avgRoundsOfWins).toBe(10);
    expect(leaderboard(recs)).toEqual([{ name: "ann", wins: 2, games: 2 }]);
    expect(computePlatformStats(recs)).toMatchObject({ sampleSize: 4, players: 2 });
    expect(computeStats([]).winRate).toBeNull();
  });
});
