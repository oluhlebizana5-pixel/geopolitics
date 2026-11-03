// The anti-tampering rules for saving a game, written as plain TypeScript.
//
// firestore.rules contains the SAME checks written in the Firestore rules language, so the
// database itself refuses forged writes. This TypeScript copy exists so the checks can be
// unit-tested quickly (npm test) and so both versions stay easy to compare line by line.
//
// What these rules prove about every save (old document -> new document):
//   * the document keeps its owner, human player, turn order and country identities
//   * soldier counts are whole numbers in a sensible range
//   * soldiers can only appear through reinforcements (never from nowhere)
//   * a country only changes owner through a conquest by the current player, with the exact reward
//   * enemy countries can never gain soldiers; a player is only eliminated with 0 countries
//   * the turn only moves on when it is allowed to, with exactly the right reinforcements
//   * a finished game can no longer change, and a win means holding all 10 countries
//
// Limits (also written in the README): rules cannot re-roll the dice, so they cannot prove that
// a particular dice result was fair. Full authority would need a server (see README, "Limitations").

import { conquestReward, reinforcementsFor } from "./classes/rules";

export interface DocCountry { code: string; name: string; population: number; ownerId: string; soldiers: number }
export interface DocPlayer { id: string; name: string; isNpc: boolean; eliminated: boolean }
export interface GameDoc {
  ownerUid: string;
  ownerName?: string;
  humanPlayerId: string;
  status: "active" | "finished";
  round: number;
  currentPlayerId: string;
  turnOrder: string[];
  winnerId: string | null;
  pendingReinforcements: number;
  attackUsed: boolean;
  battle: { attackerCode: string; defenderCode: string; defenderStartSoldiers: number } | null;
  players: DocPlayer[];
  countries: DocCountry[];
}

export const MAX_SOLDIERS = 10_000; // a hard ceiling; real games stay far below it
export const MAX_LOSS_PER_WRITE = 9; // one dice round removes at most 9 soldiers from one side

const isWholeNumber = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n);
const held = (d: GameDoc, playerId: string) => d.countries.filter((c) => c.ownerId === playerId).length;
const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Who may read? Everyone, including visitors who are not logged in. */
export function canReadGame(): boolean {
  return true;
}

/** Who may change a game? Only the signed-in owner. */
export function canWriteGame(authUid: string | null | undefined, game: Pick<GameDoc, "ownerUid">): boolean {
  return !!authUid && authUid === game.ownerUid;
}

/** Rules for creating a brand-new game. Returns a list of broken rules (empty = allowed). */
export function validateCreate(authUid: string | null | undefined, d: GameDoc): string[] {
  const bad: string[] = [];
  if (!authUid) bad.push("must be signed in");
  if (d.ownerUid !== authUid) bad.push("ownerUid must be the signed-in user");
  if (d.status !== "active") bad.push("a new game must be active");
  if (d.round !== 1) bad.push("a new game starts at round 1");
  if (d.winnerId !== null) bad.push("a new game has no winner");
  if (d.battle !== null) bad.push("a new game has no battle");
  if (d.attackUsed !== false) bad.push("a new game has no attack used");
  if (d.pendingReinforcements !== 0) bad.push("round 1 has no reinforcements");
  if (d.countries.length !== 10 || d.players.length !== 10 || d.turnOrder.length !== 10) bad.push("must have 10 countries, players and turns");
  if (!d.turnOrder.includes(d.currentPlayerId)) bad.push("current player must be in the turn order");
  for (const c of d.countries) {
    if (!isWholeNumber(c.soldiers) || c.soldiers < 1 || c.soldiers > 9) bad.push(`${c.code}: starting soldiers must be 1-9`);
    if (c.ownerId !== `player-${c.code}`) bad.push(`${c.code}: must start owned by its own player`);
  }
  if (d.players.some((p) => p.eliminated)) bad.push("nobody starts eliminated");
  return bad;
}

