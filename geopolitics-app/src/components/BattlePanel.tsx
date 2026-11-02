"use client";

import { useEffect, useState } from "react";
import { Game } from "@/lib/classes/Game";
import { LogEntry } from "@/lib/firebaseService";
import { DieFace } from "./Dice";
import { banner, card, muted } from "@/lib/ui";

interface BattlePanelProps {
  entry: LogEntry | null; // the most recent battle round
  game: Game;
  fast: boolean;
}

const randomFace = () => 1 + Math.floor(Math.random() * 6);

export default function BattlePanel({ entry, game, fast }: BattlePanelProps) {
  const pairs = entry?.result?.round.pairs ?? [];
  const pairCount = pairs.length;
  const entryId = entry?.id;

  const [rolling, setRolling] = useState(false);
  const [faces, setFaces] = useState<{ a: number[]; d: number[] }>({ a: [], d: [] });

  // Every new battle round: tumble the dice for a moment, then reveal the real result.
  useEffect(() => {
    if (!entryId) return;
    setRolling(true);
    const tick = () =>
      setFaces({
        a: Array.from({ length: pairCount }, randomFace),
        d: Array.from({ length: pairCount }, randomFace),
      });
    tick();
    const spin = setInterval(tick, 90);
    const stop = setTimeout(() => {
      clearInterval(spin);
      setRolling(false);
    }, fast ? 250 : 750);
    return () => {
      clearInterval(spin);
      clearTimeout(stop);
    };
  }, [entryId, pairCount, fast]);

  if (!entry || !entry.result) {
    return (
      <section className={card}>
        <h2 className="mb-1 font-semibold text-accent-foreground">⚔ Battle</h2>
        <p className={`text-sm ${muted}`}>No battles yet. When an attack starts, the dice appear here.</p>
      </section>
    );
  }

  const attackerName = entry.attackerCode ? game.getCountry(entry.attackerCode).name : "Attacker";
  const defenderName = entry.defenderCode ? game.getCountry(entry.defenderCode).name : "Defender";
  const small = pairCount > 3;
  const { attackerLosses, defenderLosses } = entry.result.round;

  return (
    <section className={card}>
      <h2 className="mb-3 font-semibold text-accent-foreground">⚔ Battle</h2>
      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="font-semibold text-rose-700 dark:text-rose-300">
          {attackerName} <span className="font-normal text-muted-foreground">({entry.playerName})</span>
        </span>
        <span className="text-muted-foreground">vs</span>
        <span className="font-semibold text-sky-700 dark:text-sky-300">{defenderName}</span>
      </div>

      <div className="mb-3 flex flex-col items-center gap-2">
        {pairs.map((pair, i) => (
          <div key={i} className="flex items-center gap-4">
            <DieFace
              small={small}
              tone="attacker"
              rolling={rolling}
              value={rolling ? faces.a[i] ?? 1 : pair.attackerRoll}
              winner={!rolling && pair.winner === "attacker"}
            />
            <span className="w-10 text-center text-xs text-muted-foreground">
              {rolling ? "…" : pair.winner === "tie" ? "tie" : pair.winner === "attacker" ? "◀ wins" : "wins ▶"}
            </span>
            <DieFace
              small={small}
              tone="defender"
              rolling={rolling}
              value={rolling ? faces.d[i] ?? 1 : pair.defenderRoll}
              winner={!rolling && pair.winner === "defender"}
            />
          </div>
        ))}
      </div>

      <p className="text-center text-sm">
        {rolling ? (
          <span className="text-muted-foreground">Rolling…</span>
        ) : (
          <>
            <span className="text-rose-700 dark:text-rose-300">{attackerName} lost {attackerLosses}</span>
            {" · "}
            <span className="text-sky-700 dark:text-sky-300">{defenderName} lost {defenderLosses}</span>
          </>
        )}
      </p>

      {entry.commentary && !rolling && (
        <p className={`mt-3 italic ${banner.gold}`}>🎙 {entry.commentary}</p>
      )}
    </section>
  );
}