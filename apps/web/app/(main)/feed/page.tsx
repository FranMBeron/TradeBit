"use client";

import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

export default function FeedPage() {
  const router = useRouter();

  async function handleLogout() {
    await apiFetch("/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <p className="text-muted-foreground">Feed coming in Step 9</p>
      <button
        onClick={handleLogout}
        className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground transition"
      >
        Log out
      </button>
    </div>
  );
}
