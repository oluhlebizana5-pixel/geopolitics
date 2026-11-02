"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import Flag from "@/components/Flag";
import PageBar, { usePagination } from "@/components/PageBar";
import { friendlyError } from "@/lib/firebaseService";
import { listRecentGameRecords } from "@/lib/statsService";
import { GameRecord, outcomeOf } from "@/lib/stats";
import { playerFlagCode } from "@/lib/flags";
import { cardLink } from "@/lib/ui";

const PAGE_SIZE = 8;

export default function GamesPage() {
  const [records, setRecords] = useState<GameRecord[] | null>(null);
  const [error, setError] = useState("");
  const { page, setPage, pageCount, slice } = usePagination(records ?? [], PAGE_SIZE);

  useEffect(() => {
    listRecentGameRecords(100)
      .then(setRecords)
      .catch((e) => setError(friendlyError(e)));
  }, []);

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Games</h1>
        <p className="mt-1 text-muted-foreground">Every game can be watched live from its link. Only its owner can play.</p>
      </div>

      {error && <p className="text-sm font-semibold">{error}</p>}
      {!records && !error && <p className="text-muted-foreground">Loading games...</p>}
      {records && records.length === 0 && <p className="text-sm text-muted-foreground">No games yet. Be the first!</p>}

      <ul className="space-y-2">
        {slice.map((g) => {
          const outcome = outcomeOf(g);
          return (
            <li key={g.id}>
              <Link href={`/game/${g.id}`} className={`flex items-center gap-3 ${cardLink}`}>
                <Flag code={playerFlagCode(g.humanPlayerId)} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{g.ownerName}&rsquo;s game</span>
                  <span className="text-xs text-muted-foreground">
                    Round {g.round} · {g.countriesHeld} of 10 countries
                  </span>
                </span>
                <Badge variant={g.status === "finished" ? "default" : "secondary"}>
                  {g.status === "finished" ? (outcome === "won" ? "Won" : "Finished") : "Live"}
                </Badge>
              </Link>
            </li>
          );
        })}
      </ul>
      <PageBar page={page} pageCount={pageCount} onChange={setPage} />
    </main>
  );
}
