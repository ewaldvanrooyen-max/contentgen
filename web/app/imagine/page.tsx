"use client";
import { useState } from "react";

export default function ImaginePage() {
  const [prompt, setPrompt] = useState("a flying dinosaur over mountains, cinematic");
  const [style, setStyle] = useState("kling-1.0-pro");
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setErr(null);
    setSrc(null);
    const r = await fetch("/api/imagine/text-to-video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, style })
    });
    const j = await r.json();
    if (!r.ok) {
      setErr(j.error || "failed");
      setLoading(false);
      return;
    }
    setSrc(j.url || j.dataUrl || null);
    setLoading(false);
  }

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">Imagine Art · Text → Video</h1>
      <textarea className="w-full border p-2 rounded" rows={4}
        value={prompt} onChange={e=>setPrompt(e.target.value)} />
      <div className="flex gap-2">
        <input className="flex-1 border p-2 rounded" value={style} onChange={e=>setStyle(e.target.value)} />
        <button onClick={generate} disabled={loading}
          className="px-4 py-2 bg-black text-white rounded">
          {loading ? "Generating…" : "Generate"}
        </button>
      </div>
      {err && <p className="text-red-600 text-sm">{err}</p>}
      {src && <video src={src} controls className="w-full rounded" />}
      <p className="text-xs text-gray-500">Default style: kling-1.0-pro</p>
    </div>
  );
}
