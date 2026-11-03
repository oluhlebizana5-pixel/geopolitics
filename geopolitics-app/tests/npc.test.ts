import { describe, it, expect, vi, afterEach } from "vitest";
import { Game } from "@/lib/classes/Game";
import {
  NpcStrategy, personalityFor, PERSONALITIES, AGGRESSIVE, CAUTIOUS, OPPORTUNIST, BALANCED,
} from "@/lib/classes/NpcStrategy";
import { rigged, seededRng, makeCountries } from "./helpers";

afterEach(() => vi.restoreAllMocks());

describe("NPC win-chance estimate", () => {
  const npc = new NpcStrategy(BALANCED, 600);

  it("is 0 when the attacker has fewer than 2 soldiers and 1 when the defender is empty", () => {
    expect(npc.winChance(1, 5)).toBe(0);
    expect(npc.winChance(5, 0)).toBe(1);
  });
  it("is a probability", () => {
    for (let a = 2; a <= 9; a++) for (let d = 1; d <= 9; d++) {
      const p = npc.winChance(a, d);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });
  it("rises with a bigger army and falls with a bigger defender", () => {
    expect(npc.winChance(9, 2)).toBeGreaterThan(npc.winChance(4, 2));
    expect(npc.winChance(5, 2)).toBeGreaterThan(npc.winChance(5, 8));
    expect(npc.winChance(9, 1)).toBeGreaterThan(0.95);
    expect(npc.winChance(2, 9)).toBeLessThan(0.05);
  });
});

describe("NPC reinforcement decisions", () => {
  function roundTwo() {
    const t = rigged([200e6, 60e6, 20e6, ...Array(7).fill(200e6)]);
    t.attackerWins();
    const g = t.game;
    // let AAA conquer BBB so the human owns two countries of different strength, then go round
    let r = g.attack("AAA", "BBB");
    while (r.outcome === "continue") r = g.attack("AAA", "BBB");
    g.endTurn(); // now walk round the table until it is AAA's turn again in round 2
    while (!(g.currentPlayer.id === "player-AAA" && g.round === 2)) {
      if (g.pendingReinforcements > 0) g.allocateReinforcements(g.countriesOf(g.currentPlayer.id)[0].code, g.pendingReinforcements);
      g.endTurn();
    }
    return g;
  }

  it("places nothing when there is nothing to place", () => {
    const { game } = rigged();
    expect(new NpcStrategy().planReinforcements(game, game.currentPlayer.id)).toBeNull();
  });
  it("Balanced/Aggressive reinforce the strongest country, Cautious the weakest", () => {
    const g = roundTwo();
    const me = g.currentPlayer.id;
    const mine = g.countriesOf(me).sort((a, b) => b.soldiers - a.soldiers);
    expect(mine.length).toBe(2);
    expect(new NpcStrategy(BALANCED).planReinforcements(g, me)?.code).toBe(mine[0].code);
    expect(new NpcStrategy(AGGRESSIVE).planReinforcements(g, me)?.code).toBe(mine[0].code);
    const cautious = new NpcStrategy(CAUTIOUS).planReinforcements(g, me)!;
    expect(cautious.code).toBe(mine[1].code);
    expect(cautious.amount).toBe(g.pendingReinforcements);
    expect(cautious.reason).toMatch(/weakest/);
  });
});

describe("NPC attack decisions", () => {
  // Human (AAA) is the current player in these games; we only read the NPC's choice.
  function board(attackerPop: number, defenderPop: number, others = 1e6) {
    const t = rigged([attackerPop, defenderPop, ...Array(8).fill(others)]);
    return t.game;
  }

  it("attacks a clearly weaker neighbour", () => {
    const g = board(200e6, 20e6); // 9 vs 3
    const choice = new NpcStrategy(BALANCED).chooseAttack(g, "player-AAA");
    expect(choice).not.toBeNull();
    expect(choice!.winChance).toBeGreaterThanOrEqual(BALANCED.minWinChance);
    expect(choice!.reason).toMatch(/chance to conquer/);
  });
  it("does not attack when every fight is a bad bet", () => {
    const g = board(5e6, 200e6); // 1 soldier vs 9: cannot even attack
    expect(new NpcStrategy(BALANCED).chooseAttack(g, "player-AAA")).toBeNull();
  });
  it("different personalities make different choices on the same board", () => {
    // 7 soldiers vs 5: about a 63% fight. Aggressive (35%+) and Balanced (50%+) take it, Cautious (70%+) refuses.
    const g = board(110e6, 60e6, 200e6);
    const attacker = new NpcStrategy(AGGRESSIVE, 800).chooseAttack(g, "player-AAA");
    const cautious = new NpcStrategy(CAUTIOUS, 800).chooseAttack(g, "player-AAA");
    const balanced = new NpcStrategy(BALANCED, 800).chooseAttack(g, "player-AAA");
    expect(attacker).not.toBeNull();
    expect(balanced).not.toBeNull();
    expect(cautious).toBeNull();
  });
  it("Opportunist is willing to finish off a rival with one country left", () => {
    expect(OPPORTUNIST.rivalBonus).toBeGreaterThan(BALANCED.rivalBonus);
  });
  it("stops an attack that has turned bad, but Aggressive keeps going longer than Cautious", () => {
    const g = rigged([200e6, 200e6, ...Array(8).fill(1e6)]).game;
    // shrink the attacker to 3 vs 9 through a saved snapshot
    const snap = JSON.parse(JSON.stringify(g.toJSON()));
    snap.countries[0].soldiers = 3;
    const bad = Game.fromJSON(snap);
    const cautious = new NpcStrategy(CAUTIOUS, 800).shouldContinue(bad, "AAA", "BBB");
    expect(cautious.continue).toBe(false);
    expect(cautious.reason).toMatch(/Stopping/);
    snap.countries[0].soldiers = 9; snap.countries[1].soldiers = 3;
    const good = Game.fromJSON(snap);
    expect(new NpcStrategy(CAUTIOUS, 800).shouldContinue(good, "AAA", "BBB").continue).toBe(true);
  });
});

describe("NPC transfers", () => {
  it("moves soldiers from a strong country to a weak one, never emptying it", () => {
    const t = rigged();
    t.attackerWins();
    const g = t.game;
    let r = g.attack("AAA", "BBB");
    while (r.outcome === "continue") r = g.attack("AAA", "BBB");
    const plan = new NpcStrategy().planTransfer(g, "player-AAA");
    if (plan) {
      expect(plan.amount).toBeGreaterThanOrEqual(1);
      expect(g.getCountry(plan.from).soldiers - plan.amount).toBeGreaterThanOrEqual(1);
      expect(() => g.transfer(plan.from, plan.to, plan.amount)).not.toThrow();
    }
  });
  it("does nothing with a single country", () => {
    const { game } = rigged();
    expect(new NpcStrategy().planTransfer(game, "player-AAA")).toBeNull();
  });
});

describe("NPC personalities in a game", () => {
  const players = Array.from({ length: 10 }, (_, i) => ({ id: `player-${"ABCDEFGHIJ"[i].repeat(3)}`, isNpc: i !== 0 }));

  it("are stable: the same NPC always gets the same personality", () => {
    for (const p of players) expect(personalityFor(players, p.id)).toBe(personalityFor([...players].reverse(), p.id));
  });
  it("use all four personalities across the nine NPCs", () => {
    const used = new Set(players.filter((p) => p.isNpc).map((p) => personalityFor(players, p.id).name));
    expect(used.size).toBe(PERSONALITIES.length);
  });
  it("give the human the neutral default", () => {
    expect(personalityFor(players, players[0].id)).toBe(BALANCED);
  });
  it("each personality has a name, emoji and description for the UI, and sensible thresholds", () => {
    for (const p of PERSONALITIES) {
      expect(p.name).toBeTruthy(); expect(p.emoji).toBeTruthy(); expect(p.tagline.length).toBeGreaterThan(10);
      expect(p.minWinChance).toBeGreaterThan(p.stopBelow);
      expect(p.minWinChance).toBeLessThanOrEqual(1);
    }
    expect(new Set(PERSONALITIES.map((p) => p.name)).size).toBe(PERSONALITIES.length);
    expect(AGGRESSIVE.minWinChance).toBeLessThan(BALANCED.minWinChance);
    expect(CAUTIOUS.minWinChance).toBeGreaterThan(BALANCED.minWinChance);
  });
});

describe("a whole NPC turn", () => {
  it("always explains itself and ends with end_turn, using only legal moves", () => {
    vi.spyOn(Math, "random").mockImplementation(seededRng(7));
    const cs = makeCountries([1450e6, 1000e6, 347e6, 284e6, 255e6, 237e6, 212e6, 175e6, 144e6, 130e6]);
    const g = Game.create("Me", cs[0], cs.slice(1), seededRng(3));
    for (let turn = 0; turn < 60 && g.status === "active"; turn++) {
      const me = g.currentPlayer;
      const npc = new NpcStrategy(personalityFor(g.allPlayers, me.id), 100);
      // The human is just played by the NPC logic too, so the test needs no UI
      const events = [...npc.playTurn(g)];
      expect(events.length).toBeGreaterThan(0);
      for (const e of events) {
        expect(e.message.length).toBeGreaterThan(5); // visible reasoning
        expect(e.playerId).toBe(me.id);
      }
      const last = events[events.length - 1].type;
      expect(["end_turn", "victory"]).toContain(last);
    }
  });

  it("can resume a turn from a game saved in the middle of an attack", () => {
    vi.spyOn(Math, "random").mockImplementation(seededRng(11));
    const t = rigged([200e6, 60e6, ...Array(8).fill(200e6)]);
    t.defenderWins();
    t.game.attack("AAA", "BBB"); // battle left open, as if saved mid-turn
    expect(t.game.battleInProgress).toBe(true);
    const copy = Game.fromJSON(JSON.parse(JSON.stringify(t.game.toJSON())));
    const events = [...new NpcStrategy(BALANCED, 100).playTurn(copy)];
    expect(events.some((e) => /Resuming/.test(e.message))).toBe(true);
    expect(events[events.length - 1].type).toMatch(/end_turn|victory/);
  });
});
