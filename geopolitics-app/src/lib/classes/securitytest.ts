// Proves that illegal moves are rejected by the game engine.
// Run:  npx tsx src/lib/classes/securitytest.ts
import { Game, CountryData } from "./Game";

const names = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
const big: CountryData[] = names.map((n) => ({ code: n, name: "Country " + n, population: 200_000_000 })); // 9 soldiers each
const tiny: CountryData[] = names.map((n) => ({ code: n, name: "Country " + n, population: 1_000_000 })); // 1 soldier each

// Fake dice: "shuffle" keeps turn order stable; "win" = attacker always rolls 6, defender 1
let mode: "shuffle" | "win" = "shuffle";
let flip = false;
const rng = () => {
  if (mode === "shuffle") return 0.5;
  flip = !flip;
  return flip ? 0.99 : 0.0;
};

let fails = 0;
let blockedCount = 0;
function blocked(label: string, fn: () => void) {
  try {
    fn();
    fails++;
    console.log("FAIL (was allowed!):", label);
  } catch (e) {
    blockedCount++;
    console.log("OK (blocked):", label, "->", (e as Error).message);
  }
}
function allowed(label: string, ok: boolean) {
  if (!ok) fails++;
  console.log(ok ? "OK (allowed):" : "FAIL (should be allowed):", label);
}
const fresh = (data = big) => { mode = "shuffle"; return Game.create("Me", data[0], data.slice(1), rng); };

// ---------- Round 1 basics ----------
{
  const g = fresh();
  mode = "win";
  const me = g.currentPlayer;
  const mine = g.countriesOf(me.id)[0];
  const enemies = g.allCountries.filter((c) => c.ownerId !== me.id);
  const [e1, e2] = enemies;

  blocked("attack your own country", () => g.attack(mine.code, mine.code));
  blocked("attack using a country that is not yours", () => g.attack(e1.code, e2.code));
  blocked("attack a country that does not exist", () => g.attack(mine.code, "ZZZ"));
  blocked("transfer between the same country", () => g.transfer(mine.code, mine.code, 1));
  blocked("transfer from an enemy country", () => g.transfer(e1.code, mine.code, 1));
  blocked("transfer to an enemy country", () => g.transfer(mine.code, e1.code, 1));

  // conquer one country so there are two to transfer between
  let r = g.attack(mine.code, e1.code);
  while (r.outcome === "continue") r = g.attack(mine.code, e1.code);
  allowed("legal attack conquers a country", r.outcome === "conquered");
  blocked("second attack in the same turn", () => g.attack(mine.code, e2.code));
  blocked("transfer leaving 0 soldiers", () => g.transfer(mine.code, e1.code, g.getCountry(mine.code).soldiers));
  blocked("transfer more soldiers than exist", () => g.transfer(mine.code, e1.code, 100));
  blocked("transfer 0 soldiers", () => g.transfer(mine.code, e1.code, 0));
  blocked("transfer negative soldiers", () => g.transfer(mine.code, e1.code, -3));
  blocked("transfer fractional soldiers", () => g.transfer(mine.code, e1.code, 1.5));
  blocked("transfer NaN soldiers", () => g.transfer(mine.code, e1.code, NaN));
  blocked("transfer Infinity soldiers", () => g.transfer(mine.code, e1.code, Infinity));
  const before = g.getCountry(mine.code).soldiers + g.getCountry(e1.code).soldiers;
  g.transfer(mine.code, e1.code, 2);
  allowed("legal transfer works and conserves soldiers", g.getCountry(mine.code).soldiers + g.getCountry(e1.code).soldiers === before);
}

// ---------- Attack in progress ----------
{
  const g = fresh();
  mode = "win";
  const me = g.currentPlayer;
  const mine = g.countriesOf(me.id)[0];
  const [e1, e2] = g.allCountries.filter((c) => c.ownerId !== me.id);
  g.attack(mine.code, e1.code);
  allowed("attack is now in progress", g.battleInProgress);
  blocked("transfer during an attack", () => g.transfer(mine.code, e1.code, 1));
  blocked("allocate during an attack", () => g.allocateReinforcements(mine.code, 1));
  blocked("switch to another target mid-attack", () => g.attack(mine.code, e2.code));
}

// ---------- Reinforcements (round 2) ----------
{
  const g = fresh();
  while (g.round < 2) g.endTurn();
  const me = g.currentPlayer;
  const mine = g.countriesOf(me.id)[0];
  const enemy = g.allCountries.find((c) => c.ownerId !== me.id)!;
  allowed("2 reinforcements are waiting in round 2", g.pendingReinforcements === 2);
  blocked("attack before placing reinforcements", () => g.attack(mine.code, enemy.code));
  blocked("end turn before placing reinforcements", () => g.endTurn());
  blocked("allocate more than you have", () => g.allocateReinforcements(mine.code, 3));
  blocked("allocate 0", () => g.allocateReinforcements(mine.code, 0));
  blocked("allocate negative", () => g.allocateReinforcements(mine.code, -1));
  blocked("allocate fractional", () => g.allocateReinforcements(mine.code, 0.5));
  blocked("allocate to an enemy country", () => g.allocateReinforcements(enemy.code, 1));
  g.allocateReinforcements(mine.code, 2);
  allowed("legal allocation uses up the pool", g.pendingReinforcements === 0);
}

// ---------- Too few soldiers ----------
{
  const g = fresh(tiny);
  const me = g.currentPlayer;
  const mine = g.countriesOf(me.id)[0];
  const enemy = g.allCountries.find((c) => c.ownerId !== me.id)!;
  blocked("attack with only 1 soldier", () => g.attack(mine.code, enemy.code));
}

// ---------- Finished game ----------
{
  const g = fresh();
  const snap = JSON.parse(JSON.stringify(g.toJSON()));
  snap.status = "finished";
  snap.winnerId = snap.currentPlayerId;
  const done = Game.fromJSON(snap);
  const me = done.currentPlayer;
  const mine = done.countriesOf(me.id)[0];
  const enemy = done.allCountries.find((c) => c.ownerId !== me.id)!;
  blocked("attack after the game is finished", () => done.attack(mine.code, enemy.code));
  blocked("end turn after the game is finished", () => done.endTurn());
  blocked("allocate after the game is finished", () => done.allocateReinforcements(mine.code, 1));
}

console.log(`\n${blockedCount} illegal moves blocked.`);
console.log(fails === 0 ? "ALL GOOD" : fails + " FAILURES");