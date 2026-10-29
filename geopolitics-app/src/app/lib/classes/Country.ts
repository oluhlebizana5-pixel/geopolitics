export class Country {
  private _ownerId: string;
  private _soldiers: number;

  constructor(
    public readonly code: string,
    public readonly name: string,
    public readonly population: number,
    ownerId: string,
    soldiers: number
  ) {
    this._ownerId = ownerId;
    this._soldiers = soldiers;
  }

  get ownerId(): string {
    return this._ownerId;
  }

  get soldiers(): number {
    return this._soldiers;
  }

  addSoldiers(n: number): void {
    if (!Number.isInteger(n) || n < 0) throw new Error("Invalid soldier count.");
    this._soldiers += n;
  }

  removeSoldiers(n: number): void {
    if (!Number.isInteger(n) || n < 0 || n > this._soldiers) {
      throw new Error("Invalid soldier count.");
    }
    this._soldiers -= n;
  }

  changeOwner(newOwnerId: string): void {
    this._ownerId = newOwnerId;
  }

  // Plain object, ready to save to Firestore later
  toJSON() {
    return {
      code: this.code,
      name: this.name,
      population: this.population,
      ownerId: this._ownerId,
      soldiers: this._soldiers,
    };
  }
}