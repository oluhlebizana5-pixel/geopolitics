"use client";

import { useEffect, useState } from "react";
import Hero from "@/components/Hero";
import HomeCards from "@/components/HomeCards";
import Features from "@/components/Features";
import { GameRecord, PlatformStats, computePlatformStats } from "@/lib/stats";
import { listRecentGameRecords } from "@/lib/statsService";

export default function HomePage() {
  const [records, setRecords] = useState<GameRecord[]>([]);
  const [platform, setPlatform] = useState<PlatformStats | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    listRecentGameRecords(30)
      .then((r) => {
        setRecords(r);
        setPlatform(computePlatformStats(r));
      })
      .catch(() => {
        /* the cards show their empty state if the list cannot be loaded */
      })
      .finally(() => setLoaded(true));
  }, []);

  return (
    <main>
      <Hero />
      <HomeCards records={records} platform={platform} loaded={loaded} />
      <Features />
    </main>
  );
}
