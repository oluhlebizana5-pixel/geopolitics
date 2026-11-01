import { Country } from "./Country";
import { Player } from "./Player";
import { BattleEngine, RoundResult, Rng } from "./BattleEngine";
import { soldiersForPopulation, conquestReward, reinforcementsFor } from "./rules";

export interface CountryData {
  code: string;
  name: string;
  population: number;
}

export type GameStatus = "active" | "finished";
export type AttackOutcome = "continue" | "conquered" | "attacker_exhausted";

export interface AttackResult {
  round: RoundResult;
  outcome: AttackOutcome;
  soldiersGained: number;
  eliminatedPlayerId: string | null;
}

export interface Battle {
  attackerCode: string;
  defenderCode: string;
  defenderStartSoldiers: number; // used for the conquest reward
}

function shuffle<T>(items: T[], rng: Rng): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class Game {
  private _round = 1;
  private _currentIndex = 0;
  private _status: GameStatus = "active";
  private _winnerId: string | null = null;
  private _pendingReinforcements = 0;
  private _battle: Battle | null = null;
  private _attackUsed = false;
  private engine: BattleEngine;

  constructor(
    private players: Player[],
    private countries: Country[],
    private turnOrder: string[],
    rng: Rng = Math.random
  ) {
    this.engine = new BattleEngine(rng);
    this.startTurn();
  }

  // ---------- Setup ----------
  // humanCountry = the player's pick, otherCountries = the 9 random ones
  static create(
    humanName: string,
    humanCountry: CountryData,
    otherCountries: CountryData[],
    rng: Rng = Math.random
  ): Game {
    if (otherCountries.length !== 9) throw new Error("Exactly 9 other countries are required.");
    const all = [humanCountry, ...otherCountries];
    if (new Set(all.map((c) => c.code)).size !== 10) {
      throw new Error("Countries must be unique.");
    }

    const players: Player[] = [];
    const countries: Country[] = [];
    all.forEach((c, i) => {
      const id = `player-${c.code}`;
      players.push(new Player(id, i === 0 ? humanName : `${c.name} (NPC)`, i !== 0));
      countries.push(
        new Country(c.code, c.name, c.population, id, soldiersForPopulation(c.population))
      );
    });

    // Random first player and order
    const order = shuffle(players.map((p) => p.id), rng);
    return new Game(players, countries, order, rng);
  }

  // ---------- Read-only state ----------
  get round(): number { return this._round; }
  get status(): GameStatus { return this._status; }
  get winnerId(): string | null { return this._winnerId; }
  get pendingReinforcements(): number { return this._pendingReinforcements; }
  get battleInProgress(): boolean { return this._battle !== null; }
  get attackUsed(): boolean { return this._attackUsed; }
  get allCountries(): Country[] { return [...this.countries]; }
  get allPlayers(): Player[] { return [...this.players]; }
  get order(): string[] { return [...this.turnOrder]; }

  get currentPlayer(): Player {
    return this.getPlayer(this.turnOrder[this._currentIndex]);
  }

  getPlayer(id: string): Player {
    const p = this.players.find((x) => x.id === id);
    if (!p) throw new Error(`Unknown player ${id}`);
    return p;
  }

  getCountry(code: string): Country {
    const c = this.countries.find((x) => x.code === code);
    if (!c) throw new Error(`Unknown country ${code}`);
    return c;
  }

  countriesOf(playerId: string): Country[] {
    return this.countries.filter((c) => c.ownerId === playerId);
  }

  // ---------- Turn handling ----------
  // From round 2 onward: 2 new soldiers per country held
  private startTurn(): void {
    const held = this.countriesOf(this.currentPlayer.id).length;
    this._pendingReinforcements = reinforcementsFor(held, this._round);
  }

  private requireActive(): void {
    if (this._status !== "active") throw new Error("The game is finished.");
  }

  private requireOwned(code: string): Country {
    const c = this.getCountry(code);
    if (c.ownerId !== this.currentPlayer.id) {
      throw new Error(`${c.name} is not controlled by the current player.`);
    }
    return c;
  }

  // Place some of the pending reinforcements on one of your countries
  allocateReinforcements(code: string, amount: number): void {
    this.requireActive();
    if (this._battle) throw new Error("Cannot allocate during an attack.");
    if (!Number.isInteger(amount) || amount < 1) throw new Error("Invalid amount.");
    if (amount > this._pendingReinforcements) {
      throw new Error("Not enough reinforcements remaining.");
    }
    this.requireOwned(code).addSoldiers(amount);
    this._pendingReinforcements -= amount;
  }

  // Move soldiers between your own countries (not during an attack)
  transfer(fromCode: string, toCode: string, amount: number): void {
    this.requireActive();
    if (this._battle) throw new Error("Cannot transfer while an attack is in progress.");
    if (this._pendingReinforcements > 0) throw new Error("Allocate your reinforcements first.");
    if (fromCode === toCode) throw new Error("Choose two different countries.");
    if (!Number.isInteger(amount) || amount < 1) throw new Error("Invalid amount.");

    const from = this.requireOwned(fromCode);
    const to = this.requireOwned(toCode);
    if (from.soldiers - amount < 1) {
      throw new Error("A country must keep at least 1 soldier.");
    }
    from.removeSoldiers(amount);
    to.addSoldiers(amount);
  }

  // Resolve ONE round of dice. Call repeatedly until outcome is not "continue",
  // or call endTurn() to stop the attack.
  attack(attackerCode: string, defenderCode: string): AttackResult {
    this.requireActive();
    if (this._pendingReinforcements > 0) throw new Error("Allocate your reinforcements first.");

    const attacker = this.requireOwned(attackerCode);
    const defender = this.getCountry(defenderCode);
    if (defender.ownerId === this.currentPlayer.id) {
      throw new Error("You cannot attack your own country.");
    }

    if (!this._battle) {
      if (this._attackUsed) throw new Error("Only one attack per turn.");
      this._battle = {
        attackerCode,
        defenderCode,
        defenderStartSoldiers: defender.soldiers,
      };
    } else if (
      this._battle.attackerCode !== attackerCode ||
      this._battle.defenderCode !== defenderCode
    ) {
      throw new Error("An attack is already in progress against a different country.");
    }

    if (!BattleEngine.canAttack(attacker.soldiers)) {
      this._battle = null;
      throw new Error("You need at least 2 soldiers to attack.");
    }

    const round = this.engine.resolveRound(attacker.soldiers, defender.soldiers);
    attacker.removeSoldiers(round.attackerLosses);
    defender.removeSoldiers(round.defenderLosses);

    let outcome: AttackOutcome = "continue";
    let soldiersGained = 0;
    let eliminatedPlayerId: string | null = null;

    if (defender.soldiers === 0) {
      // Conquered
      outcome = "conquered";
      const previousOwnerId = defender.ownerId;
      soldiersGained = conquestReward(this._battle.defenderStartSoldiers);
      defender.changeOwner(this.currentPlayer.id);
      defender.addSoldiers(soldiersGained);
      this._battle = null;
      this._attackUsed = true;

      if (this.countriesOf(previousOwnerId).length === 0) {
        this.getPlayer(previousOwnerId).eliminate();
        eliminatedPlayerId = previousOwnerId;
      }
      this.checkWin();
    } else if (attacker.soldiers <= 1) {
      // Attacker is down to 1 soldier: attack ends, no conquest
      outcome = "attacker_exhausted";
      this._battle = null;
      this._attackUsed = true;
    }

    return { round, outcome, soldiersGained, eliminatedPlayerId };
  }

  private checkWin(): void {
    const current = this.currentPlayer;
    if (this.countriesOf(current.id).length === this.countries.length) {
      this._status = "finished";
      this._winnerId = current.id;
    }
  }

  // Ends the turn. Also used to stop an attack or skip the turn.
  endTurn(): void {
    this.requireActive();
    if (this._pendingReinforcements > 0) {
      throw new Error("Allocate all reinforcements before ending your turn.");
    }
    this._battle = null;
    this._attackUsed = false;

    // Next non-eliminated player; wrapping around starts a new round
    const n = this.turnOrder.length;
    let idx = this._currentIndex;
    do {
      idx++;
      if (idx >= n) {
        idx = 0;
        this._round++;
      }
    } while (this.getPlayer(this.turnOrder[idx]).eliminated);

    this._currentIndex = idx;
    this.startTurn();
  }

  // Plain snapshot, ready to store in Firestore later
  // Snapshot of the whole game, ready to store in Firestore
  toJSON() {
    return {
      status: this._status,
      round: this._round,
      currentPlayerId: this.currentPlayer.id,
      turnOrder: this.turnOrder,
      winnerId: this._winnerId,
      pendingReinforcements: this._pendingReinforcements,
      attackUsed: this._attackUsed,
      battle: this._battle, // saved so an attack survives closing the browser
      players: this.players.map((p) => p.toJSON()),
      countries: this.countries.map((c) => c.toJSON()),
    };
  }

  // Rebuild a Game from a saved snapshot
  static fromJSON(data: GameSnapshot, rng: Rng = Math.random): Game {
    const players = data.players.map((p) => {
      const player = new Player(p.id, p.name, p.isNpc);
      if (p.eliminated) player.eliminate();
      return player;
    });
    const countries = data.countries.map(
      (c) => new Country(c.code, c.name, c.population, c.ownerId, c.soldiers)
    );
    const game = new Game(players, countries, data.turnOrder, rng);
    game._round = data.round;
    game._currentIndex = data.turnOrder.indexOf(data.currentPlayerId);
    game._status = data.status;
    game._winnerId = data.winnerId;
    game._pendingReinforcements = data.pendingReinforcements;
    game._attackUsed = data.attackUsed;
    game._battle = data.battle;
    return game;
  }
}

export type GameSnapshot = ReturnType<Game["toJSON"]>;