// Server-side helpers that stop strangers from using your AI key.
// No extra packages: Firebase ID tokens are checked with Google's public REST API.

const verified = new Map<string, { uid: string; until: number }>();

export async function verifyIdToken(token: string): Promise<string | null> {
  const hit = verified.get(token);
  if (hit && hit.until > Date.now()) return hit.uid;

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idToken: token }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const uid = data?.users?.[0]?.localId;
    if (typeof uid !== "string") return null;

    if (verified.size > 500) verified.clear();
    verified.set(token, { uid, until: Date.now() + 5 * 60_000 });
    return uid;
  } catch {
    return null;
  }
}

// Simple limit per user: at most `max` requests per minute (best effort, per server instance)
const recent = new Map<string, number[]>();

export function allowRequest(uid: string, max = 40, windowMs = 60_000): boolean {
  const now = Date.now();
  const hits = (recent.get(uid) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= max) {
    recent.set(uid, hits);
    return false;
  }
  hits.push(now);
  recent.set(uid, hits);
  if (recent.size > 1000) recent.clear();
  return true;
}