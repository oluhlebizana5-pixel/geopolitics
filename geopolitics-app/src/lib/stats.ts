// Pure statistics logic (no Firebase in here, so it is easy to test).

export interface GameRecord {
  id: string;
  ownerUid: string;
  ownerName: string;
  status: "active" | "finished";
  round: number;
  humanPlayerId: string;
  winnerId: string | null;
  humanEliminated: boolean;
  countriesHeld: number;
  updatedAtMs: number;
}

// Turns a Firestore game document into a small record
export function recordFromData(id: string, data: Record<string, unknown>): GameRecord {
  const players = Array.isArray(data.players) ? (data.players as { id?: string; eliminated?: boolean }[]) : [];
  const countries = Array.isArray(data.countries) ? (data.countries as { ownerId?: string }[]) : [];
  const humanPlayerId = typeof data.humanPlayerId === "string" ? data.humanPlayerId : "";
  const updated = data.updatedAt as { toMillis?: () => number } | undefined;
  return {
    id,
    ownerUid: String(data.ownerUid ?? ""),
    ownerName: String(data.ownerName ?? "Player"),
    status: data.status === "finished" ? "finished" : "active",
    round: typeof data.round === "number" ? data.round : 1,
    humanPlayerId,
    winnerId: typeof data.winnerId === "string" ? data.winnerId : null,
    humanEliminated: players.some((p) => p.id === humanPlayerId && p.eliminated === true),
    countriesHeld: countries.filter((c) => c.ownerId === humanPlayerId).length,
    updatedAtMs: updated?.toMillis?.() ?? 0,
  };
}

export type Outcome = "won" | "lost" | "playing";

export function outcomeOf(r: GameRecord): Outcome {
  if (r.status === "finished") return r.winnerId === r.humanPlayerId ? "won" : "lost";
  return r.humanEliminated ? "lost" : "playing";
}

export interface PlayerStats {
  total: number;
  won: number;
  lost: number;
  playing: number;
  winRate: number | null; // 0 to 1, over games that have a result
  fastestWinRound: number | null;
  avgRoundsOfWins: number | null;
  mostCountriesHeld: number;
}

export function computeStats(records: GameRecord[]): PlayerStats {
  const wins = records.filter((r) => outcomeOf(r) === "won");
  const lost = records.filter((r) => outcomeOf(r) === "lost").length;
  const decided = wins.length + lost;
  return {
    total: records.length,
    won: wins.length,
    lost,
    playing: records.length - decided,
    winRate: decided > 0 ? wins.length / decided : null,
    fastestWinRound: wins.length ? Math.min(...wins.map((r) => r.round)) : null,
    avgRoundsOfWins: wins.length ? wins.reduce((s, r) => s + r.round, 0) / wins.length : null,
    mostCountriesHeld: records.reduce((m, r) => Math.max(m, r.countriesHeld), 0),
  };
}

export interface LeaderboardRow {
  name: string;
  wins: number;
  games: number;
}

export function leaderboard(records: GameRecord[], top = 5): LeaderboardRow[] {
  const byPlayer = new Map<string, LeaderboardRow>();
  for (const r of records) {
    const key = r.ownerUid || r.ownerName;
    const row = byPlayer.get(key) ?? { name: r.ownerName, wins: 0, games: 0 };
    row.games++;
    if (outcomeOf(r) === "won") row.wins++;
    byPlayer.set(key, row);
  }
  return [...byPlayer.values()]
    .filter((row) => row.wins > 0)
    .sort((a, b) => b.wins - a.wins || a.games - b.games || a.name.localeCompare(b.name))
    .slice(0, top);
}

export interface PlatformStats {
  sampleSize: number;
  players: number;
  winRate: number | null;
  avgRounds: number | null;
  leaderboard: LeaderboardRow[];
}

export function computePlatformStats(records: GameRecord[]): PlatformStats {
  const s = computeStats(records);
  return {
    sampleSize: records.length,
    players: new Set(records.map((r) => r.ownerUid || r.ownerName)).size,
    winRate: s.winRate,
    avgRounds: records.length ? records.reduce((sum, r) => sum + r.round, 0) / records.length : null,
    leaderboard: leaderboard(records),
  };
}