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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#14161c]/80 backdrop-blur-sm px-4"
      onClick={handleBackdrop}
    >
      <div className="w-full max-w-sm rounded-2xl border border-border-subtle bg-card p-6 shadow-2xl shadow-black/50">
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
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#63de77]/20 text-2xl text-[#63de77]">
              ✓
            </div>
            <p className="font-semibold text-[#63de77]">¡Trade ejecutado!</p>
          </div>
        ) : (
          <>
            {/* Trade info */}
            <div className="mb-5 flex items-center gap-2 rounded-xl border border-border-subtle bg-background-alt px-3 py-2.5">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wide ${
                  isBuy
                    ? "bg-[#2e81fd]/15 text-[#2e81fd] ring-1 ring-[#2e81fd]/30"
                    : "bg-[#fe566b]/15 text-[#fe566b] ring-1 ring-[#fe566b]/30"
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
            <div className="flex items-center rounded-xl border border-border bg-input px-3 py-2 focus-within:border-[#0d99ff]/50 focus-within:ring-1 focus-within:ring-[#0d99ff]/30">
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
                className="flex-1 rounded-xl border border-border py-2 text-sm text-muted-foreground transition hover:border-[#464851] hover:text-foreground disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleExecute}
                disabled={!canSubmit}
                className={`flex-1 rounded-xl py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 font-heading ${
                isBuy ? "bg-[#2e81fd] hover:bg-[#0d99ff]" : "bg-[#fe566b] hover:bg-[#e04560]"
              }`}
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
