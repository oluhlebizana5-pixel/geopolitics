import { Game, AttackResult } from "./Game";
import { Country } from "./Country";
import { BattleEngine } from "./BattleEngine";
import { conquestReward } from "./rules";

// ---------- NPC personalities (same strategy, different thresholds) ----------
export interface NpcProfile {
  name: string;
  minWinChance: number; // only start an attack if win chance is at least this
  stopBelow: number; // stop an ongoing attack if win chance drops below this
}
export const BALANCED: NpcProfile = { name: "Balanced", minWinChance: 0.5, stopBelow: 0.3 };
export const AGGRESSIVE: NpcProfile = { name: "Aggressive", minWinChance: 0.35, stopBelow: 0.15 };
export const CAUTIOUS: NpcProfile = { name: "Cautious", minWinChance: 0.7, stopBelow: 0.45 };

// ---------- One visible decision / action (shown in the UI log) ----------
export type NpcEventType =
  | "reinforce"
  | "attack_start"
  | "battle_round"
  | "conquered"
  | "stop_attack"
  | "transfer"
  | "skip"
  | "end_turn"
  | "victory";

export interface NpcEvent {
  type: NpcEventType;
  playerId: string;
  playerName: string;
  message: string; // the justification shown to the player
  attackerCode?: string;
  defenderCode?: string;
  countryCode?: string;
  from?: string;
  to?: string;
  amount?: number;
  winChance?: number;
  result?: AttackResult;
}

export class NpcStrategy {
  private engine = new BattleEngine();
  private cache = new Map<string, number>();

  constructor(private profile: NpcProfile = BALANCED, private trials = 300) {}

  // ---------- Evaluation: estimated chance to conquer (Monte Carlo) ----------
  winChance(attackerSoldiers: number, defenderSoldiers: number): number {
    if (attackerSoldiers < 2) return 0;
    if (defenderSoldiers < 1) return 1;
    const key = `${attackerSoldiers}-${defenderSoldiers}`;
    const cached = this.cache.get(key);
    if (cached !== undefined) return cached;

    let wins = 0;
    for (let t = 0; t < this.trials; t++) {
      let a = attackerSoldiers;
      let d = defenderSoldiers;
      while (a >= 2 && d >= 1) {
        const r = this.engine.resolveRound(a, d);
        a -= r.attackerLosses;
        d -= r.defenderLosses;
      }
      if (d === 0) wins++;
    }
    const chance = wins / this.trials;
    this.cache.set(key, chance);
    return chance;
  }

  // ---------- Decision 1: where to put reinforcements ----------
  planReinforcements(game: Game, playerId: string): { code: string; amount: number; reason: string } | null {
    const amount = game.pendingReinforcements;
    if (amount < 1) return null;
    const mine = game.countriesOf(playerId);
    if (mine.length === 0) return null;
    const strongest = [...mine].sort((a, b) => b.soldiers - a.soldiers)[0];
    return {
      code: strongest.code,
      amount,
      reason: `Placing all ${amount} new soldiers on ${strongest.name} (${strongest.soldiers} soldiers), my strongest country, to maximise attacking power.`,
    };
  }

  // ---------- Decision 2: whether to attack, and who ----------
  chooseAttack(
    game: Game,
    playerId: string
  ): { attackerCode: string; defenderCode: string; winChance: number; reason: string } | null {
    const attackers = game.countriesOf(playerId).filter((c) => c.soldiers >= 2);
    const targets = game.allCountries.filter((c) => c.ownerId !== playerId);
    if (attackers.length === 0 || targets.length === 0) return null;

    let best: { a: Country; d: Country; chance: number; score: number; eliminates: boolean; reward: number } | null = null;

    for (const a of attackers) {
      for (const d of targets) {
        const chance = this.winChance(a.soldiers, d.soldiers);
        if (chance < this.profile.minWinChance) continue;

        const reward = conquestReward(d.soldiers);
        const eliminates = game.countriesOf(d.ownerId).length === 1;
        const winsGame = targets.length === 1;

        let score = chance * (reward + 1);
        if (eliminates) score += chance * 1.5; // removing a rival is valuable
        if (winsGame) score += chance * 10; // conquering the world
        if (!best || score > best.score) best = { a, d, chance, score, eliminates, reward };
      }
    }
    if (!best) return null;

    const pct = Math.round(best.chance * 100);
    let reason = `Attacking ${best.d.name} (${best.d.soldiers}) from ${best.a.name} (${best.a.soldiers}): about ${pct}% chance to conquer, reward ${best.reward} soldiers`;
    if (best.eliminates) reason += `, and it eliminates ${game.getPlayer(best.d.ownerId).name}`;
    reason += ".";

    return { attackerCode: best.a.code, defenderCode: best.d.code, winChance: best.chance, reason };
  }

  // ---------- Decision 3: keep attacking or stop? ----------
  shouldContinue(
    game: Game,
    attackerCode: string,
    defenderCode: string
  ): { continue: boolean; reason: string; winChance: number } {
    const a = game.getCountry(attackerCode);
    const d = game.getCountry(defenderCode);
    const chance = this.winChance(a.soldiers, d.soldiers);
    const pct = Math.round(chance * 100);
    if (chance < this.profile.stopBelow) {
      return {
        continue: false,
        winChance: chance,
        reason: `Stopping the attack: ${a.name} (${a.soldiers}) vs ${d.name} (${d.soldiers}) is down to about ${pct}% chance, so I am keeping my remaining soldiers.`,
      };
    }
    return {
      continue: true,
      winChance: chance,
      reason: `Continuing: ${a.name} (${a.soldiers}) vs ${d.name} (${d.soldiers}) is still about ${pct}% chance.`,
    };
  }

