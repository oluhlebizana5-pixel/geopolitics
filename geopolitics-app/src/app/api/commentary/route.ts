import { NextResponse } from "next/server";
import { generateCommentary, parseRequest } from "@/lib/commentaryServer";
import { allowRequest, verifyIdToken } from "@/lib/serverAuth";

// POST /api/commentary
// Body: the facts about one dice round. Header: Authorization: Bearer <Firebase ID token>
export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const uid = token ? await verifyIdToken(token) : null;
  if (!uid) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  if (!allowRequest(uid)) return NextResponse.json({ error: "Too many requests. Slow down." }, { status: 429 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = parseRequest(body);
  if (!parsed) return NextResponse.json({ error: "Invalid battle data." }, { status: 400 });

  const result = await generateCommentary(parsed);
  return NextResponse.json(result);
}