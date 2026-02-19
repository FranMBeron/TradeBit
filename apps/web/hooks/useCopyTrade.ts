"use client";

import { useCallback, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Post } from "@/types/feed";

interface CopyTradeState {
  open: boolean;
  postId: string | null;
  ticker: string;
  action: "BUY" | "SELL";
  price: string | null;
  loading: boolean;
  success: boolean;
  error: string | null;
}

const initialState: CopyTradeState = {
  open: false,
  postId: null,
  ticker: "",
  action: "BUY",
  price: null,
  loading: false,
  success: false,
  error: null,
};

export function useCopyTrade() {
  const [state, setState] = useState<CopyTradeState>(initialState);

  const openModal = useCallback((post: Post) => {
    if (!post.tradeTicker) return;
    setState({
      open: true,
      postId: post.id,
      ticker: post.tradeTicker,
      action: post.tradeAction ?? "BUY",
      price: post.tradePrice,
      loading: false,
      success: false,
      error: null,
    });
  }, []);

  const closeModal = useCallback(() => {
    setState(initialState);
  }, []);

  const execute = useCallback(
    async (amount: number) => {
      if (!state.postId) return;
      setState((s) => ({ ...s, loading: true, error: null }));

      try {
        await apiFetch(`/copy-trade/${state.postId}`, {
          method: "POST",
          body: { amount },
        });
        setState((s) => ({ ...s, loading: false, success: true }));
        // Auto-cerrar después de mostrar el éxito
        setTimeout(() => setState(initialState), 1800);
      } catch (err: any) {
        const rawError = err?.error ?? "";
        const msg =
          rawError.toLowerCase().includes("wallbit") || rawError.toLowerCase().includes("key")
            ? "Necesitás conectar tu cuenta Wallbit para copiar trades."
            : rawError || "Error al ejecutar el trade. Intentá de nuevo.";
        setState((s) => ({ ...s, loading: false, error: msg }));
      }
    },
    [state.postId],
  );

  return { ...state, openModal, closeModal, execute };
}
