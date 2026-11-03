import { Game, CountryData } from "@/lib/classes/Game";
import { NpcStrategy, personalityFor } from "@/lib/classes/NpcStrategy";
import { attackRound, endHumanTurn, placeReinforcements } from "@/lib/classes/HumanActions";
import type { GameDoc } from "@/lib/gameWriteRules";

const CODES = ["AAA", "BBB", "CCC", "DDD", "EEE", "FFF", "GGG", "HHH", "III", "JJJ"];

/** Ten countries, all with the same population (so the same starting soldiers). */
export function makeCountries(population: number | number[] = 200_000_000): CountryData[] {
  return CODES.map((code, i) => ({
    code,
    name: `Country ${code}`,
    population: Array.isArray(population) ? population[i] : population,
  }));
}

/** A dice source that returns the given values in turn (0..0.999 -> die 1..6). */
export function scriptedRng(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}
export const DIE = (face: number) => (face - 1) / 6 + 0.01; // value that makes a die show `face`

/** Predictable random numbers from a seed (mulberry32). */
export function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A game where the shuffle keeps the order A..J, the attacker (current player) always wins
 * every die, and every country starts with the soldiers for `population`.
 */
export function rigged(population: number | number[] = 200_000_000) {
  let mode: "shuffle" | "attackerWins" | "defenderWins" = "shuffle";
  let flip = false;
  const rng = () => {
    if (mode === "shuffle") return 0.99999; // Fisher-Yates with this keeps the order unchanged
    flip = !flip;
    if (mode === "attackerWins") return flip ? 0.99 : 0.0;
    return flip ? 0.0 : 0.99;
  };
  const cs = makeCountries(population);
  const game = Game.create("Me", cs[0], cs.slice(1), rng);
  return {
    game,
    attackerWins: () => { mode = "attackerWins"; flip = false; },
    defenderWins: () => { mode = "defenderWins"; flip = false; },
  };
}

/** The document that would be saved to Firestore for this game. */
export function toDoc(game: Game, ownerUid = "owner-uid"): GameDoc {
  const j = JSON.parse(JSON.stringify(game.toJSON()));
  return { ownerUid, ownerName: "Owner", humanPlayerId: "player-AAA", ...j, currentPlayerId: j.currentPlayerId } as GameDoc;
}

/**
 * Plays a whole game the way the app does (a simple bot plays the human, NPCs use their
 * personalities) and returns the document after EVERY step, like useGameSession's saves.
 */
export function simulateGame(seed: number, maxSteps = 600): { docs: GameDoc[]; game: Game } {
  // The NPC's win-chance estimate uses Math.random, so seed that too: same seed = same game.
  const realRandom = Math.random;
  Math.random = seededRng(seed + 1000);
  try {
    return playSimulation(seed, maxSteps);
  } finally {
    Math.random = realRandom;
  }
}

function playSimulation(seed: number, maxSteps: number): { docs: GameDoc[]; game: Game } {
  const rng = seededRng(seed);
  const cs = makeCountries([1_450e6, 1_000e6, 347e6, 284e6, 255e6, 237e6, 212e6, 175e6, 144e6, 130e6]);
  const game = Game.create("Me", cs[0], cs.slice(1), rng);
  const docs: GameDoc[] = [toDoc(game)];
  let steps = 0;
  while (game.status === "active" && steps < maxSteps) {
    steps++;
    if (game.currentPlayer.isNpc) {
      const npc = new NpcStrategy(personalityFor(game.allPlayers, game.currentPlayer.id));
      for (const _ of npc.playTurn(game)) docs.push(toDoc(game));
    } else {
      const me = game.currentPlayer.id;
      if (game.pendingReinforcements > 0) {
        const best = [...game.countriesOf(me)].sort((a, b) => b.soldiers - a.soldiers)[0];
        placeReinforcements(game, best.code, game.pendingReinforcements);
        docs.push(toDoc(game));
      }
      const attackers = game.countriesOf(me).filter((c) => c.soldiers >= 2).sort((a, b) => b.soldiers - a.soldiers);
      const targets = game.allCountries.filter((c) => c.ownerId !== me).sort((a, b) => a.soldiers - b.soldiers);
      if (attackers.length && targets.length && !game.attackUsed) {
        const a = attackers[0].code, d = targets[0].code;
        for (let k = 0; k < 30; k++) {
          attackRound(game, a, d);
          docs.push(toDoc(game));
          if (!game.battleInProgress || (game.status as string) === "finished") break;
        }
      }
      if (game.status === "active") { endHumanTurn(game); docs.push(toDoc(game)); }
    }
  }
  return { docs, game };
}

// ---------------------------------------------------------------------------
// A tiny in-memory "database" that enforces the same rules as firestore.rules,
// so the database operations (create / read / update / delete) can be tested
// quickly without the Firebase emulator.
// ---------------------------------------------------------------------------
import { canReadGame, validateCreate, validateUpdate } from "@/lib/gameWriteRules";

export class DeniedError extends Error {
  constructor(public reasons: string[]) { super("PERMISSION_DENIED: " + reasons.join("; ")); }
}

export class FakeGamesDb {
  private games = new Map<string, GameDoc>();
  create(uid: string | null, id: string, doc: GameDoc) {
    if (this.games.has(id)) throw new Error("already exists");
    const bad = validateCreate(uid, structuredClone(doc));
    if (bad.length) throw new DeniedError(bad);
    this.games.set(id, structuredClone(doc));
  }
  read(_uid: string | null, id: string): GameDoc | undefined {
    if (!canReadGame()) throw new DeniedError(["read denied"]);
    const g = this.games.get(id);
    return g ? structuredClone(g) : undefined;
  }
  update(uid: string | null, id: string, doc: GameDoc) {
    const old = this.games.get(id);
    if (!old) throw new Error("not found");
    const bad = validateUpdate(uid, old, structuredClone(doc));
    if (bad.length) throw new DeniedError(bad);
    this.games.set(id, structuredClone(doc));
  }
  delete(_uid: string | null, _id: string) {
    throw new DeniedError(["games cannot be deleted"]); // allow delete: if false
  }
  list(): string[] { return [...this.games.keys()]; }
}
