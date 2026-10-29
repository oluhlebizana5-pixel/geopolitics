import { soldiersForPopulation, conquestReward, reinforcementsFor } from "./rules";
import { BattleEngine } from "./BattleEngine";

console.log("India (1.4bn):", soldiersForPopulation(1_400_000_000), "(expect 9)");
console.log("Vatican (800):", soldiersForPopulation(800), "(expect 1)");
console.log("South Africa (60m):", soldiersForPopulation(60_000_000), "(expect 5)");
console.log("Conquer value 9:", conquestReward(9), "(expect 4)");
console.log("Conquer value 1:", conquestReward(1), "(expect 2)");
console.log("3 countries, round 2:", reinforcementsFor(3, 2), "(expect 6)");
console.log("Round 1:", reinforcementsFor(3, 1), "(expect 0)");

// Brief's example: attacker 10 soldiers, defender 2.
// Fake dice, in order: attacker 1, defender 2, attacker 4, defender 3
const fake = [0.0, 0.2, 0.6, 0.4]; // 0.0 -> 1, 0.2 -> 2, 0.6 -> 4, 0.4 -> 3
let i = 0;
const engine = new BattleEngine(() => fake[i++]);
const r = engine.resolveRound(10, 2);
console.log("Dice used:", r.diceCount, "(expect 2)");
console.log("Attacker losses:", r.attackerLosses, "(expect 1)");
console.log("Defender losses:", r.defenderLosses, "(expect 1)");