"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

export default function ConnectWallbitPage() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await apiFetch("/wallbit/connect", {
        method: "POST",
        body: { apiKey },
      });
      router.push("/feed");
    } catch (err: unknown) {
      const e = err as { error?: string };
      setError(e?.error ?? "Could not connect account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-card border border-border-subtle rounded-2xl p-8 shadow-2xl shadow-black/40 ring-1 ring-border-subtle">
      <h1 className="text-xl font-semibold text-foreground mb-1">Connect Wallbit</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Link your Wallbit account to share real trades and copy other traders.
      </p>

      <div className="mb-6 rounded-xl bg-[#0d99ff]/5 border border-[#0d99ff]/20 px-4 py-4 text-xs text-muted-foreground space-y-1.5">
        <p className="font-medium text-foreground">Where to find your API key:</p>
        <p>1. Log in to <a href="https://wallbit.io" target="_blank" rel="noopener noreferrer" className="text-[#0d99ff] hover:text-[#2e81fd] transition-colors underline underline-offset-2">wallbit.io</a></p>
        <p>2. Go to Settings → API Keys</p>
        <p>3. Generate a new key and paste it below</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            required
            placeholder="wb_live_••••••••••••"
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition font-mono"
          />
        </div>

        {error && (
          <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 font-heading"
          style={{
            background: "linear-gradient(135deg, #0d99ff 0%, #2e81fd 100%)",
          }}
        >
          {loading ? "Connecting…" : "Connect Wallbit →"}
        </button>
      </form>

      <p className="mt-4 text-center">
        <button
          type="button"
          onClick={() => router.push("/feed")}
          className="text-sm text-muted-foreground hover:text-foreground transition underline underline-offset-4"
        >
          Skip for now →
        </button>
      </p>
    </div>
  );
}
