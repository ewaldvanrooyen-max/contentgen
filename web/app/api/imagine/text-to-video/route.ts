import { NextResponse } from "next/server";
import { vyroTextToVideo } from "@/lib/imagine/vyro";
import { logUsage } from "@/lib/usage";

export const maxDuration = 300;

export async function POST(req: Request) {
  const t0 = Date.now();
  try {
    const { prompt, style } = await req.json();
    if (!prompt) return NextResponse.json({ error: "prompt required" }, { status: 400 });
    const res = await vyroTextToVideo({ prompt, style });
    await logUsage({ provider: "imagine", kind: "video_generate", jobId: "n/a", ms: Date.now() - t0 });
    return NextResponse.json(res);
  } catch (e:any) {
    return NextResponse.json({ error: e.message || "generation failed" }, { status: 500 });
  }
}
