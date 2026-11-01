import { Suspense } from "react";
import GameClient from "./GameClient";

export default function GamePage() {
  return (
    <Suspense fallback={<main className="p-6">Loading game...</main>}>
      <GameClient />
    </Suspense>
  );
}