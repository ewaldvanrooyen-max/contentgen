"use client";

import { useEffect, useState } from "react";

export default function DashboardPage() {
  const [topics, setTopics] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [content, setContent] = useState<string>("");

  // Fetch trending topics
  useEffect(() => {
    fetch("/api/trends")
      .then((res) => res.json())
      .then((data) => setTopics(data.topics || []));
  }, []);

  async function handleGenerate(topic: string) {
    setSelected(topic);
    setContent("Loading...");

    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic }),
    });

    const data = await res.json();
    setContent(data.content || "No content returned");
  }

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
        ContentGen Dashboard
      </h1>

      <h2>Trending Topics</h2>
      <ul>
        {topics.map((t) => (
          <li key={t}>
            <button
              onClick={() => handleGenerate(t)}
              style={{
                background: "#111",
                color: "white",
                border: "none",
                padding: "0.5rem 1rem",
                margin: "0.25rem",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              Generate: {t}
            </button>
          </li>
        ))}
      </ul>

      {selected && (
        <div style={{ marginTop: "2rem" }}>
          <h2>Generated Content for: {selected}</h2>
          <pre
            style={{
              background: "#f4f4f4",
              padding: "1rem",
              borderRadius: "6px",
              whiteSpace: "pre-wrap",
            }}
          >
            {content}
          </pre>
        </div>
      )}
    </div>
  );
}
