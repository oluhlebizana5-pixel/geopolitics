"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { friendlyError } from "@/lib/firebaseService";
import { listMyGameRecords } from "@/lib/statsService";
import { GameRecord, Outcome, outcomeOf } from "@/lib/stats";
import { btnPrimary, btnSecondary, cardLink } from "@/lib/ui";

type Filter = "all" | Outcome;

const LABELS: Record<Outcome, { text: string; className: string }> = {
  playing: { text: "In progress", className: "text-emerald-700 dark:text-emerald-300" },
  won: { text: "Won 🏆", className: "text-amber-700 dark:text-amber-300" },
  lost: { text: "Lost", className: "text-rose-700 dark:text-rose-300" },
};

export default function MyGamesPage() {
  const { user, loading } = useAuth();
  const [records, setRecords] = useState<GameRecord[] | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    if (!user) return;
    listMyGameRecords(user.uid)
      .then(setRecords)
      .catch((e) => setError(friendlyError(e)));
  }, [user]);

  if (loading) return <main className="p-6">Loading...</main>;

  if (!user) {
    return (
      <main className="mx-auto max-w-md p-6">
        <h1 className="mb-2 text-2xl font-bold text-accent-foreground">My games</h1>
        <p className="mb-4 text-foreground">Log in to see the games you have played.</p>
        <div className="flex gap-3">
          <Link href="/login" className={btnSecondary}>
            Log in
          </Link>
          <Link href="/signup" className={btnPrimary}>
            Sign up
          </Link>
        </div>
      </main>
    );
  }

  const shown = (records ?? []).filter((r) => filter === "all" || outcomeOf(r) === filter);
  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "playing", label: "In progress" },
    { key: "won", label: "Won" },
    { key: "lost", label: "Lost" },
  ];

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-accent-foreground">My games</h1>
        <Link href="/new" className={btnPrimary}>
          Start a new game
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full border px-3 py-1 ${
              filter === f.key ? "border-foreground bg-accent text-accent-foreground" : "border-border hover:bg-muted"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {!records && !error && <p className="text-muted-foreground">Loading your games...</p>}
      {records && shown.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {records.length === 0 ? "You have not started a game yet." : "No games match this filter."}
        </p>
      )}

      <ul className="space-y-2">
        {shown.map((r) => {
          const label = LABELS[outcomeOf(r)];
          return (
            <li key={r.id}>
              <Link href={`/game/${r.id}`} className={`flex items-center justify-between ${cardLink}`}>
                <span>
                  <span className="font-semibold">Game {r.id.slice(0, 6)}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    Round {r.round} · {r.countriesHeld} of 10 countries
                    {r.updatedAtMs ? ` · ${new Date(r.updatedAtMs).toLocaleString()}` : ""}
                  </span>
                </span>
                <span className={`text-sm font-semibold ${label.className}`}>{label.text}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}