  // ---------- Decision 4: move soldiers between my own countries ----------
  planTransfer(game: Game, playerId: string): { from: string; to: string; amount: number; reason: string } | null {
    const mine = game.countriesOf(playerId);
    if (mine.length < 2) return null;
    const sorted = [...mine].sort((a, b) => b.soldiers - a.soldiers);
    const strongest = sorted[0];
    const weakest = sorted[sorted.length - 1];
    const diff = strongest.soldiers - weakest.soldiers;
    if (diff < 4) return null;
    const amount = Math.floor(diff / 3);
    if (amount < 1 || strongest.soldiers - amount < 1) return null;
    return {
      from: strongest.code,
      to: weakest.code,
      amount,
      reason: `Moving ${amount} soldier${amount === 1 ? "" : "s"} from ${strongest.name} (${strongest.soldiers}) to ${weakest.name} (${weakest.soldiers}) so no holding is dangerously weak.`,
    };
  }

  // ---------- A whole NPC turn, one visible step at a time ----------
  // The UI loops over this generator and waits between steps.
  // Fast-forward = shorter wait, but every event is still shown.
  // It is safe to call again on a game restored from a save made in the middle
  // of a turn: it carries on from wherever that turn had got to.
  *playTurn(game: Game): Generator<NpcEvent> {
    const me = game.currentPlayer;
    const ev = (type: NpcEventType, message: string, extra: Partial<NpcEvent> = {}): NpcEvent => ({
      type,
      playerId: me.id,
      playerName: me.name,
      message,
      ...extra,
    });

    // 1. Reinforcements (round 2 onward). Nothing to do if already placed.
    const reinforce = this.planReinforcements(game, me.id);
    if (reinforce) {
      game.allocateReinforcements(reinforce.code, reinforce.amount);
      yield ev("reinforce", reinforce.reason, { countryCode: reinforce.code, amount: reinforce.amount });
    }

    // 2. Attack (one attack per turn).
    //    Resume a saved attack in progress, or skip if this turn's attack is already over.
    const saved = game.currentBattle;
    if (saved || !game.attackUsed) {
      const choice = saved
        ? {
            attackerCode: saved.attackerCode,
            defenderCode: saved.defenderCode,
            winChance: this.winChance(
              game.getCountry(saved.attackerCode).soldiers,
              game.getCountry(saved.defenderCode).soldiers
            ),
            reason: `Resuming the attack on ${game.getCountry(saved.defenderCode).name}.`,
          }
        : this.chooseAttack(game, me.id);

      if (!choice) {
        yield ev(
          "skip",
          `No attack worth making: nothing reaches ${Math.round(this.profile.minWinChance * 100)}% win chance, so I am saving my soldiers.`
        );
      } else {
        yield ev("attack_start", choice.reason, {
          attackerCode: choice.attackerCode,
          defenderCode: choice.defenderCode,
          winChance: choice.winChance,
        });

        while (true) {
          const result = game.attack(choice.attackerCode, choice.defenderCode);
          const a = game.getCountry(choice.attackerCode);
          const d = game.getCountry(choice.defenderCode);
          yield ev(
            "battle_round",
            `Dice round: ${result.round.attackerLosses} soldier(s) lost by ${a.name}, ${result.round.defenderLosses} lost by the defender.`,
            { attackerCode: choice.attackerCode, defenderCode: choice.defenderCode, result }
          );

          if (game.status === "finished") {
            yield ev("victory", `${me.name} has conquered the world!`);
            return;
          }

          if (result.outcome === "conquered") {
            let msg = `${me.name} conquered ${d.name} and gained ${result.soldiersGained} soldiers there.`;
            if (result.eliminatedPlayerId) msg += ` ${game.getPlayer(result.eliminatedPlayerId).name} is eliminated.`;
            yield ev("conquered", msg, { defenderCode: choice.defenderCode, result });
            break;
          }
          if (result.outcome === "attacker_exhausted") {
            yield ev("stop_attack", `Attack over: ${a.name} is down to 1 soldier and cannot continue.`, {
              attackerCode: choice.attackerCode,
              defenderCode: choice.defenderCode,
            });
            break;
          }

          const decision = this.shouldContinue(game, choice.attackerCode, choice.defenderCode);
          if (!decision.continue) {
            yield ev("stop_attack", decision.reason, {
              attackerCode: choice.attackerCode,
              defenderCode: choice.defenderCode,
              winChance: decision.winChance,
            });
            break;
          }
        }
      }
    }

    // 3. Transfers (only allowed when no attack is in progress)
    if (!game.battleInProgress) {
      const transfer = this.planTransfer(game, me.id);
      if (transfer) {
        game.transfer(transfer.from, transfer.to, transfer.amount);
        yield ev("transfer", transfer.reason, { from: transfer.from, to: transfer.to, amount: transfer.amount });
      }
    }

    // 4. End turn
    game.endTurn();
    yield ev("end_turn", `${me.name} ends their turn.`);
  }
}