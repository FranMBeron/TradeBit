"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";

export function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const initials = user
    ? (user.displayName?.[0] ?? user.username[0] ?? "?").toUpperCase()
    : "?";

  const isTradesActive = pathname === "/copy-trades";

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-14 border-b border-border-subtle bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-5xl items-center justify-between px-4">

        {/* Logo — link al feed */}
        <div className="flex items-center gap-6">
          <Link
            href="/feed"
            className="group flex items-center gap-1.5 select-none"
          >
            {/* Icono pequeño tipo "ticker" */}
            <span
              className="text-base font-bold font-heading tracking-tighter transition-opacity group-hover:opacity-80"
              style={{ color: "#0d99ff" }}
            >
              Trade
            </span>
            <span
              className="rounded-md px-1 py-0.5 text-base font-bold font-heading tracking-tighter transition-opacity group-hover:opacity-80"
              style={{
                color: "#ffffff",
                background: "linear-gradient(135deg, #0d99ff 0%, #2e81fd 100%)",
              }}
            >
              Bit
            </span>
          </Link>

          {/* Nav: solo Trades */}
          {user && (
            <nav className="flex items-center">
              <Link
                href="/copy-trades"
                className={`relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium font-heading transition-all ${
                  isTradesActive
                    ? "bg-[#0d99ff]/15 text-[#0d99ff]"
                    : "text-muted-foreground hover:text-foreground hover:bg-card"
                }`}
              >
                {/* Dot indicador cuando está activo */}
                {isTradesActive && (
                  <span className="h-1.5 w-1.5 rounded-full bg-[#0d99ff]" />
                )}
                Trades
              </Link>
            </nav>
          )}
        </div>

        {/* Derecha: user info */}
        {user && (
          <div className="flex items-center gap-1">
            {/* Username — link al perfil */}
            <Link
              href={`/${user.username}`}
              className="hidden sm:flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-card transition-all group"
            >
              {/* Mini avatar inline */}
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0d99ff]/20 text-[10px] font-bold text-[#0d99ff] font-heading ring-1 ring-[#0d99ff]/30 shrink-0">
                {initials}
              </div>
              <span className="font-mono text-xs">@{user.username}</span>
            </Link>

            {/* Separador */}
            <div className="mx-1 h-4 w-px bg-border-subtle hidden sm:block" />

            {/* Log out — pill discreto */}
            <button
              onClick={logout}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:text-[#fe566b] hover:bg-[#fe566b]/8 transition-all font-medium"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span className="hidden sm:block">Log out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
