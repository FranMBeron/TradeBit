export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-background flex items-center justify-center p-4 overflow-hidden">
      {/* Gradiente radial azul sutil — identidad Wallbit */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(13, 153, 255, 0.08) 0%, transparent 100%)",
        }}
      />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <h1
            className="text-3xl font-bold font-heading tracking-tight"
            style={{ color: "#0d99ff" }}
          >
            TradeBit
          </h1>
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className="h-px flex-1 bg-border-subtle" />
            <p className="text-xs text-muted-foreground tracking-widest uppercase px-2">
              Social Trading
            </p>
            <div className="h-px flex-1 bg-border-subtle" />
          </div>
          <p className="mt-2 text-xs text-muted-foreground/60">
            Powered by{" "}
            <a
              href="https://wallbit.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#0d99ff] hover:text-[#2e81fd] transition-colors"
            >
              Wallbit
            </a>
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
