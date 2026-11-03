"use client";

import { Game } from "@/lib/classes/Game";
import { card, muted } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { playerFlagCode } from "@/lib/flags";
import { personalityFor } from "@/lib/classes/NpcStrategy";
import Flag from "./Flag";

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
    <section className={card}>
      {/* Player legend: each player is shown by the flag of the country they started with */}
      <ul className="mb-4 flex flex-wrap gap-2 text-xs">
        {players.map((p) => {
          const held = game.countriesOf(p.id).length;
          const isCurrent = current?.id === p.id;
          const persona = p.isNpc ? personalityFor(players, p.id) : null;
          return (
            <li
              key={p.id}
              className={cn(
                "flex items-center gap-1.5 rounded-full border py-1 pr-3 pl-1",
                isCurrent ? "border-foreground/30 bg-primary text-primary-foreground" : "border-border bg-card",
                p.eliminated && "opacity-40 line-through"
              )}
            >
              <Flag code={playerFlagCode(p.id)} size={20} />
              {isCurrent && <span>▶</span>}
              <span>{p.id === humanPlayerId ? `${p.name} (you)` : p.name.replace(" (NPC)", "")}</span>
              {persona && (
                <span title={`${persona.name}: ${persona.tagline}`} aria-label={persona.name}>
                  {persona.emoji}
                </span>
              )}
              <span className={isCurrent ? "opacity-70" : muted}>{p.eliminated ? "out" : `${held}`}</span>
            </li>
          );
        })}
      </ul>

      {/* Who is each NPC? Every NPC plays with its own personality. */}
      <details className="mb-4 text-sm">
        <summary className="cursor-pointer font-semibold">Meet the NPC leaders</summary>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {players
            .filter((p) => p.isNpc)
            .map((p) => {
              const persona = personalityFor(players, p.id);
              return (
                <li key={p.id} className="flex items-start gap-2 rounded-2xl border border-border p-2">
                  <Flag code={playerFlagCode(p.id)} size={20} />
                  <div>
                    <p className="font-semibold">
                      {p.name.replace(" (NPC)", "")} <span className={muted}>{persona.emoji} {persona.name}</span>
                    </p>
                    <p className={muted}>{persona.tagline}</p>
                    <p className={muted}>
                      Attacks at {Math.round(persona.minWinChance * 100)}%+ odds, retreats below{" "}
                      {Math.round(persona.stopBelow * 100)}%, reinforces its {persona.reinforceTo} country.
                    </p>
                  </div>
                </li>
              );
            })}
        </ul>
      </details>

      {/* The 10 countries */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {game.allCountries.map((c) => {
          const owner = players.find((p) => p.id === c.ownerId);
          const mine = c.ownerId === humanPlayerId;
          const isAttacker = c.code === attackerCode;
          const isTarget = c.code === targetCode;
          const fighting = fightingCodes.includes(c.code);
          const className = cn(
            "flex flex-col items-start rounded-2xl border p-3 text-left transition",
            mine ? "border-foreground/20 bg-primary text-primary-foreground" : "border-border bg-card",
            isAttacker && "ring-2 ring-foreground",
            isTarget && "outline-2 outline-dashed outline-offset-2 outline-foreground",
            fighting && !isAttacker && !isTarget && "ring-2 ring-foreground/40",
            onCountryClick && "cursor-pointer hover:-translate-y-0.5 hover:shadow-md"
          );
          const sub = mine ? "text-primary-foreground/70" : "text-muted-foreground";
          const body = (
            <>
              <span className="flex w-full items-center justify-between gap-2">
                <Flag code={c.code} size={34} />
                <span className={cn("text-[11px]", sub)}>
                  {(c.population / 1_000_000).toLocaleString("en", { maximumFractionDigits: 1 })}m
                </span>
              </span>
              <span className="mt-2 font-semibold leading-tight">{c.name}</span>
              <span className={cn("mt-0.5 flex items-center gap-1 text-xs", sub)}>
                {owner && !mine && <Flag code={playerFlagCode(owner.id)} size={14} />}
                {mine ? "You" : owner?.name.replace(" (NPC)", "")}
              </span>
              <span className="mt-2 flex items-baseline gap-1">
                <span key={c.soldiers} className="animate-pop text-3xl font-bold tabular-nums">
                  {c.soldiers}
                </span>
                <span className={cn("text-xs", sub)}>{c.soldiers === 1 ? "soldier" : "soldiers"}</span>
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
