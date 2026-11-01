import { Game, CountryData } from "./Game";
import { NpcStrategy } from "./NpcStrategy";

const pops = [1_400_000_000, 60_000_000, 200_000_000, 30_000_000, 8_000_000, 90_000_000, 4_000_000, 120_000_000, 20_000_000, 45_000_000];
const data: CountryData[] = pops.map((p, i) => ({ code: "C" + i, name: "Country " + i, population: p }));

const game = Game.create("Me", data[0], data.slice(1));
const npc = new NpcStrategy();

console.log("Start soldiers:", game.allCountries.map((c) => c.soldiers).join(","));

let turns = 0;
let shown = 0;
const counts: Record<string, number> = {};
while (game.status === "active" && turns++ < 2000) {
  for (const e of npc.playTurn(game)) {
    counts[e.type] = (counts[e.type] || 0) + 1;
    if (!e.message || e.message.length < 5) console.log("FAIL: missing reason", e.type);
    if (shown < 14 && e.type !== "battle_round") {
      console.log(`[${e.type}] ${e.playerName}: ${e.message}`);
      shown++;
    }
  }
  if (game.allCountries.some((c) => c.soldiers < 1)) console.log("FAIL: a country has 0 soldiers");
}
console.log("Turns played:", turns, "| Rounds:", game.round);
console.log("Event counts:", JSON.stringify(counts));
console.log("Game finished:", game.status === "finished");
console.log("Winner:", game.winnerId);
if (game.winnerId) console.log("Winner owns all 10:", game.countriesOf(game.winnerId).length === 10);