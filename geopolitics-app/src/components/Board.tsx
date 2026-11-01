"use client";

import { Game } from "@/lib/classes/Game";
import { styleFor } from "@/lib/ui";

interface BoardProps {
  game: Game;
  humanPlayerId: string;
  attackerCode?: string;
  targetCode?: string;
  fightingCodes?: string[]; // countries in the battle being shown
  onCountryClick?: (code: string) => void;
}

export default function Board({ game, humanPlayerId, attackerCode, targetCode, fightingCodes = [], onCountryClick }: BoardProps) {
  const players = game.allPlayers;
  const current = game.status === "active" ? game.currentPlayer : null;

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
      {/* Player legend */}
      <ul className="mb-4 flex flex-wrap gap-2 text-xs">
        {players.map((p, i) => {
          const s = styleFor(i);
          const held = game.countriesOf(p.id).length;
          const isCurrent = current?.id === p.id;
          return (
            <li
              key={p.id}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${
                isCurrent ? "border-white bg-slate-700" : "border-slate-600"
              } ${p.eliminated ? "opacity-40 line-through" : ""}`}
            >
              <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
              {isCurrent && <span>▶</span>}
              <span>{p.id === humanPlayerId ? `${p.name} (you)` : p.name}</span>
              <span className="text-slate-400">{p.eliminated ? "out" : `${held} 🌍`}</span>
            </li>
          );
        })}
      </ul>

      {/* The 10 countries */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {game.allCountries.map((c) => {
          const ownerIndex = players.findIndex((p) => p.id === c.ownerId);
          const s = styleFor(ownerIndex);
          const mine = c.ownerId === humanPlayerId;
          const isAttacker = c.code === attackerCode;
          const isTarget = c.code === targetCode;
          const fighting = fightingCodes.includes(c.code);
          const ring = isAttacker
            ? "ring-2 ring-white"
            : isTarget
            ? "ring-2 ring-rose-500"
            : fighting
            ? "ring-2 ring-amber-300"
            : "";
          const className = `flex flex-col items-start rounded-lg border-2 p-3 text-left transition ${s.border} ${s.bg} ${ring} ${
            onCountryClick ? "cursor-pointer hover:brightness-125" : ""
          }`;
          const body = (
            <>
              <span className="flex w-full items-center justify-between text-[11px] text-slate-400">
                <span>{c.code}</span>
                <span>{(c.population / 1_000_000).toLocaleString("en", { maximumFractionDigits: 1 })}m people</span>
              </span>
              <span className="mt-1 font-semibold leading-tight">{c.name}</span>
              <span className={`text-xs ${s.text}`}>
                {mine ? "You" : players[ownerIndex]?.name.replace(" (NPC)", "")}
              </span>
              <span className="mt-2 flex items-baseline gap-1">
                <span key={c.soldiers} className="animate-pop text-3xl font-bold tabular-nums">
                  {c.soldiers}
                </span>
                <span className="text-xs text-slate-400">soldiers</span>
              </span>
              {(isAttacker || isTarget) && (
                <span className="mt-1 text-[11px] font-semibold uppercase tracking-wide">
                  {isAttacker ? "⚔ attacker" : "🎯 target"}
                </span>
              )}
            </>
          );
          return onCountryClick ? (
            <button key={c.code} type="button" onClick={() => onCountryClick(c.code)} className={className}>
              {body}
            </button>
          ) : (
            <div key={c.code} className={className}>
              {body}
            </div>
          );
        })}
      </div>
    </section>
  );
}