export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <span className="text-2xl font-bold text-primary">TradeBit</span>
          <p className="text-xs text-muted-foreground mt-1 tracking-widest uppercase">
            Social Trading
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
