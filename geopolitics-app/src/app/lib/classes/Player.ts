export class Player {
  private _eliminated = false;

  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly isNpc: boolean
  ) {}

  get eliminated(): boolean {
    return this._eliminated;
  }

  eliminate(): void {
    this._eliminated = true;
  }

  toJSON() {
    return { id: this.id, name: this.name, isNpc: this.isNpc, eliminated: this._eliminated };
  }
}