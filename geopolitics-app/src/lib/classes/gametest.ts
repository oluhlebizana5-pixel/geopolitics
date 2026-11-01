import { Game, CountryData } from "./Game";

const names = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
// All 200m population -> 9 soldiers each
const data: CountryData[] = names.map((n) => ({
  code: n,
  name: "Country " + n,
  population: 200_000_000,
}));

// Scripted dice: "shuffle" mode = neutral, "win" mode = attacker always rolls 6, defender 1
let mode: "shuffle" | "win" = "shuffle";
let flip = false;
const rng = () => {
  if (mode === "shuffle") return 0.5;
  flip = !flip;
  return flip ? 0.99 : 0.0;
};

function expectThrow(label: string, fn: () => void) {
  try { fn(); console.log("FAIL (no error):", label); }
  catch (e) { console.log("OK (blocked):", label, "->", (e as Error).message); }
}

const game = Game.create("Me", data[0], data.slice(1), rng);
mode = "win";

console.log("Players:", game.allPlayers.length, "(expect 10)");
console.log("Countries:", game.allCountries.length, "(expect 10)");
console.log("All start with 9 soldiers:", game.allCountries.every((c) => c.soldiers === 9));
console.log("Round:", game.round, "(expect 1)");
console.log("Round 1 reinforcements:", game.pendingReinforcements, "(expect 0)");

// First player attacks someone and wins every die
const first = game.currentPlayer;
const myCountry = game.countriesOf(first.id)[0];
const enemy = game.allCountries.find((c) => c.ownerId !== first.id)!;
const enemyOwner = enemy.ownerId;

let result = game.attack(myCountry.code, enemy.code);
console.log("Attack round 1 outcome:", result.outcome, "(expect continue)");
result = game.attack(myCountry.code, enemy.code);
console.log("Attack round 2 outcome:", result.outcome, "(expect conquered)");
console.log("Soldiers gained:", result.soldiersGained, "(expect 4)");
console.log("Enemy now owned by attacker:", game.getCountry(enemy.code).ownerId === first.id);
console.log("Conquered country soldiers:", game.getCountry(enemy.code).soldiers, "(expect 4)");
console.log("Enemy owner eliminated:", game.getPlayer(enemyOwner).eliminated, "(expect true)");

// Rules that must be blocked
expectThrow("second attack in same turn", () => game.attack(myCountry.code, game.allCountries.find((c) => c.ownerId !== first.id)!.code));
expectThrow("transfer leaving 0 soldiers", () => game.transfer(myCountry.code, enemy.code, 9));
game.transfer(myCountry.code, enemy.code, 3);
console.log("After transfer:", game.getCountry(myCountry.code).soldiers, "and", game.getCountry(enemy.code).soldiers, "(expect 6 and 7)");

// Play on until round 2 starts, skipping the eliminated player
game.endTurn();
let guard = 0;
while (game.round === 1 && guard++ < 20) game.endTurn();
const p = game.currentPlayer;
const held = game.countriesOf(p.id).length;
console.log("Round:", game.round, "(expect 2)");
console.log("Current player reinforcements:", game.pendingReinforcements, "(expect", held * 2 + ")");
expectThrow("ending turn with unallocated reinforcements", () => game.endTurn());
game.allocateReinforcements(game.countriesOf(p.id)[0].code, game.pendingReinforcements);
console.log("Reinforcements left:", game.pendingReinforcements, "(expect 0)");

// Full simulation: attacker always wins, so someone conquers the world
let turns = 0;
while (game.status === "active" && turns++ < 500) {
  const cur = game.currentPlayer;
  if (game.pendingReinforcements > 0) {
    game.allocateReinforcements(game.countriesOf(cur.id)[0].code, game.pendingReinforcements);
  }
  const mine = game.countriesOf(cur.id).sort((a, b) => b.soldiers - a.soldiers)[0];
  const target = game.allCountries.find((c) => c.ownerId !== cur.id);
  if (cur.id === game.allPlayers[0].id && target && mine.soldiers >= 2) {
    let r = game.attack(mine.code, target.code);
    while (r.outcome === "continue") r = game.attack(mine.code, target.code);
  }
  if (game.status === "active") game.endTurn();
}
console.log("Game finished:", game.status === "finished", "(expect true)");
console.log("Winner:", game.winnerId);
console.log("Winner owns all 10:", game.countriesOf(game.winnerId!).length === 10, "(expect true)");