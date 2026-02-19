"use client";

import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";

export function Navbar() {
  const { user, logout } = useAuth();

  const initials = user
    ? (user.displayName?.[0] ?? user.username[0] ?? "?").toUpperCase()
    : "?";

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-14 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-full max-w-5xl items-center justify-between px-4">
        {/* Logo + nav */}
        <div className="flex items-center gap-5">
          <span className="text-lg font-bold text-primary tracking-tight">TradeBit</span>
          {user && (
            <nav className="flex items-center gap-4">
              <Link
                href="/feed"
                className="text-sm text-muted-foreground hover:text-foreground transition"
              >
                Feed
              </Link>
              <Link
                href="/copy-trades"
                className="text-sm text-muted-foreground hover:text-foreground transition"
              >
                Trades
              </Link>
            </nav>
          )}
        </div>

        {/* User info + logout */}
        {user && (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary ring-1 ring-primary/30">
              {initials}
            </div>
            <Link
              href={`/${user.username}`}
              className="hidden text-sm text-muted-foreground hover:text-foreground transition sm:block"
            >
              @{user.username}
            </Link>
            <button
              onClick={logout}
              className="text-xs text-muted-foreground underline underline-offset-4 transition hover:text-foreground"
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
