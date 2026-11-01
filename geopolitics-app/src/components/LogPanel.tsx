"use client";

import { useEffect, useRef } from "react";
import { Game } from "@/lib/classes/Game";
import { LogEntry } from "@/lib/firebaseService";
import { styleFor } from "@/lib/ui";

const ICONS: Record<string, string> = {
  reinforce: "➕",
  attack_start: "⚔️",
  battle_round: "🎲",
  conquered: "🏴",
  stop_attack: "✋",
  transfer: "🔀",
  skip: "⏭️",
  end_turn: "⏹️",
  victory: "👑",
};

export default function LogPanel({ entries, game }: { entries: LogEntry[]; game: Game }) {
  const box = useRef<HTMLDivElement>(null);
  const players = game.allPlayers;

  // Keep the newest entry in view (scrolls the log box only, not the page)
  useEffect(() => {
    const el = box.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries.length]);

  return (
    <section className="flex flex-col rounded-xl border border-slate-700 bg-slate-800/60 p-4">
      <h2 className="mb-2 font-semibold">📜 Game log &amp; NPC decisions</h2>
      <div ref={box} className="h-80 space-y-1.5 overflow-y-auto pr-1 text-sm">
        {entries.length === 0 && <p className="text-slate-400">Nothing has happened yet.</p>}
        {entries.map((e) => {
          const style = styleFor(players.findIndex((p) => p.id === e.playerId));
          const muted = e.type === "end_turn" || e.type === "battle_round";
          return (
            <div key={e.id} className={`flex gap-2 ${muted ? "text-slate-500" : ""}`}>
              <span>{ICONS[e.type] ?? "•"}</span>
              <p>
                <span className={`font-semibold ${style.text}`}>{e.playerName}: </span>
                {e.message}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}