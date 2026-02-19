"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

function ConfirmEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("No verification token found in this link.");
      return;
    }

    apiFetch("/auth/verify-email", {
      method: "POST",
      body: { token },
    })
      .then(() => {
        setStatus("success");
        setTimeout(() => router.push("/connect-wallbit"), 1500);
      })
      .catch((err: { error?: string }) => {
        setStatus("error");
        setErrorMessage(err?.error ?? "Verification failed. The link may have expired.");
      });
  }, [token, router]);

  return (
    <div className="bg-card border border-border rounded-xl p-8 shadow-xl text-center">
      {status === "verifying" && (
        <>
          <div className="mb-4 text-4xl animate-pulse">⏳</div>
          <h1 className="text-xl font-semibold text-foreground">Verifying your email…</h1>
          <p className="text-sm text-muted-foreground mt-2">Just a moment</p>
        </>
      )}
      {status === "success" && (
        <>
          <div className="mb-4 text-4xl">✅</div>
          <h1 className="text-xl font-semibold text-foreground mb-2">Email verified!</h1>
          <p className="text-sm text-muted-foreground">Redirecting you to set up your account…</p>
        </>
      )}
      {status === "error" && (
        <>
          <div className="mb-4 text-4xl">❌</div>
          <h1 className="text-xl font-semibold text-foreground mb-2">Verification failed</h1>
          <p className="text-sm text-muted-foreground mb-6">{errorMessage}</p>
          <Link href="/register" className="text-sm text-primary hover:underline">
            Back to register
          </Link>
        </>
      )}
    </div>
  );
}

export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmEmailContent />
    </Suspense>
  );
}
