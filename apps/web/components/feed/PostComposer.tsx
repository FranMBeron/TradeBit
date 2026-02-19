"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import type { AuthUser, Post } from "@/types/feed";

interface PostComposerProps {
  user: AuthUser | null;
  onPost: (post: Post) => void;
}

// ── WallbitConnectModal ───────────────────────────────────────────────────────

interface WallbitConnectModalProps {
  onClose: () => void;
  onConnected: () => void;
}

function WallbitConnectModal({ onClose, onConnected }: WallbitConnectModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    if (!apiKey.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await apiFetch("/wallbit/connect", { method: "POST", body: { apiKey: apiKey.trim() } });
      onConnected();
    } catch (err: any) {
      setError(err?.error ?? "API key inválida. Verificá que sea correcta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Conectá tu cuenta Wallbit</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground transition hover:text-foreground"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Descripción */}
        <p className="mb-4 text-sm text-muted-foreground">
          Para compartir trades reales necesitás vincular tu API key de Wallbit.
        </p>

        {/* Input */}
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          API Key
        </label>
        <input
          type="text"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Pegá tu API key aquí..."
          className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
          onKeyDown={(e) => { if (e.key === "Enter") handleConnect(); }}
        />

        {/* Error */}
        {error && (
          <p className="mt-2 text-xs text-destructive">{error}</p>
        )}

        {/* Actions */}
        <div className="mt-5 flex items-center justify-between">
          <button
            onClick={onClose}
            className="text-sm text-muted-foreground underline underline-offset-4 transition hover:text-foreground"
          >
            Omitir por ahora
          </button>
          <button
            onClick={handleConnect}
            disabled={!apiKey.trim() || loading}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Conectando..." : "Conectar Wallbit →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── PostComposer ──────────────────────────────────────────────────────────────

export function PostComposer({ user, onPost }: PostComposerProps) {
  const [content, setContent] = useState("");
  const [showTrade, setShowTrade] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [ticker, setTicker] = useState("");
  const [action, setAction] = useState<"BUY" | "SELL">("BUY");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingWallbit, setCheckingWallbit] = useState(false);

  const initials = user
    ? (user.displayName?.[0] ?? user.username[0] ?? "?").toUpperCase()
    : "?";

  async function handleTradeToggle() {
    if (showTrade) {
      setShowTrade(false);
      setTicker("");
      setAmount("");
      return;
    }

    // Verificar si tiene Wallbit conectado antes de expandir
    setCheckingWallbit(true);
    try {
      const status = await apiFetch<{ connected: boolean }>("/wallbit/status");
      if (status.connected) {
        setShowTrade(true);
      } else {
        setShowConnectModal(true);
      }
    } catch {
      setShowConnectModal(true);
    } finally {
      setCheckingWallbit(false);
    }
  }

  function handleConnected() {
    setShowConnectModal(false);
    setShowTrade(true);
  }

  async function handleSubmit() {
    if (!content.trim()) return;
    setSubmitting(true);
    setError(null);

    const body: Record<string, unknown> = { content: content.trim() };
    if (showTrade && ticker.trim()) {
      body.tradeTicker = ticker.trim().toUpperCase();
      body.tradeAction = action;
      if (amount) body.tradeAmount = parseFloat(amount);
    }

    try {
      // El endpoint POST /posts retorna el row crudo sin author embedded.
      // Lo enriquecemos con los datos del user actual antes de pasarlo al feed.
      const { post: rawPost } = await apiFetch<{ post: Omit<Post, "author" | "reactions" | "userReactions"> }>("/posts", {
        method: "POST",
        body,
      });
      const post: Post = {
        ...rawPost,
        createdAt: rawPost.createdAt ?? new Date().toISOString(),
        author: {
          id: user?.id ?? "",
          username: user?.username ?? "",
          displayName: user?.displayName ?? null,
          avatarUrl: user?.avatarUrl ?? null,
        },
        reactions: { rocket: 0, chart: 0, speech: 0, diamond: 0 },
        userReactions: [],
      };
      onPost(post);
      // Reset form
      setContent("");
      setShowTrade(false);
      setTicker("");
      setAmount("");
    } catch (err: any) {
      setError(err?.error ?? "No se pudo publicar. Intentá de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex gap-3">
          {/* Avatar */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
            {initials}
          </div>

          <div className="flex-1 space-y-3">
            {/* Textarea */}
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="¿Qué estás operando hoy?"
              rows={2}
              maxLength={500}
              className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
            />

            {/* Trade embed panel */}
            {showTrade && (
              <div className="rounded-lg border border-border bg-background p-3 space-y-2">
                <div className="flex items-center gap-2">
                  {/* Ticker */}
                  <input
                    type="text"
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value.toUpperCase())}
                    placeholder="Ticker (ej: NVDA)"
                    maxLength={10}
                    className="w-28 rounded-md border border-border bg-input px-2 py-1.5 font-mono text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none uppercase"
                  />

                  {/* BUY / SELL toggle */}
                  <div className="flex rounded-md border border-border overflow-hidden">
                    {(["BUY", "SELL"] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setAction(opt)}
                        className={`px-3 py-1.5 text-xs font-bold transition ${
                          action === opt
                            ? opt === "BUY"
                              ? "bg-primary text-primary-foreground"
                              : "bg-destructive text-destructive-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>

                  {/* Amount */}
                  <div className="flex items-center rounded-md border border-border bg-input px-2 py-1.5 gap-1">
                    <span className="text-xs text-muted-foreground">$</span>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Monto"
                      min={0}
                      className="w-20 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {error && <p className="text-xs text-destructive">{error}</p>}

            {/* Footer: botón trade + char count + submit */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleTradeToggle}
                disabled={checkingWallbit}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                  showTrade
                    ? "bg-primary/15 text-primary hover:bg-primary/25"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                } disabled:opacity-50`}
              >
                <span>📊</span>
                <span>{checkingWallbit ? "..." : showTrade ? "Quitar trade" : "Adjuntar trade"}</span>
              </button>

              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground/50">
                  {content.length}/500
                </span>
                <button
                  onClick={handleSubmit}
                  disabled={!content.trim() || submitting}
                  className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "..." : "Post →"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showConnectModal && (
        <WallbitConnectModal
          onClose={() => setShowConnectModal(false)}
          onConnected={handleConnected}
        />
      )}
    </>
  );
}
