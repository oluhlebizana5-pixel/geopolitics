"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { GameSummary, friendlyError, listMyGames, listRecentGames } from "@/lib/firebaseService";

function GameList({ games, empty }: { games: GameSummary[]; empty: string }) {
  if (games.length === 0) return <p className="text-sm text-slate-400">{empty}</p>;
  return (
    <ul className="space-y-2">
      {games.map((g) => (
        <li key={g.id}>
          <Link
            href={`/game/${g.id}`}
            className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/60 p-3 hover:border-slate-500"
          >
            <span>
              <span className="font-semibold">{g.ownerName}&rsquo;s game</span>
              <span className="ml-2 text-xs text-slate-400">
                Round {g.round} · {g.countriesHeld} of 10 countries
              </span>
            </span>
            <span className={`text-xs ${g.status === "finished" ? "text-amber-300" : "text-emerald-300"}`}>
              {g.status === "finished" ? "Finished" : "In progress"}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function HomePage() {
  const { user, loading } = useAuth();
  const [recent, setRecent] = useState<GameSummary[]>([]);
  const [mine, setMine] = useState<GameSummary[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    listRecentGames(10)
      .then(setRecent)
      .catch((e) => setError(friendlyError(e)));
  }, []);

  useEffect(() => {
    if (!user) return;
    listMyGames(user.uid)
      .then(setMine)
      .catch((e) => setError(friendlyError(e)));
  }, [user]);

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-6">
      <section className="space-y-3 text-center">
        <h1 className="text-4xl font-bold">🌍 Geopolitics</h1>
        <p className="text-slate-300">
          Ten countries. Nine AI rivals. Roll the dice, take territory and conquer the world.
        </p>
        <Link href="/new" className="inline-block rounded bg-emerald-600 px-6 py-3 font-semibold hover:bg-emerald-500">
          Start a new game
        </Link>
        {!loading && !user && (
          <p className="text-sm text-slate-400">
            <Link href="/login" className="underline">
              Log in
            </Link>{" "}
            or{" "}
            <Link href="/signup" className="underline">
              sign up
            </Link>{" "}
            to play. Anyone can watch.
          </p>
        )}
      </section>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {user && (
        <section>
          <h2 className="mb-2 text-lg font-semibold">Your games</h2>
          <GameList games={mine} empty="You have not started a game yet." />
        </section>
      )}

      <section>
        <h2 className="mb-2 text-lg font-semibold">Recent games (anyone can watch)</h2>
        <GameList games={recent} empty="No games yet. Be the first!" />
      </section>
    </main>
  );
}