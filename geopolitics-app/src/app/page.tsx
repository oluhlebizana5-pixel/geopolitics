"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { btnPrimary, cardLink, link } from "@/lib/ui";
import { GameSummary, friendlyError, listMyGames, listRecentGames } from "@/lib/firebaseService";

function GameList({ games, empty }: { games: GameSummary[]; empty: string }) {
  if (games.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="space-y-2">
      {games.map((g) => (
        <li key={g.id}>
          <Link href={`/game/${g.id}`} className={`flex items-center justify-between ${cardLink}`}>
            <span>
              <span className="font-semibold">{g.ownerName}&rsquo;s game</span>
              <span className="ml-2 text-xs text-muted-foreground">
                Round {g.round} · {g.countriesHeld} of 10 countries
              </span>
            </span>
            <span className={`text-xs ${g.status === "finished" ? "text-amber-700 dark:text-amber-300" : "text-emerald-700 dark:text-emerald-300"}`}>
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
        <h1 className="text-4xl font-bold text-accent-foreground">🌍 Geopolitics</h1>
        <p className="text-foreground">
          Ten countries. Nine AI rivals. Roll the dice, take territory and conquer the world.
        </p>
        <Link href="/new" className={`${btnPrimary} inline-block px-6 py-3`}>
          Start a new game
        </Link>
        {!loading && !user && (
          <p className="text-sm text-muted-foreground">
            <Link href="/login" className={link}>
              Log in
            </Link>{" "}
            or{" "}
            <Link href="/signup" className={link}>
              sign up
            </Link>{" "}
            to play. Anyone can watch.
          </p>
        )}
      </section>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {user && (
        <section>
          <h2 className="mb-2 text-lg font-semibold text-accent-foreground">Your games</h2>
          <GameList games={mine} empty="You have not started a game yet." />
        </section>
      )}

      <section>
        <h2 className="mb-2 text-lg font-semibold text-accent-foreground">Recent games (anyone can watch)</h2>
        <GameList games={recent} empty="No games yet. Be the first!" />
      </section>
    </main>
  );
}