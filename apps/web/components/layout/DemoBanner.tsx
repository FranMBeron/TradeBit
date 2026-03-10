export function DemoBanner() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 flex items-center justify-center gap-2 border-t border-[#0d99ff]/20 bg-[#0d99ff]/8 px-4 py-2 backdrop-blur-sm">
      <span className="text-xs font-medium text-[#0d99ff]/80">
        Modo Demo — Explorá TradeBit con datos de ejemplo
      </span>
      <span className="text-[#0d99ff]/40 text-xs">·</span>
      <span className="text-xs text-muted-foreground/60">
        La integración con Wallbit está simulada
      </span>
    </div>
  );
}
