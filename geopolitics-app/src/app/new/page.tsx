"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { COUNTRIES, pickOpponents } from "@/lib/countriesData";
import { Game } from "@/lib/classes/Game";
import { soldiersForPopulation } from "@/lib/classes/rules";
import { banner, btnPrimary, btnSecondary, input } from "@/lib/ui";
import { createGame, friendlyError } from "@/lib/firebaseService";

const SORTED = [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));

export default function NewGamePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [code, setCode] = useState("ZAF");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (loading) return <main className="p-6">Loading...</main>;

  if (!user) {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <h1 className="mb-2 text-2xl font-bold">Start a new game</h1>
        <p className="mb-4 text-foreground">You need an account to play. Anyone can watch games without one.</p>
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

  const chosen = COUNTRIES.find((c) => c.code === code) ?? SORTED[0];

  async function start() {
    if (!user) return;
    setBusy(true);
    setError("");
    try {
      const name = user.displayName ?? "Player";
      const game = Game.create(name, chosen, pickOpponents(chosen.code));
      const id = await createGame({ uid: user.uid, name }, game);
      router.push(`/game/${id}`);
    } catch (e) {
      setError(friendlyError(e));
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <div className="space-y-4 rounded-[2rem] border border-border bg-card p-8 shadow-sm">
      <h1 className="text-2xl font-bold">Start a new game</h1>
      <p className="text-muted-foreground">
        Pick your country. Nine other countries are chosen at random to be NPC rivals. Conquer all ten to win.
      </p>
      <label className="block text-sm text-foreground">
        Your country
        <select className={`mt-1 ${input}`} value={code} onChange={(e) => setCode(e.target.value)}>
          {SORTED.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <p className={banner.note}>
        {chosen.name} has about {(chosen.population / 1_000_000).toLocaleString("en", { maximumFractionDigits: 1 })} million
        people, so you start with <b>{soldiersForPopulation(chosen.population)}</b> soldier
        {soldiersForPopulation(chosen.population) === 1 ? "" : "s"}.
      </p>
      {error && <p className="text-sm font-semibold">{error}</p>}
      <button disabled={busy} onClick={start} className={`${btnPrimary} h-12 w-full text-base`}>
        {busy ? "Creating game..." : "Start game"}
      </button>
    </div>
    </main>
  );
}
