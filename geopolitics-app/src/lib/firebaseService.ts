// ALL database and authentication calls live in this one file.
// Pages and components never talk to Firebase directly.

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  DocumentData,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { Game, GameSnapshot } from "./classes/Game";
import { NpcEvent } from "./classes/NpcStrategy";

// ======================================================================
// Helpers
// ======================================================================

// Firestore rejects `undefined` values; this strips them.
function clean<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export function friendlyError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/email-already-in-use":
      return "That email is already registered. Try logging in instead.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "Incorrect email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "permission-denied":
      return "You don't have permission to do that.";
    default:
      return (err as Error)?.message || "Something went wrong. Please try again.";
  }
}

// ======================================================================
// Authentication
// ======================================================================

export async function signUp(email: string, password: string, displayName: string): Promise<User> {
  const name = displayName.trim();
  if (!name) throw new Error("Please enter a display name.");
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await updateProfile(cred.user, { displayName: name });
  await setDoc(doc(db, "users", cred.user.uid), {
    displayName: name,
    email: cred.user.email,
    createdAt: serverTimestamp(),
  });
  return cred.user;
}

export async function logIn(email: string, password: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  return cred.user;
}

export function logOut(): Promise<void> {
  return signOut(auth);
}

export function subscribeToAuth(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

// ======================================================================
// Games
// ======================================================================

export interface GameMeta {
  id: string;
  ownerUid: string;
  ownerName: string;
  humanPlayerId: string;
}

export interface LoadedGame {
  game: Game;
  meta: GameMeta;
}

export interface GameSummary {
  id: string;
  ownerName: string;
  status: string;
  round: number;
  countriesHeld: number;
  updatedAtMs: number;
}

function toLoaded(id: string, data: DocumentData): LoadedGame {
  return {
    game: Game.fromJSON(data as GameSnapshot),
    meta: {
      id,
      ownerUid: data.ownerUid,
      ownerName: data.ownerName,
      humanPlayerId: data.humanPlayerId,
    },
  };
}

// Access control rule used by the UI (Firestore rules enforce the same on the server):
// anyone can WATCH a game, but only the logged-in owner can play the human's turn.
export function canPlayTurn(loaded: LoadedGame, uid: string | null | undefined): boolean {
  return (
    !!uid &&
    uid === loaded.meta.ownerUid &&
    loaded.game.status === "active" &&
    loaded.game.currentPlayer.id === loaded.meta.humanPlayerId
  );
}

export async function createGame(owner: { uid: string; name: string }, game: Game): Promise<string> {
  const humanPlayer = game.allPlayers.find((p) => !p.isNpc);
  if (!humanPlayer) throw new Error("A game needs one human player.");
  const ref = await addDoc(collection(db, "games"), {
    ...clean(game.toJSON()),
    ownerUid: owner.uid,
    ownerName: owner.name,
    humanPlayerId: humanPlayer.id,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function saveGame(gameId: string, game: Game): Promise<void> {
  await updateDoc(doc(db, "games", gameId), {
    ...clean(game.toJSON()),
    updatedAt: serverTimestamp(),
  });
}

export async function loadGame(gameId: string): Promise<LoadedGame | null> {
  const snap = await getDoc(doc(db, "games", gameId));
  if (!snap.exists()) return null;
  return toLoaded(snap.id, snap.data());
}

// Real-time updates: anyone with the link sees the game change live.
export function subscribeToGame(
  gameId: string,
  onData: (loaded: LoadedGame | null) => void,
  onError?: (err: Error) => void
): () => void {
  return onSnapshot(
    doc(db, "games", gameId),
    (snap) => onData(snap.exists() ? toLoaded(snap.id, snap.data()) : null),
    (err) => onError?.(err)
  );
}

function summarise(id: string, data: DocumentData): GameSummary {
  const countries = (data.countries ?? []) as { ownerId: string }[];
  return {
    id,
    ownerName: data.ownerName,
    status: data.status,
    round: data.round,
    countriesHeld: countries.filter((c) => c.ownerId === data.humanPlayerId).length,
    updatedAtMs: data.updatedAt?.toMillis?.() ?? 0,
  };
}

// "My games" list. Sorted in code, so no composite index is needed.
export async function listMyGames(uid: string): Promise<GameSummary[]> {
  const snap = await getDocs(query(collection(db, "games"), where("ownerUid", "==", uid)));
  return snap.docs.map((d) => summarise(d.id, d.data())).sort((a, b) => b.updatedAtMs - a.updatedAtMs);
}

// Public list of recent games (anyone can watch)
export async function listRecentGames(count = 20): Promise<GameSummary[]> {
  const snap = await getDocs(query(collection(db, "games"), orderBy("updatedAt", "desc"), limit(count)));
  return snap.docs.map((d) => summarise(d.id, d.data()));
}

// ======================================================================
// Game log (every action, NPC decision and battle round)
// Stored in games/{gameId}/log
// ======================================================================

export type LogEntry = NpcEvent & { id: string; seq: number; commentary?: string };

export async function addLogEntries(gameId: string, events: NpcEvent[]): Promise<void> {
  if (events.length === 0) return;
  const batch = writeBatch(db);
  const base = Date.now() * 1000; // keeps entries in order
  events.forEach((e, i) => {
    const ref = doc(collection(db, "games", gameId, "log"));
    batch.set(ref, { ...clean(e), seq: base + i, createdAt: serverTimestamp() });
  });
  await batch.commit();
}

export function subscribeToLog(
  gameId: string,
  onData: (entries: LogEntry[]) => void,
  maxEntries = 200
): () => void {
  const q = query(collection(db, "games", gameId, "log"), orderBy("seq", "desc"), limit(maxEntries));
  return onSnapshot(q, (snap) => {
    const entries = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<LogEntry, "id">) }));
    onData(entries.reverse()); // oldest first
  });
}