/** Rules for saving a change to an existing game. Returns a list of broken rules (empty = allowed). */
export function validateUpdate(authUid: string | null | undefined, o: GameDoc, n: GameDoc): string[] {
  const bad: string[] = [];
  if (!canWriteGame(authUid, o)) return ["only the owner can change this game"];

  // Identity never changes
  if (n.ownerUid !== o.ownerUid) bad.push("ownerUid cannot change");
  if (n.humanPlayerId !== o.humanPlayerId) bad.push("humanPlayerId cannot change");
  if (!sameJson(n.turnOrder, o.turnOrder)) bad.push("turn order cannot change");
  if (n.countries.length !== 10 || n.players.length !== 10) bad.push("must keep 10 countries and 10 players");
  if (bad.length) return bad;

  // A finished game is frozen (re-saving the identical result is harmless)
  if (o.status === "finished") {
    const same = n.status === "finished" && n.winnerId === o.winnerId && n.round === o.round &&
      sameJson(n.countries, o.countries) && sameJson(n.players, o.players);
    return same ? [] : ["a finished game cannot change"];
  }

  const turnChanged = n.currentPlayerId !== o.currentPlayerId;
  let ownerChanges = 0;
  let allocationDelta = 0; // net soldiers gained by the current player's own (unconquered) countries

  for (let i = 0; i < 10; i++) {
    const oc = o.countries[i], nc = n.countries[i];
    if (nc.code !== oc.code || nc.population !== oc.population) bad.push(`country ${i}: code/population cannot change`);
    if (!isWholeNumber(nc.soldiers) || nc.soldiers < 0 || nc.soldiers > MAX_SOLDIERS) bad.push(`${oc.code}: invalid soldier count`);
    if (nc.ownerId === oc.ownerId) {
      if (oc.ownerId === o.currentPlayerId) allocationDelta += nc.soldiers - oc.soldiers;
      if (oc.ownerId !== o.currentPlayerId) {
        // Enemy countries can only lose soldiers, and only one dice round's worth per save
        if (nc.soldiers > oc.soldiers) bad.push(`${oc.code}: an enemy country cannot gain soldiers`);
        if (nc.soldiers < oc.soldiers - MAX_LOSS_PER_WRITE) bad.push(`${oc.code}: lost too many soldiers at once`);
      }
      if (nc.soldiers < 1) bad.push(`${oc.code}: only a conquest can leave 0 soldiers`);
    } else {
      ownerChanges++;
      const start = o.battle ? o.battle.defenderStartSoldiers : oc.soldiers;
      if (nc.ownerId !== o.currentPlayerId) bad.push(`${oc.code}: can only be conquered by the current player`);
      if (oc.ownerId === o.currentPlayerId) bad.push(`${oc.code}: a player cannot conquer their own country`);
      if (nc.soldiers !== conquestReward(start)) bad.push(`${oc.code}: conquest reward must be exactly ${conquestReward(start)}`);
    }
  }
  if (ownerChanges > 1) bad.push("only one country can change owner per save");

  // Soldiers only appear through reinforcements
  const allocated = turnChanged ? 0 : o.pendingReinforcements - n.pendingReinforcements;
  if (allocationDelta > allocated) bad.push("soldiers were added without reinforcements");

  // Players
  for (let i = 0; i < 10; i++) {
    const op = o.players[i], np = n.players[i];
    if (op.eliminated && !np.eliminated) bad.push(`${op.id}: cannot come back from elimination`);
    if (!op.eliminated && np.eliminated && held(n, np.id) !== 0) bad.push(`${op.id}: eliminated while still holding countries`);
  }

  // Round, turn and reinforcements
  if (!(n.round === o.round || (n.round === o.round + 1 && turnChanged))) bad.push("round can only go up by 1 when the turn passes");
  if (turnChanged) {
    if (o.pendingReinforcements !== 0) bad.push("cannot end the turn with unplaced reinforcements");
    if (n.battle !== null || n.attackUsed !== false) bad.push("a new turn starts with no battle and no attack used");
    if (!o.turnOrder.includes(n.currentPlayerId)) bad.push("next player must be in the turn order");
    if (held(n, n.currentPlayerId) < 1) bad.push("next player must still hold a country");
    if (n.status === "active" && n.pendingReinforcements !== reinforcementsFor(held(n, n.currentPlayerId), n.round)) bad.push("wrong reinforcements for the new turn");
  } else {
    if (n.pendingReinforcements < 0 || n.pendingReinforcements > o.pendingReinforcements) bad.push("reinforcements can only be used up, never added");
    if (o.attackUsed && !n.attackUsed) bad.push("attackUsed cannot be reset mid-turn");
    if (o.battle && n.battle && !sameJson(o.battle, n.battle)) bad.push("the battle in progress cannot be changed");
  }

  // Winning
  if (n.status === "finished") {
    if (n.winnerId !== o.currentPlayerId || held(n, n.winnerId) !== 10) bad.push("a win requires holding all 10 countries");
  } else if (n.winnerId !== null) bad.push("an active game has no winner");

  return bad;
}
