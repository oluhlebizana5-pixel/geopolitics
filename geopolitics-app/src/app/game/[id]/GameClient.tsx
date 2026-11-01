"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { useGameSession } from "@/lib/useGameSession";
import Board from "@/components/Board";
import BattlePanel from "@/components/BattlePanel";
import HumanPanel from "@/components/HumanPanel";
import LogPanel from "@/components/LogPanel";

export default function GameClient() {
  const params = useParams<{ id: string }>();
  const gameId = params.id;
  const { user } = useAuth();
  const s = useGameSession(gameId);

  const [attackerCode, setAttackerCode] = useState("");
  const [targetCode, setTargetCode] = useState("");
  const [copied, setCopied] = useState(false);

  if (s.notFound) {
    return (
      <main className="mx-auto max-w-xl p-6">
        <h1 className="mb-2 text-xl font-bold">Game not found</h1>
        <p className="mb-4 text-slate-400">This link may be wrong, or the game no longer exists.</p>
        <Link href="/" className="underline">
          Back to home
        </Link>
      </main>
    );
  }
  if (s.error && !s.loaded) {
    return <main className="p-6 text-red-400">Could not load the game: {s.error}</main>;
  }
  if (!s.loaded) return <main className="p-6">Loading game...</main>;

  const { game, meta } = s.loaded;
  const human = game.getPlayer(meta.humanPlayerId);
  const current = game.currentPlayer;
  const winner = game.winnerId ? game.getPlayer(game.winnerId) : null;
  const lastBattle = [...s.log].reverse().find((e) => e.type === "battle_round") ?? null;
  const fighting = lastBattle?.attackerCode && lastBattle.defenderCode ? [lastBattle.attackerCode, lastBattle.defenderCode] : [];

  // Clicking a country on the board picks attacker (yours) or target (an enemy)
  const canPick = s.canPlay && !game.battleInProgress && !game.attackUsed && game.pendingReinforcements === 0;
  const handleCountryClick = (code: string) => {
    const c = game.getCountry(code);
    if (c.ownerId === meta.humanPlayerId) {
      if (c.soldiers >= 2) setAttackerCode(code);
    } else {
      setTargetCode(code);
    }
  };

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard not available */
    }
  }

  return (
    <main className="mx-auto max-w-7xl space-y-4 p-4">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">
            {meta.ownerName}&rsquo;s game <span className="text-sm font-normal text-slate-400">· Round {game.round}</span>
          </h1>
          <p className="text-sm text-slate-300">
            {game.status === "finished"
              ? "Game over"
              : s.npcRunning
              ? `🤖 ${current.name} is playing…`
              : current.id === meta.humanPlayerId
              ? "It is your turn"
              : `Waiting for ${current.name}`}
          </p>
        </div>
        <div className="flex gap-2">
          {s.isOwner && s.npcRunning && (
            <button
              onClick={() => s.setFastForward(true)}
              disabled={s.fast}
              className="rounded bg-violet-600 px-3 py-2 text-sm font-semibold disabled:opacity-60"
            >
              {s.fast ? "⏩ Fast-forwarding…" : "⏩ Fast-forward"}
            </button>
          )}
          <button onClick={copyLink} className="rounded bg-slate-700 px-3 py-2 text-sm hover:bg-slate-600">
            {copied ? "✔ Link copied" : "🔗 Share link"}
          </button>
        </div>
      </header>

      {/* Banners */}
      {winner && (
        <div className="rounded-lg border border-amber-400 bg-amber-950/60 p-3 text-center font-semibold text-amber-200">
          {winner.id === meta.humanPlayerId ? "🏆 You conquered the world!" : `👑 ${winner.name} conquered the world.`}
        </div>
      )}
      {!winner && human.eliminated && (
        <div className="rounded-lg border border-slate-500 bg-slate-800 p-3 text-center text-sm">
          You have been eliminated. You can keep watching, or use fast-forward to see how the game ends.
        </div>
      )}
      {!s.isOwner && (
        <div className="rounded-lg border border-sky-500 bg-sky-950/50 p-3 text-sm">
          👀 You are watching this game live. Only {meta.ownerName} can play.{" "}
          {!user && (
            <>
              <Link href="/login" className="underline">
                Log in
              </Link>{" "}
              or{" "}
              <Link href="/signup" className="underline">
                sign up
              </Link>{" "}
              to start your own game.
            </>
          )}
          {user && (
            <Link href="/new" className="underline">
              Start your own game
            </Link>
          )}
        </div>
      )}
      {s.error && (
        <div className="rounded-lg border border-red-500 bg-red-950/60 p-3 text-sm">
          Something went wrong: {s.error}{" "}
          <button className="underline" onClick={s.clearError}>
            Retry
          </button>
        </div>
      )}
      {s.actionError && <div className="rounded-lg border border-amber-500 bg-amber-950/60 p-3 text-sm">{s.actionError}</div>}

      {/* Main layout */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <Board
            game={game}
            humanPlayerId={meta.humanPlayerId}
            attackerCode={s.canPlay ? attackerCode : undefined}
            targetCode={s.canPlay ? targetCode : undefined}
            fightingCodes={fighting}
            onCountryClick={canPick ? handleCountryClick : undefined}
          />
          <BattlePanel entry={lastBattle} game={game} fast={s.fast} />
        </div>
        <div className="space-y-4 lg:col-span-2">
          {s.canPlay && (
            <HumanPanel
              game={game}
              humanPlayerId={meta.humanPlayerId}
              attackerCode={attackerCode}
              targetCode={targetCode}
              setAttackerCode={setAttackerCode}
              setTargetCode={setTargetCode}
              busy={s.busy}
              onAction={s.perform}
            />
          )}
          <LogPanel entries={s.log} game={game} />
        </div>
      </div>
    </main>
  );
}