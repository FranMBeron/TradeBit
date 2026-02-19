"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleResend() {
    setStatus("sending");
    try {
      await apiFetch("/auth/resend-verification", {
        method: "POST",
        body: { email },
      });
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl p-8 shadow-xl text-center">
      <div className="mb-4 text-4xl">✉️</div>
      <h1 className="text-xl font-semibold text-foreground mb-2">Check your email</h1>
      <p className="text-sm text-muted-foreground mb-1">We sent a verification link to</p>
      {email && <p className="text-sm font-medium text-foreground mb-6">{email}</p>}
      <p className="text-xs text-muted-foreground mb-6">
        Click the link in the email to verify your account. The link expires in 24 hours.
      </p>

      {status === "sent" && (
        <p className="text-xs text-green-500 mb-4">Email resent! Check your inbox.</p>
      )}
      {status === "error" && (
        <p className="text-xs text-destructive mb-4">Could not resend. Try again later.</p>
      )}

      <Button
        variant="outline"
        className="w-full"
        onClick={handleResend}
        disabled={status === "sending" || status === "sent"}
      >
        {status === "sending" ? "Sending…" : status === "sent" ? "Sent!" : "Resend verification email"}
      </Button>

      <p className="mt-4 text-xs text-muted-foreground">
        Wrong email?{" "}
        <Link href="/register" className="text-primary hover:underline">
          Register again
        </Link>
      </p>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}
