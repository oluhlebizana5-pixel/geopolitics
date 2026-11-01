// Browser side: asks our /api/commentary route for a line, and never fails.

import { CommentaryRequest, CommentaryResult, fallbackCommentary } from "./commentaryShared";
import { getIdToken } from "./firebaseService";

export async function fetchCommentary(req: CommentaryRequest): Promise<CommentaryResult> {
  try {
    const token = await getIdToken();
    if (!token) return { commentary: fallbackCommentary(req), source: "fallback", reason: "not logged in" };

    const res = await fetch("/api/commentary", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(req),
    });
    if (!res.ok) return { commentary: fallbackCommentary(req), source: "fallback", reason: `API route returned ${res.status}` };

    const data = (await res.json()) as Partial<CommentaryResult>;
    if (typeof data.commentary === "string" && data.commentary) {
      return { commentary: data.commentary, source: data.source === "ai" ? "ai" : "fallback", reason: data.reason };
    }
  } catch (e) {
    return { commentary: fallbackCommentary(req), source: "fallback", reason: (e as Error).message };
  }
  return { commentary: fallbackCommentary(req), source: "fallback", reason: "empty answer" };
}