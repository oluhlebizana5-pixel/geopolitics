// Moves made by the human player. Each function applies the move to a Game
// and returns the log events to show. They throw an Error with a readable
// message if the move breaks a rule, so the UI can display it.

import { Game } from "./Game";
import { NpcEvent, NpcEventType } from "./NpcStrategy";

function ev(game: Game, type: NpcEventType, message: string, extra: Partial<NpcEvent> = {}): NpcEvent {
  const p = game.currentPlayer;
  return { type, playerId: p.id, playerName: p.name, message, ...extra };
}

const soldiers = (n: number) => `${n} soldier${n === 1 ? "" : "s"}`;

export function placeReinforcements(game: Game, code: string, amount: number): NpcEvent[] {
  game.allocateReinforcements(code, amount);
  const c = game.getCountry(code);
  return [ev(game, "reinforce", `Placed ${soldiers(amount)} on ${c.name} (now ${c.soldiers}).`, { countryCode: code, amount })];
}

export function transferSoldiers(game: Game, from: string, to: string, amount: number): NpcEvent[] {
  game.transfer(from, to, amount);
  const a = game.getCountry(from);
  const b = game.getCountry(to);
  return [
    ev(game, "transfer", `Moved ${soldiers(amount)} from ${a.name} (now ${a.soldiers}) to ${b.name} (now ${b.soldiers}).`, {
      from,
      to,
      amount,
    }),
  ];
}

// Rolls ONE round of dice. Call again to keep attacking.
export function attackRound(game: Game, attackerCode: string, defenderCode: string): NpcEvent[] {
  const events: NpcEvent[] = [];
  const a = game.getCountry(attackerCode);
  const d = game.getCountry(defenderCode);

  if (!game.battleInProgress) {
    events.push(
      ev(game, "attack_start", `Attacking ${d.name} (${d.soldiers}) from ${a.name} (${a.soldiers}).`, {
        attackerCode,
        defenderCode,
      })
    );
  }

  const result = game.attack(attackerCode, defenderCode);
  events.push(
    ev(
      game,
      "battle_round",
      `Dice round: ${result.round.attackerLosses} soldier(s) lost by ${a.name}, ${result.round.defenderLosses} lost by the defender.`,
      { attackerCode, defenderCode, result }
    )
  );

  if (game.status === "finished") {
    events.push(ev(game, "victory", `${game.currentPlayer.name} has conquered the world!`));
  } else if (result.outcome === "conquered") {
    let msg = `${game.currentPlayer.name} conquered ${d.name} and gained ${result.soldiersGained} soldiers there.`;
    if (result.eliminatedPlayerId) msg += ` ${game.getPlayer(result.eliminatedPlayerId).name} is eliminated.`;
    events.push(ev(game, "conquered", msg, { defenderCode, result }));
  } else if (result.outcome === "attacker_exhausted") {
    events.push(
      ev(game, "stop_attack", `Attack over: ${a.name} is down to 1 soldier and cannot continue.`, { attackerCode, defenderCode })
    );
  }
  return events;
}

// Ends the turn. If an attack is in progress this also stops it.
export function endHumanTurn(game: Game): NpcEvent[] {
  const events: NpcEvent[] = [];
  const battle = game.currentBattle;
  if (battle) {
    events.push(
      ev(game, "stop_attack", `Stopped the attack on ${game.getCountry(battle.defenderCode).name} and ended the turn.`, {
        attackerCode: battle.attackerCode,
        defenderCode: battle.defenderCode,
      })
    );
  } else if (!game.attackUsed) {
    events.push(ev(game, "skip", "Chose not to attack this turn."));
  }
  const endEvent = ev(game, "end_turn", `${game.currentPlayer.name} ends their turn.`);
  game.endTurn(); // throws if reinforcements are still unplaced
  events.push(endEvent);
  return events;
}