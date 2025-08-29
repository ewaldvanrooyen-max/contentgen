import { Buffer } from 'buffer';

export async function vyroTextToVideo({
  prompt,
  style,
  signal,
}: { prompt: string; style?: string; signal?: AbortSignal }) {
  const base = process.env.IMAGINE_API_BASE!;
  const key  = process.env.IMAGINE_API_KEY!;
  if (!base || !key) throw new Error("Imagine Art not configured");

  const fd = new FormData();
  fd.set("style", style || process.env.IMAGINE_DEFAULT_STYLE || "kling-1.0-pro");
  fd.set("prompt", prompt);

  const res = await fetch(`${base}/video/text-to-video`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: fd,
    signal,
  });

  const ctype = res.headers.get("content-type") || "";
  if (!res.ok) {
    const msg = ctype.includes("application/json")
      ? JSON.stringify(await res.json())
      : await res.text();
    throw new Error(`Imagine Art error ${res.status}: ${msg}`);
  }

  if (ctype.includes("application/json")) {
    const data = await res.json();
    if (data.url) return { kind: "url" as const, url: data.url };
    if (data.base64) return { kind: "dataurl" as const, dataUrl: `data:video/mp4;base64,${data.base64}` };
    throw new Error("Unexpected JSON response");
  } else {
    const buf = new Uint8Array(await res.arrayBuffer());
    const b64 = Buffer.from(buf).toString("base64");
    return { kind: "dataurl" as const, dataUrl: `data:video/mp4;base64,${b64}` };
  }
}
