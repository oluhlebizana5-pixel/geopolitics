// Database calls for the "My games" and "Stats" pages.
// (Same database layer as firebaseService.ts: pages never talk to Firestore directly.)

import { collection, getCountFromServer, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { GameRecord, recordFromData } from "./stats";

export async function listMyGameRecords(uid: string): Promise<GameRecord[]> {
  const snap = await getDocs(query(collection(db, "games"), where("ownerUid", "==", uid)));
  return snap.docs.map((d) => recordFromData(d.id, d.data())).sort((a, b) => b.updatedAtMs - a.updatedAtMs);
}

// The most recent games across the whole platform (a sample used for platform statistics)
export async function listRecentGameRecords(count = 100): Promise<GameRecord[]> {
  const snap = await getDocs(query(collection(db, "games"), orderBy("updatedAt", "desc"), limit(count)));
  return snap.docs.map((d) => recordFromData(d.id, d.data()));
}

// Exact totals, counted by the database itself
export async function countGames(): Promise<{ total: number; finished: number }> {
  const games = collection(db, "games");
  const [all, finished] = await Promise.all([
    getCountFromServer(query(games)),
    getCountFromServer(query(games, where("status", "==", "finished"))),
  ]);
  return { total: all.data().count, finished: finished.data().count };
}