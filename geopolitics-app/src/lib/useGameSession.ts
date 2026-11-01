"use client";

// Everything the game page needs, in one hook:
//  - live game + log from Firestore (anyone can watch)
//  - the NPC "autopilot" (runs only in the OWNER's browser)
//  - human actions (owner only, only on the human's turn)

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import { Game } from "./classes/Game";
import { NpcEvent, NpcStrategy } from "./classes/NpcStrategy";
import {
  LoadedGame,
  LogEntry,
  addLogEntries,
  canPlayTurn,
  friendlyError,
  saveGame,
  subscribeToGame,
  subscribeToLog,
} from "./firebaseService";

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Fast-forward only shortens the pause. Every event is still saved, logged and shown.
function pauseFor(event: NpcEvent, fast: boolean): number {
  if (fast) return event.type === "battle_round" ? 400 : 150;
  if (event.type === "battle_round") return 1500;
  if (event.type === "end_turn") return 300;
  return 900;
}

export function useGameSession(gameId: string) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  const [loaded, setLoaded] = useState<LoadedGame | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [npcRunning, setNpcRunning] = useState(false);
  const [fast, setFast] = useState(false);

  const latest = useRef<LoadedGame | null>(null);
  const fastRef = useRef(false);
  const runningRef = useRef(false);
  const busyRef = useRef(false);
  const aliveRef = useRef(true);

  // ---- Live data from Firestore ----
  useEffect(() => {
    aliveRef.current = true;
    const stopGame = subscribeToGame(
      gameId,
      (l) => {
        latest.current = l;
        setLoaded(l);
        setNotFound(l === null);
      },
      (e) => setError(friendlyError(e))
    );
    const stopLog = subscribeToLog(gameId, setLog);
    return () => {
      aliveRef.current = false;
      stopGame();
      stopLog();
    };
  }, [gameId]);

  const isOwner = !!loaded && !!uid && uid === loaded.meta.ownerUid;
  const canPlay = !!loaded && canPlayTurn(loaded, uid);
  const currentIsNpc = !!loaded && loaded.game.status === "active" && loaded.game.currentPlayer.isNpc;

  // ---- NPC autopilot: plays NPC turns one visible step at a time ----
  const runNpcTurns = useCallback(async () => {
    const start = latest.current;
    if (!start || runningRef.current) return;
    runningRef.current = true;
    setNpcRunning(true);
    try {
      const strategy = new NpcStrategy();
      const game = Game.fromJSON(start.game.toJSON()); // private working copy
      while (aliveRef.current && game.status === "active" && game.currentPlayer.isNpc) {
        for (const event of strategy.playTurn(game)) {
          // Save after EVERY step so viewers see it live and a refresh can resume.
          await Promise.all([saveGame(gameId, game), addLogEntries(gameId, [event])]);
          if (!aliveRef.current) return;
          await sleep(pauseFor(event, fastRef.current));
          if (!aliveRef.current) return;
        }
      }
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      runningRef.current = false;
      setNpcRunning(false);
      fastRef.current = false; // fast-forward lasts until the player's next turn
      setFast(false);
    }
  }, [gameId]);

  const roundNow = loaded?.game.round;
  const currentIdNow = loaded?.game.currentPlayer.id;
  useEffect(() => {
    if (isOwner && currentIsNpc && !runningRef.current && !error) {
      void runNpcTurns();
    }
  }, [isOwner, currentIsNpc, error, roundNow, currentIdNow, runNpcTurns]);

  const setFastForward = useCallback((value: boolean) => {
    fastRef.current = value;
    setFast(value);
  }, []);

  // ---- Human actions (owner only, on the human's turn) ----
  const perform = useCallback(
    async (fn: (game: Game) => NpcEvent[]) => {
      const snap = latest.current;
      if (!snap || busyRef.current || runningRef.current || !canPlayTurn(snap, uid)) return;
      busyRef.current = true;
      setBusy(true);
      setActionError("");
      try {
        const game = Game.fromJSON(snap.game.toJSON());
        const events = fn(game); // throws a readable Error if a rule is broken
        await Promise.all([saveGame(gameId, game), addLogEntries(gameId, events)]);
      } catch (e) {
        setActionError(friendlyError(e));
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [gameId, uid]
  );

  const clearError = useCallback(() => setError(""), []);

  return {
    loaded,
    log,
    notFound,
    error,
    actionError,
    busy,
    npcRunning,
    fast,
    isOwner,
    canPlay,
    setFastForward,
    perform,
    clearError,
  };
}