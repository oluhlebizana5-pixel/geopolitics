// Types and helpers shared by the browser and the server for battle commentary.

import type { Game } from "./classes/Game";
import type { NpcEvent } from "./classes/NpcStrategy";

export type CommentaryOutcome = "continue" | "conquered" | "attacker_exhausted";

// Plain facts about one dice round. This is all the AI is given.
export interface CommentaryRequest {
  round: number;
  attackerCountry: string;
  defenderCountry: string;
  attackerPlayer: string;
  rolls: { attacker: number; defender: number; winner: "attacker" | "defender" | "tie" }[];
  attackerLosses: number;
  defenderLosses: number;
  attackerSoldiersLeft: number;
  defenderSoldiersLeft: number;
  outcome: CommentaryOutcome;
  soldiersGained: number;
  eliminatedPlayer?: string;
  worldConquered: boolean;
  recent: string[]; // the last few commentary lines, so the AI does not repeat itself
}

export interface CommentaryResult {
  commentary: string;
  source: "ai" | "fallback";
  reason?: string; // why the fallback was used (for debugging)
}

// Turns a battle_round event into the facts the commentator needs.
// Call it right after the event, while the game is still in that state.
export function buildCommentaryRequest(game: Game, event: NpcEvent): CommentaryRequest | null {
  if (event.type !== "battle_round" || !event.result || !event.attackerCode || !event.defenderCode) return null;
  const a = game.getCountry(event.attackerCode);
  const d = game.getCountry(event.defenderCode);
  const r = event.result;
  const conquered = r.outcome === "conquered";
  return {
    round: game.round,
    attackerCountry: a.name,
    defenderCountry: d.name,
    attackerPlayer: event.playerName,
    rolls: r.round.pairs.map((p) => ({
      attacker: p.attackerRoll,
      defender: p.defenderRoll,
      winner: p.winner,
    })),
    attackerLosses: r.round.attackerLosses,
    defenderLosses: r.round.defenderLosses,
    attackerSoldiersLeft: a.soldiers,
    defenderSoldiersLeft: conquered ? 0 : d.soldiers,
    outcome: r.outcome,
    soldiersGained: r.soldiersGained,
    eliminatedPlayer: r.eliminatedPlayerId ? game.getPlayer(r.eliminatedPlayerId).name : undefined,
    worldConquered: game.status === "finished",
    recent: [],
  };
}

// Template commentary used when no AI key is set or the AI is unavailable,
// so the game never breaks. Not random: the same round gives the same line.
export function fallbackCommentary(req: CommentaryRequest): string {
  const pick = (options: string[]) =>
    options[(req.round + req.attackerLosses * 3 + req.defenderLosses * 5 + req.attackerSoldiersLeft) % options.length];
  const { attackerCountry: a, defenderCountry: d } = req;

  if (req.worldConquered) {
    return `${req.attackerPlayer} has done it! ${d} falls and the whole world now belongs to one ruler.`;
  }
  if (req.outcome === "conquered") {
    const elim = req.eliminatedPlayer ? ` ${req.eliminatedPlayer} is wiped off the map.` : "";
    return pick([
      `${a} storms ${d}! ${req.soldiersGained} soldiers march in to hold the new territory.${elim}`,
      `It is over for ${d}. ${a} takes the land and plants ${req.soldiersGained} soldiers there.${elim}`,
    ]);
  }
  if (req.outcome === "attacker_exhausted") {
    return pick([
      `${a} is down to its last soldier and must call off the attack on ${d}.`,
      `Out of strength, ${a} backs away from ${d} with a single soldier left.`,
    ]);
  }
  if (req.attackerLosses === 0 && req.defenderLosses === 0) {
    return pick([`Nobody blinks. The dice come out level and no soldiers fall.`, `A stalemate in the dust: not a single soldier lost this round.`]);
  }
  if (req.attackerLosses > 0 && req.defenderLosses > 0) {
    return pick([
      `Blood on both sides! ${a} loses ${req.attackerLosses}, ${d} loses ${req.defenderLosses}.`,
      `A brutal exchange: ${a} drops ${req.attackerLosses} and ${d} drops ${req.defenderLosses}.`,
    ]);
  }
  if (req.defenderLosses > 0) {
    return pick([
      `${a} breaks through! ${d} loses ${req.defenderLosses} and is feeling the pressure.`,
      `The dice favour ${a}, and ${d} sees ${req.defenderLosses} soldier${req.defenderLosses === 1 ? "" : "s"} fall.`,
    ]);
  }
  return pick([
    `${d} holds the line and ${a} pays for it, losing ${req.attackerLosses}.`,
    `A fierce defence by ${d}! ${a} loses ${req.attackerLosses} soldier${req.attackerLosses === 1 ? "" : "s"}.`,
  ]);
}