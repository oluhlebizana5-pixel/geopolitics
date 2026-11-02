"use client";

import { useEffect, useRef } from "react";
import { Game } from "@/lib/classes/Game";
import { LogEntry } from "@/lib/firebaseService";
import { card, muted } from "@/lib/ui";
import { playerFlagCode } from "@/lib/flags";
import Flag from "./Flag";

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

export default function LogPanel({ entries }: { entries: LogEntry[]; game?: Game }) {
  const box = useRef<HTMLDivElement>(null);

  // Keep the newest entry in view (scrolls the log box only, not the page)
  useEffect(() => {
    const el = box.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries.length]);

  return (
    <section className={`flex flex-col ${card}`}>
      <h2 className="mb-2 text-lg font-bold">📜 Game log &amp; NPC decisions</h2>
      <div ref={box} className="h-80 space-y-1.5 overflow-y-auto pr-1 text-sm">
        {entries.length === 0 && <p className={muted}>Nothing has happened yet.</p>}
        {entries.map((e) => {
          const quiet = e.type === "end_turn" || e.type === "battle_round";
          return (
            <div key={e.id} className={`flex gap-2 ${quiet ? "text-muted-foreground" : ""}`}>
              <span>{ICONS[e.type] ?? "•"}</span>
              <p>
                <Flag code={playerFlagCode(e.playerId)} size={14} className="mr-1 align-[-2px]" />
                <span className="font-semibold text-foreground">{e.playerName}: </span>
                {e.message}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}