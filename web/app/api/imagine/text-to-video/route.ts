import { NextResponse } from "next/server";
import { vyroTextToVideo } from "@/lib/imagine/vyro";

export const maxDuration = 300;

export async function POST(req: Request) {
  
  try {
    const { prompt, style } = await req.json();
    if (!prompt) return NextResponse.json({ error: "prompt required" }, { status: 400 });
    const res = await vyroTextToVideo({ prompt, style });
     return NextResponse.json(res);
  } catch (e:any) {
    return NextResponse.json({ error: e.message || "generation failed" }, { status: 500 });
  }
}
