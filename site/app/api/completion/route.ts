import { NextResponse } from "next/server";

type Req = { prompt?: unknown };

export async function POST(req: Request) {
  let body: Req;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (prompt.length < 1) {
    return NextResponse.json({ ok: false, error: "prompt is required" }, { status: 400 });
  }
  if (prompt.length > 500) {
    return NextResponse.json({ ok: false, error: "prompt too long (max 500 chars)" }, { status: 400 });
  }

  // Stub response for now. We'll swap in a real provider later.
  return NextResponse.json({ ok: true, text: `You said: ${prompt}` });
}
