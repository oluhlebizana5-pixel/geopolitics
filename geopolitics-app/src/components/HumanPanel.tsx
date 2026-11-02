"use client";

import { useState } from "react";
import { Game } from "@/lib/classes/Game";
import { NpcEvent } from "@/lib/classes/NpcStrategy";
import { btnAccent, btnDanger, btnPrimary, btnSecondary, input, inputSmall } from "@/lib/ui";
import { attackRound, endHumanTurn, placeReinforcements, transferSoldiers } from "@/lib/classes/HumanActions";

interface HumanPanelProps {
  game: Game;
  humanPlayerId: string;
  attackerCode: string;
  targetCode: string;
  setAttackerCode: (code: string) => void;
  setTargetCode: (code: string) => void;
  busy: boolean;
  onAction: (fn: (game: Game) => NpcEvent[]) => void;
}

const selectClass = input;

export default function HumanPanel({
  game,
  humanPlayerId,
  attackerCode,
  targetCode,
  setAttackerCode,
  setTargetCode,
  busy,
  onAction,
}: HumanPanelProps) {
  const [reinforceTo, setReinforceTo] = useState("");
  const [reinforceAmount, setReinforceAmount] = useState(1);
  const [transferFrom, setTransferFrom] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [transferAmount, setTransferAmount] = useState(1);

  const mine = game.countriesOf(humanPlayerId);
  const enemies = game.allCountries.filter((c) => c.ownerId !== humanPlayerId).sort((a, b) => a.soldiers - b.soldiers);
  const pending = game.pendingReinforcements;
  const battle = game.currentBattle;
  const attackUsed = game.attackUsed;

  // Use the chosen value if it is still valid, otherwise a sensible default
  const pick = (value: string, valid: string[], fallback: string) => (valid.includes(value) ? value : fallback);
  const attackers = mine.filter((c) => c.soldiers >= 2);
  const attacker = pick(attackerCode, attackers.map((c) => c.code), attackers[0]?.code ?? "");
  const target = pick(targetCode, enemies.map((c) => c.code), enemies[0]?.code ?? "");
  const reinforceCountry = pick(reinforceTo, mine.map((c) => c.code), mine[0]?.code ?? "");
  const from = pick(transferFrom, mine.map((c) => c.code), mine[0]?.code ?? "");
  const to = pick(transferTo, mine.filter((c) => c.code !== from).map((c) => c.code), mine.find((c) => c.code !== from)?.code ?? "");
  const fromCountry = from ? game.getCountry(from) : null;
  const maxTransfer = fromCountry ? fromCountry.soldiers - 1 : 0;

  return (
    <section className="space-y-4 rounded-xl border-2 border-primary bg-card p-4 text-card-foreground shadow-sm">
      <h2 className="text-lg font-bold text-accent-foreground">🎮 Your turn</h2>

      {/* 1. Reinforcements */}
      {pending > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">
            Place your {pending} new soldier{pending === 1 ? "" : "s"}
          </h3>
          <select className={selectClass} value={reinforceCountry} onChange={(e) => setReinforceTo(e.target.value)}>
            {mine.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name} ({c.soldiers})
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={pending}
              value={reinforceAmount}
              onChange={(e) => setReinforceAmount(Number(e.target.value))}
              className={inputSmall}
            />
            <button
              disabled={busy}
              className={btnPrimary}
              onClick={() => onAction((g) => placeReinforcements(g, reinforceCountry, Math.min(Math.max(1, Math.floor(reinforceAmount) || 1), pending)))}
            >
              Place
            </button>
            <button
              disabled={busy}
              className={btnSecondary}
              onClick={() => onAction((g) => placeReinforcements(g, reinforceCountry, pending))}
            >
              Place all {pending}
            </button>
          </div>
        </div>
      )}

      {/* 2. Attack */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Attack</h3>
        {battle ? (
          <>
            <p className="text-sm text-foreground">
              Attack in progress: <b>{game.getCountry(battle.attackerCode).name}</b> ({game.getCountry(battle.attackerCode).soldiers}) vs{" "}
              <b>{game.getCountry(battle.defenderCode).name}</b> ({game.getCountry(battle.defenderCode).soldiers})
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                disabled={busy}
                className={btnDanger}
                onClick={() => onAction((g) => attackRound(g, battle.attackerCode, battle.defenderCode))}
              >
                🎲 Roll again
              </button>
              <button disabled={busy} className={btnSecondary} onClick={() => onAction((g) => endHumanTurn(g))}>
                ✋ Stop attack &amp; end turn
              </button>
            </div>
          </>
        ) : attackUsed ? (
          <p className="text-sm text-muted-foreground">Your attack for this turn is over. You can still move soldiers, then end your turn.</p>
        ) : attackers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No country has 2 or more soldiers, so you cannot attack this turn.</p>
        ) : (
          <>
            <label className="block text-xs text-muted-foreground">
              Attack from
              <select className={selectClass} value={attacker} onChange={(e) => setAttackerCode(e.target.value)}>
                {attackers.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.soldiers})
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-muted-foreground">
              Target
              <select className={selectClass} value={target} onChange={(e) => setTargetCode(e.target.value)}>
                {enemies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.soldiers})
                  </option>
                ))}
              </select>
            </label>
            <button
              disabled={busy || pending > 0 || !attacker || !target}
              className={btnDanger}
              onClick={() => onAction((g) => attackRound(g, attacker, target))}
            >
              ⚔ Attack
            </button>
            {pending > 0 && <p className="text-xs text-amber-700 dark:text-amber-300">Place all your new soldiers first.</p>}
          </>
        )}
      </div>

      {/* 3. Transfers */}
      {!battle && pending === 0 && mine.length >= 2 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Move soldiers between your countries</h3>
          <div className="flex gap-2">
            <select className={selectClass} value={from} onChange={(e) => setTransferFrom(e.target.value)}>
              {mine.map((c) => (
                <option key={c.code} value={c.code}>
                  From {c.name} ({c.soldiers})
                </option>
              ))}
            </select>
            <select className={selectClass} value={to} onChange={(e) => setTransferTo(e.target.value)}>
              {mine
                .filter((c) => c.code !== from)
                .map((c) => (
                  <option key={c.code} value={c.code}>
                    To {c.name} ({c.soldiers})
                  </option>
                ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={Math.max(1, maxTransfer)}
              value={transferAmount}
              onChange={(e) => setTransferAmount(Number(e.target.value))}
              className={inputSmall}
            />
            <button
              disabled={busy || maxTransfer < 1 || !to}
              className={btnPrimary}
              onClick={() => onAction((g) => transferSoldiers(g, from, to, Math.max(1, Math.floor(transferAmount) || 1)))}
            >
              Move
            </button>
            <span className="text-xs text-muted-foreground">max {Math.max(0, maxTransfer)} (one soldier must stay)</span>
          </div>
        </div>
      )}

      {/* 4. End turn */}
      {!battle && (
        <div>
          <button
            disabled={busy || pending > 0}
            className={`${btnAccent} w-full`}
            onClick={() => onAction((g) => endHumanTurn(g))}
          >
            {attackUsed ? "End turn" : "Skip attack & end turn"}
          </button>
          {pending > 0 && <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">Place all your new soldiers before ending your turn.</p>}
        </div>
      )}
    </section>
  );
}