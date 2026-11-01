"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { COUNTRIES, pickOpponents } from "@/lib/countriesData";
import { Game } from "@/lib/classes/Game";
import { NpcStrategy, NpcEvent } from "@/lib/classes/NpcStrategy";
import { addLogEntries, createGame, friendlyError, loadGame, logOut, saveGame } from "@/lib/firebaseService";

// TEMPORARY page to prove signup, saving and loading work. We delete it later.
export default function TestFirebasePage() {
  const { user, loading } = useAuth();
  const [gameId, setGameId] = useState("");
  const [output, setOutput] = useState("Nothing yet.");
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<string>) {
    setBusy(true);
    try {
      setOutput(await fn());
    } catch (err) {
      setOutput("ERROR: " + friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  const describe = (game: Game) =>
    `Round ${game.round} | status ${game.status} | current player: ${game.currentPlayer.name}\n` +
    game.allCountries.map((c) => `${c.name}: ${c.soldiers} soldiers (owner ${c.ownerId})`).join("\n");

  const step1 = () =>
    run(async () => {
      if (!user) throw new Error("Log in first.");
      const human = COUNTRIES.find((c) => c.code === "ZAF")!;
      const game = Game.create(user.displayName ?? "Player", human, pickOpponents(human.code));
      const id = await createGame({ uid: user.uid, name: user.displayName ?? "Player" }, game);
      setGameId(id);
      return `Saved new game ${id}\n\n` + describe(game);
    });

  const step2 = () =>
    run(async () => {
      if (!gameId) throw new Error("Do step 1 first.");
      const loaded = await loadGame(gameId);
      if (!loaded) throw new Error("Game not found.");
      const events: NpcEvent[] = [];
      for (const e of new NpcStrategy().playTurn(loaded.game)) events.push(e);
      await saveGame(gameId, loaded.game);
      await addLogEntries(gameId, events);
      return `Played one turn and saved. Decisions:\n` + events.filter((e) => e.type !== "battle_round").map((e) => `- ${e.message}`).join("\n");
    });

  const step3 = () =>
    run(async () => {
      if (!gameId) throw new Error("Do step 1 first.");
      const loaded = await loadGame(gameId);
      if (!loaded) throw new Error("Game not found.");
      return `LOADED from Firestore (owner: ${loaded.meta.ownerName})\n\n` + describe(loaded.game);
    });

  if (loading) return <main className="p-6">Loading...</main>;

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-2 text-2xl font-bold">Firebase test</h1>
      {user ? (
        <p className="mb-4 text-sm">
          Logged in as {user.displayName} ({user.email}){" "}
          <button className="underline" onClick={() => logOut()}>Log out</button>
        </p>
      ) : (
        <p className="mb-4 text-sm">
          Not logged in. <Link className="underline" href="/signup">Sign up</Link> or <Link className="underline" href="/login">log in</Link>.
        </p>
      )}
      <div className="mb-4 flex flex-wrap gap-2">
        <button disabled={busy || !user} onClick={step1} className="rounded bg-emerald-600 px-3 py-2 disabled:opacity-40">1. Create and save a game</button>
        <button disabled={busy || !user} onClick={step2} className="rounded bg-sky-600 px-3 py-2 disabled:opacity-40">2. Play one turn and save</button>
        <button disabled={busy} onClick={step3} className="rounded bg-violet-600 px-3 py-2 disabled:opacity-40">3. Load it back</button>
      </div>
      {gameId && (
        <p className="mb-2 text-sm">
          Game id: <code>{gameId}</code>
        </p>
      )}
      <pre className="whitespace-pre-wrap rounded bg-slate-800 p-3 text-sm">{output}</pre>
    </main>
  );
}