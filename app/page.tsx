"use client";

import { useEffect, useRef, useState } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([{
    role: "assistant",
    content:
      "Hi! I?m HappyHearts Assistant. How can I help you with your booking today?",
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = (await res.json()) as { reply: string };
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "Sorry, I had trouble replying just now. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      minHeight: "100svh",
      background: "#0b1220",
      color: "#e5e7eb",
      padding: "16px",
    }}>
      <header style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "8px 0 16px",
        borderBottom: "1px solid #1f2937",
        marginBottom: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: "linear-gradient(135deg,#d946ef,#22d3ee)",
          }} />
          <div>
            <div style={{ fontWeight: 700 }}>HAPPY HEARTS ? Assistant</div>
            <div style={{ fontSize: 12, color: "#9ca3af" }}>
              WhatsApp-style booking helper
            </div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: "#9ca3af" }}>Online</div>
      </header>

      <main style={{
        flex: 1,
        maxWidth: 820,
        width: "100%",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
      }}>
        <div style={{
          flex: 1,
          overflowY: "auto",
          padding: 12,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}>
          {messages.map((m, i) => (
            <div key={i} style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "92%",
              background: m.role === "user" ? "#2563eb" : "#111827",
              color: "#e5e7eb",
              padding: "10px 12px",
              borderRadius: 12,
              borderTopRightRadius: m.role === "user" ? 4 : 12,
              borderTopLeftRadius: m.role === "assistant" ? 4 : 12,
              boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset",
              whiteSpace: "pre-wrap",
            }}>
              {m.content}
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <form onSubmit={sendMessage} style={{ display: "flex", gap: 8, padding: 8 }}>
          <input
            aria-label="Type a message"
            placeholder="Type your message?"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            style={{
              flex: 1,
              padding: "12px 14px",
              background: "#0a0f1a",
              border: "1px solid #1f2937",
              borderRadius: 10,
              outline: "none",
              color: "#e5e7eb",
            }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            style={{
              padding: "12px 16px",
              background: loading ? "#374151" : "#22c55e",
              border: 0,
              borderRadius: 10,
              color: "#0b1220",
              fontWeight: 700,
              cursor: loading ? "default" : "pointer",
            }}
          >
            {loading ? "?" : "Send"}
          </button>
        </form>
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          padding: 8,
          color: "#9ca3af",
          fontSize: 12,
        }}>
          <QuickChip label="Check availability" set={setInput} send={sendMessage} />
          <QuickChip label="What?s the price?" set={setInput} send={sendMessage} />
          <QuickChip label="Send photos" set={setInput} send={sendMessage} />
          <QuickChip label="Book for 50 guests on 24 Dec" set={setInput} send={sendMessage} />
        </div>
      </main>
    </div>
  );
}

function QuickChip({ label, set, send }: { label: string; set: (v: string) => void; send: (e?: React.FormEvent) => void }) {
  return (
    <button
      type="button"
      onClick={() => { set(label); setTimeout(() => send(), 0); }}
      style={{
        padding: "8px 10px",
        background: "#111827",
        border: "1px solid #1f2937",
        borderRadius: 999,
        color: "#e5e7eb",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}
