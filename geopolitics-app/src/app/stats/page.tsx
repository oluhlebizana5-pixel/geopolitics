"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { friendlyError } from "@/lib/firebaseService";
import { countGames, listMyGameRecords, listRecentGameRecords } from "@/lib/statsService";
import { PlatformStats, PlayerStats, computePlatformStats, computeStats } from "@/lib/stats";
import { card, link } from "@/lib/ui";

const pct = (v: number | null) => (v === null ? "–" : `${Math.round(v * 100)}%`);
const num = (v: number | null, digits = 1) => (v === null ? "–" : v.toFixed(digits).replace(/\.0$/, ""));

function Tile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={card}>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function ResultBar({ won, lost, playing }: { won: number; lost: number; playing: number }) {
  const total = won + lost + playing;
  if (total === 0) return null;
  const w = (n: number) => `${(n / total) * 100}%`;
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-muted">
        <div className="bg-amber-500" style={{ width: w(won) }} title={`Won: ${won}`} />
        <div className="bg-rose-500" style={{ width: w(lost) }} title={`Lost: ${lost}`} />
        <div className="bg-emerald-500" style={{ width: w(playing) }} title={`In progress: ${playing}`} />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        <span className="text-amber-700 dark:text-amber-300">■ won {won}</span> · <span className="text-rose-700 dark:text-rose-300">■ lost {lost}</span> ·{" "}
        <span className="text-emerald-700 dark:text-emerald-300">■ in progress {playing}</span>
      </p>
    </div>
  );
}

export default function StatsPage() {
  const { user, loading } = useAuth();
  const [mine, setMine] = useState<PlayerStats | null>(null);
  const [platform, setPlatform] = useState<PlatformStats | null>(null);
  const [totals, setTotals] = useState<{ total: number; finished: number } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([listRecentGameRecords(100), countGames()])
      .then(([recent, counts]) => {
        setPlatform(computePlatformStats(recent));
        setTotals(counts);
      })
      .catch((e) => setError(friendlyError(e)));
  }, []);

  useEffect(() => {
    if (!user) return;
    listMyGameRecords(user.uid)
      .then((records) => setMine(computeStats(records)))
      .catch((e) => setError(friendlyError(e)));
  }, [user]);

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-6">
      <h1 className="text-2xl font-bold text-accent-foreground">📊 Stats</h1>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {/* Your stats */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-accent-foreground">Your stats</h2>
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : !user ? (
          <p className="text-sm text-foreground">
            <Link href="/login" className={link}>
              Log in
            </Link>{" "}
            to see your own statistics.
          </p>
        ) : !mine ? (
          <p className="text-muted-foreground">Loading your stats...</p>
        ) : mine.total === 0 ? (
          <p className="text-sm text-muted-foreground">
            No games yet.{" "}
            <Link href="/new" className={link}>
              Start one
            </Link>{" "}
            to build your stats.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Tile label="Games played" value={mine.total} />
              <Tile label="Wins" value={mine.won} />
              <Tile label="Win rate" value={pct(mine.winRate)} />
              <Tile label="Most countries held" value={mine.mostCountriesHeld} />
              <Tile label="Fastest win (round)" value={num(mine.fastestWinRound, 0)} />
              <Tile label="Avg rounds per win" value={num(mine.avgRoundsOfWins)} />
              <Tile label="Losses" value={mine.lost} />
              <Tile label="In progress" value={mine.playing} />
            </div>
            <ResultBar won={mine.won} lost={mine.lost} playing={mine.playing} />
          </>
        )}
      </section>

      {/* Platform stats */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-accent-foreground">Whole platform</h2>
        {!platform || !totals ? (
          !error && <p className="text-muted-foreground">Loading platform stats...</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Tile label="Games started" value={totals.total} />
              <Tile label="Games finished" value={totals.finished} />
              <Tile label="Players (recent games)" value={platform.players} />
              <Tile label="Win rate (recent games)" value={pct(platform.winRate)} />
            </div>
            <p className="text-xs text-muted-foreground">
              Win rate and averages use the {platform.sampleSize} most recent games. Average length:{" "}
              {num(platform.avgRounds)} rounds.
            </p>

            <h3 className="pt-2 text-sm font-semibold">Top players (by wins)</h3>
            {platform.leaderboard.length === 0 ? (
              <p className="text-sm text-muted-foreground">No wins yet. Be the first to conquer the world!</p>
            ) : (
              <ol className="space-y-1 text-sm">
                {platform.leaderboard.map((row, i) => (
                  <li key={row.name + i} className="flex justify-between rounded-lg border border-border bg-card px-3 py-2">
                    <span>
                      {i + 1}. {row.name}
                    </span>
                    <span className="text-foreground">
                      {row.wins} win{row.wins === 1 ? "" : "s"} · {row.games} game{row.games === 1 ? "" : "s"}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
      </section>
    </main>
  );
}