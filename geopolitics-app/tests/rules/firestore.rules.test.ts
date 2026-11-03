// Tests the REAL firestore.rules file against the Firebase emulator.
// Run with:  npm run test:rules   (needs Java; the command starts and stops the emulator for you)
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  assertFails, assertSucceeds, initializeTestEnvironment, RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs } from "firebase/firestore";
import { simulateGame } from "../helpers";

let env: RulesTestEnvironment;
const OWNER = "owner-uid";
const STRANGER = "stranger-uid";

const owner = () => env.authenticatedContext(OWNER).firestore();
const stranger = () => env.authenticatedContext(STRANGER).firestore();
const visitor = () => env.unauthenticatedContext().firestore();
const clone = <T,>(x: T): T => structuredClone(x);

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-geopolitics",
    firestore: { rules: readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 },
  });
});
afterAll(async () => { await env?.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); });

/** Put a game straight into the database (bypassing the rules) so we can test updates. */
async function seed(id: string, data: object) {
  await env.withSecurityRulesDisabled(async (ctx) => { await setDoc(doc(ctx.firestore(), "games", id), data); });
}

describe("reading", () => {
  it("visitors, strangers and the owner can all read a game and its log", async () => {
    const { docs } = simulateGame(1);
    await seed("g1", docs[0]);
    await env.withSecurityRulesDisabled(async (ctx) => {
      await addDoc(collection(ctx.firestore(), "games/g1/log"), { type: "end_turn", playerId: "p", playerName: "P", message: "hello" });
    });
    for (const db of [visitor(), stranger(), owner()]) {
      await assertSucceeds(getDoc(doc(db, "games", "g1")));
      await assertSucceeds(getDocs(collection(db, "games/g1/log")));
    }
  });
  it("other collections are closed", async () => {
    await assertFails(getDoc(doc(visitor(), "secrets", "x")));
    await assertFails(setDoc(doc(owner(), "secrets", "x"), { a: 1 }));
  });
});

describe("creating", () => {
  it("a signed-in user can create their own game", async () => {
    await assertSucceeds(setDoc(doc(owner(), "games", "g1"), simulateGame(1).docs[0]));
  });
  it("visitors cannot create, and nobody can create a game in someone else's name", async () => {
    const d = simulateGame(1).docs[0];
    await assertFails(setDoc(doc(visitor(), "games", "g1"), d));
    await assertFails(setDoc(doc(stranger(), "games", "g1"), d)); // ownerUid is OWNER
  });
  it("rejects a head start", async () => {
    const d = clone(simulateGame(1).docs[0]); d.countries[0].soldiers = 400;
    await assertFails(setDoc(doc(owner(), "games", "g1"), d));
  });
});

describe("updating", () => {
  it("strangers and visitors cannot change a game", async () => {
    const { docs } = simulateGame(2);
    await seed("g1", docs[0]);
    await assertFails(setDoc(doc(stranger(), "games", "g1"), docs[1]));
    await assertFails(setDoc(doc(visitor(), "games", "g1"), docs[1]));
    await assertFails(updateDoc(doc(stranger(), "games", "g1"), { round: 5 }));
  });
  it("nobody can delete a game, not even the owner", async () => {
    await seed("g1", simulateGame(2).docs[0]);
    await assertFails(deleteDoc(doc(owner(), "games", "g1")));
    await assertFails(deleteDoc(doc(stranger(), "games", "g1")));
  });

  // The big one: every save of 5 complete games, exactly as the app would write them.
  for (const seedNo of [1, 2, 3, 4, 5]) {
    it(`accepts every legal save of a complete game (seed ${seedNo})`, async () => {
      const { docs } = simulateGame(seedNo);
      await seed("g1", docs[0]);
      for (let i = 1; i < docs.length; i++) {
        await assertSucceeds(setDoc(doc(owner(), "games", "g1"), docs[i]));
      }
    });
  }

  describe("forged saves are refused", () => {
    async function midGame() {
      const { docs } = simulateGame(21);
      const i = docs.findIndex((d, k) => k > 0 && d.currentPlayerId === d.humanPlayerId && d.pendingReinforcements > 0);
      await seed("g1", docs[i]);
      return clone(docs[i]);
    }
    const save = (d: object) => setDoc(doc(owner(), "games", "g1"), d);

    it("free soldiers", async () => {
      const d = await midGame();
      d.countries.find((c) => c.ownerId === d.currentPlayerId)!.soldiers += 50;
      await assertFails(save(d));
    });
    it("more reinforcements than allowed", async () => {
      const d = await midGame();
      d.countries.find((c) => c.ownerId === d.currentPlayerId)!.soldiers += d.pendingReinforcements + 1;
      d.pendingReinforcements = 0;
      await assertFails(save(d));
    });
    it("stealing soldiers from an enemy", async () => {
      const d = await midGame();
      const enemy = d.countries.find((c) => c.ownerId !== d.currentPlayerId && c.soldiers > 3)!;
      enemy.soldiers -= 3;
      d.countries.find((c) => c.ownerId === d.currentPlayerId)!.soldiers += 3;
      await assertFails(save(d));
    });
    it("taking a country without a conquest", async () => {
      const d = await midGame();
      d.countries.find((c) => c.ownerId !== d.currentPlayerId)!.ownerId = d.currentPlayerId;
      await assertFails(save(d));
    });
    it("declaring yourself the winner", async () => {
      const d = await midGame();
      d.status = "finished"; d.winnerId = d.humanPlayerId;
      await assertFails(save(d));
    });
    it("changing the owner of the game", async () => {
      const d = await midGame(); d.ownerUid = STRANGER;
      await assertFails(save(d));
    });
    it("jumping the round counter", async () => {
      const d = await midGame(); d.round += 5;
      await assertFails(save(d));
    });
    it("impossible soldier counts", async () => {
      for (const bad of [-1, 1.5, 100000]) {
        const d = await midGame();
        d.countries.find((c) => c.ownerId === d.currentPlayerId)!.soldiers = bad;
        await assertFails(save(d));
      }
    });
  });
});

describe("the game log", () => {
  const entry = { type: "reinforce", playerId: "player-AAA", playerName: "Me", message: "Placed 2 soldiers." };
  beforeEach(async () => { await seed("g1", simulateGame(1).docs[0]); });

  it("only the game's owner can add entries", async () => {
    await assertSucceeds(addDoc(collection(owner(), "games/g1/log"), entry));
    await assertFails(addDoc(collection(stranger(), "games/g1/log"), entry));
    await assertFails(addDoc(collection(visitor(), "games/g1/log"), entry));
  });
  it("rejects a malformed entry", async () => {
    await assertFails(addDoc(collection(owner(), "games/g1/log"), { type: "x" }));
  });
  it("the owner can attach AI commentary, but cannot rewrite history", async () => {
    const ref = await addDoc(collection(owner(), "games/g1/log"), entry);
    await assertSucceeds(updateDoc(ref, { commentary: "A bold move!", commentarySource: "ai" }));
    await assertFails(updateDoc(ref, { message: "I never did that." }));
    await assertFails(deleteDoc(ref));
  });
  it("a stranger cannot attach commentary", async () => {
    const ref = await addDoc(collection(owner(), "games/g1/log"), entry);
    await assertFails(updateDoc(doc(stranger(), ref.path), { commentary: "spam" }));
  });
});
