import { describe, it, expect } from "vitest";
import { soldiersForPopulation, conquestReward, reinforcementsFor } from "@/lib/classes/rules";
import { makeCountries } from "./helpers";
import { Game } from "@/lib/classes/Game";

describe("population -> starting soldiers", () => {
  it.each([
    [1_000_000, 1], [5_000_000, 1], [5_000_001, 2], [10_000_000, 2], [10_000_001, 3],
    [25_000_000, 3], [25_000_001, 4], [50_000_000, 4], [50_000_001, 5], [75_000_000, 5],
    [75_000_001, 6], [100_000_000, 6], [100_000_001, 7], [125_000_000, 7], [125_000_001, 8],
    [150_000_000, 8], [150_000_001, 9], [1_450_000_000, 9],
  ])("%i people -> %i soldiers", (population, soldiers) => {
    expect(soldiersForPopulation(population)).toBe(soldiers);
  });

  it("never gives less than 1 or more than 9 soldiers", () => {
    for (let p = 0; p < 2_000_000_000; p += 7_300_000) {
      const s = soldiersForPopulation(p);
      expect(s).toBeGreaterThanOrEqual(1);
      expect(s).toBeLessThanOrEqual(9);
    }
  });

  it("a new game gives every country the soldiers for its population", () => {
    const pops = [1e6, 7e6, 20e6, 40e6, 60e6, 90e6, 110e6, 140e6, 170e6, 900e6];
    const cs = makeCountries(pops);
    const g = Game.create("Me", cs[0], cs.slice(1), () => 0.5);
    expect(g.allCountries.map((c) => c.soldiers)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 9]);
  });
});

describe("conquest rewards and reinforcements", () => {
  it("conquest reward is half the defender's starting soldiers, at least 2", () => {
    expect(conquestReward(1)).toBe(2);
    expect(conquestReward(3)).toBe(2);
    expect(conquestReward(5)).toBe(2);
    expect(conquestReward(8)).toBe(4);
    expect(conquestReward(9)).toBe(4);
    expect(conquestReward(20)).toBe(10);
  });

  it("no reinforcements in round 1, then 2 per country held", () => {
    expect(reinforcementsFor(1, 1)).toBe(0);
    expect(reinforcementsFor(10, 1)).toBe(0);
    expect(reinforcementsFor(1, 2)).toBe(2);
    expect(reinforcementsFor(4, 3)).toBe(8);
    expect(reinforcementsFor(0, 5)).toBe(0);
  });
});

describe("setting up a game", () => {
  const cs = makeCountries();
  it("needs exactly 10 unique countries", () => {
    expect(() => Game.create("Me", cs[0], cs.slice(1, 5))).toThrow(/9 other countries/);
    expect(() => Game.create("Me", cs[0], [cs[0], ...cs.slice(2)])).toThrow(/unique/);
  });
  it("starts in round 1 with one country per player and the human first in the list", () => {
    const g = Game.create("Me", cs[0], cs.slice(1));
    expect(g.round).toBe(1);
    expect(g.status).toBe("active");
    expect(g.allPlayers).toHaveLength(10);
    expect(g.allPlayers.filter((p) => !p.isNpc)).toHaveLength(1);
    for (const p of g.allPlayers) expect(g.countriesOf(p.id)).toHaveLength(1);
  });
});
