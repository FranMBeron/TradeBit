"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
    <div className="bg-card border border-border rounded-xl p-8 shadow-xl">
      <h1 className="text-xl font-semibold text-foreground mb-1">Connect Wallbit</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Link your Wallbit account to share real trades and copy other traders.
      </p>

      <div className="mb-6 rounded-lg bg-secondary/50 border border-border px-4 py-3 text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">Where to find your API key:</p>
        <p>1. Log in to <span className="text-primary">wallbit.io</span></p>
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
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition font-mono"
          />
        </div>

        {error && (
          <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Connecting…" : "Connect account"}
        </Button>
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
