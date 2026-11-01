export type Rng = () => number; // injectable so you can unit test

export interface DicePair {
  attackerRoll: number;
  defenderRoll: number;
  winner: "attacker" | "defender" | "tie";
}

export interface RoundResult {
  diceCount: number;
  pairs: DicePair[];
  attackerLosses: number;
  defenderLosses: number;
}

export class BattleEngine {
  constructor(private rng: Rng = Math.random) {}

  private rollDie(): number {
    return Math.floor(this.rng() * 6) + 1;
  }

  // Attacker can commit (soldiers - 1); dice = min(that, defender soldiers)
  static diceCount(attackerSoldiers: number, defenderSoldiers: number): number {
    return Math.max(0, Math.min(attackerSoldiers - 1, defenderSoldiers));
  }

  static canAttack(attackerSoldiers: number): boolean {
    return attackerSoldiers >= 2;
  }

  resolveRound(attackerSoldiers: number, defenderSoldiers: number): RoundResult {
    if (!BattleEngine.canAttack(attackerSoldiers)) {
      throw new Error("Attacker needs at least 2 soldiers to attack.");
    }
    if (defenderSoldiers < 1) {
      throw new Error("Defender has no soldiers.");
    }

    const diceCount = BattleEngine.diceCount(attackerSoldiers, defenderSoldiers);
    const pairs: DicePair[] = [];
    let attackerLosses = 0;
    let defenderLosses = 0;

    for (let i = 0; i < diceCount; i++) {
      const a = this.rollDie();
      const d = this.rollDie();
      if (a > d) { defenderLosses++; pairs.push({ attackerRoll: a, defenderRoll: d, winner: "attacker" }); }
      else if (d > a) { attackerLosses++; pairs.push({ attackerRoll: a, defenderRoll: d, winner: "defender" }); }
      else { pairs.push({ attackerRoll: a, defenderRoll: d, winner: "tie" }); }
    }
    return { diceCount, pairs, attackerLosses, defenderLosses };
  }
}