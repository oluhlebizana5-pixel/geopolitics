"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { friendlyError } from "@/lib/firebaseService";
import { listMyGameRecords } from "@/lib/statsService";
import { GameRecord, Outcome, outcomeOf } from "@/lib/stats";
import { btnPrimary, btnSecondary, cardLink } from "@/lib/ui";
import PageBar, { usePagination } from "@/components/PageBar";
import Flag from "@/components/Flag";
import { playerFlagCode } from "@/lib/flags";

type Filter = "all" | Outcome;

const LABELS: Record<Outcome, { text: string; className: string }> = {
  playing: { text: "In progress", className: "text-foreground" },
  won: { text: "Won 🏆", className: "text-foreground" },
  lost: { text: "Lost", className: "text-muted-foreground" },
};

export default function MyGamesPage() {
  const { user, loading } = useAuth();
  const [records, setRecords] = useState<GameRecord[] | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const filtered = (records ?? []).filter((r) => filter === "all" || outcomeOf(r) === filter);
  const { page, setPage, pageCount, slice: shown } = usePagination(filtered, 6);

  useEffect(() => {
    if (!user) return;
    listMyGameRecords(user.uid)
      .then(setRecords)
      .catch((e) => setError(friendlyError(e)));
  }, [user]);

  if (loading) return <main className="p-6">Loading...</main>;

  if (!user) {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <h1 className="mb-2 text-2xl font-bold">My games</h1>
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

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "playing", label: "In progress" },
    { key: "won", label: "Won" },
    { key: "lost", label: "Lost" },
  ];

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">My games</h1>
        <Link href="/new" className={btnPrimary}>
          Start a new game
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => {
              setFilter(f.key);
              setPage(1);
            }}
            className={`rounded-full border px-3 py-1 ${
              filter === f.key ? "border-foreground/30 bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm font-semibold">{error}</p>}
      {!records && !error && <p className="text-muted-foreground">Loading your games...</p>}
      {records && filtered.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {records.length === 0 ? "You have not started a game yet." : "No games match this filter."}
        </p>
      )}

      <ul className="space-y-2">
        {shown.map((r) => {
          const label = LABELS[outcomeOf(r)];
          return (
            <li key={r.id}>
              <Link
                href={`/game/${r.id}`}
                className={`flex items-center gap-3 ${cardLink}`}
              >
                <Flag code={playerFlagCode(r.humanPlayerId)} size={36} />
                <span className="min-w-0 flex-1">
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
      <PageBar page={page} pageCount={pageCount} onChange={setPage} />
    </main>
  );
}
