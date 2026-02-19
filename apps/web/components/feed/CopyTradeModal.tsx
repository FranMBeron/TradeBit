"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";

interface CopyTradeModalProps {
  ticker: string;
  action: "BUY" | "SELL";
  price: string | null;
  loading: boolean;
  success: boolean;
  error: string | null;
  closeModal: () => void;
  execute: (amount: number) => Promise<void>;
}

export function CopyTradeModal({
  ticker,
  action,
  price,
  loading,
  success,
  error,
  closeModal,
  execute,
}: CopyTradeModalProps) {
  const [amount, setAmount] = useState("");

  const isBuy = action === "BUY";
  const canSubmit = !!amount && parseFloat(amount) > 0 && !loading && !success;

  function handleBackdrop(e: React.MouseEvent) {
    if (e.target === e.currentTarget) closeModal();
  }

  async function handleExecute() {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) return;
    await execute(parsed);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={handleBackdrop}
    >
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Copiar Trade</h2>
          <button
            onClick={closeModal}
            disabled={loading}
            className="text-muted-foreground transition hover:text-foreground disabled:opacity-50"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Success state */}
        {success ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-2xl">
              ✓
            </div>
            <p className="font-semibold text-primary">¡Trade ejecutado!</p>
          </div>
        ) : (
          <>
            {/* Trade info */}
            <div className="mb-5 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                  isBuy
                    ? "bg-primary/15 text-primary ring-1 ring-primary/25"
                    : "bg-destructive/15 text-destructive ring-1 ring-destructive/25"
                }`}
              >
                {action}
              </span>
              <span className="font-mono text-sm font-semibold text-foreground">{ticker}</span>
              {price && (
                <>
                  <span className="text-muted-foreground/50">·</span>
                  <span className="text-sm text-muted-foreground">
                    @ {formatCurrency(price)}
                  </span>
                </>
              )}
            </div>

            {/* Amount input */}
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Monto (USD)
            </label>
            <div className="flex items-center rounded-lg border border-border bg-input px-3 py-2 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/30">
              <span className="mr-1 text-sm text-muted-foreground">$</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                min={0}
                step="0.01"
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                onKeyDown={(e) => { if (e.key === "Enter" && canSubmit) handleExecute(); }}
                autoFocus
              />
            </div>

            {/* Error */}
            {error && (
              <p className="mt-2 text-xs text-destructive">{error}</p>
            )}

            {/* Actions */}
            <div className="mt-5 flex items-center justify-between gap-3">
              <button
                onClick={closeModal}
                disabled={loading}
                className="flex-1 rounded-lg border border-border py-2 text-sm text-muted-foreground transition hover:border-foreground/30 hover:text-foreground disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleExecute}
                disabled={!canSubmit}
                className="flex-1 rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Ejecutando..." : "Ejecutar Trade →"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
