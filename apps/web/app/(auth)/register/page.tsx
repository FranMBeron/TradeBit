"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

interface FieldError {
  path: string[];
  message: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", username: "", password: "" });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  function setField(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: "" }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setLoading(true);

    try {
      await apiFetch("/auth/register", {
        method: "POST",
        body: form,
      });
      router.push("/connect-wallbit");
    } catch (err: unknown) {
      const e = err as { error?: string; issues?: FieldError[] };
      if (e?.issues) {
        const map: Record<string, string> = {};
        for (const issue of e.issues) {
          const field = issue.path[0];
          if (field) map[field] = issue.message;
        }
        setFieldErrors(map);
      } else {
        setError(e?.error ?? "Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl p-8 shadow-xl">
      <h1 className="text-xl font-semibold text-foreground mb-1">Create account</h1>
      <p className="text-sm text-muted-foreground mb-6">Join the trading community</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {(["email", "username", "password"] as const).map((field) => (
          <div key={field} className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {field}
            </label>
            <input
              type={field === "password" ? "password" : field === "email" ? "email" : "text"}
              value={form[field]}
              onChange={(e) => setField(field, e.target.value)}
              required
              placeholder={
                field === "email"
                  ? "you@example.com"
                  : field === "username"
                    ? "trader_name"
                    : "••••••••"
              }
              className={`w-full rounded-lg border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition ${fieldErrors[field] ? "border-destructive" : "border-input"}`}
            />
            {fieldErrors[field] && (
              <p className="text-xs text-destructive">{fieldErrors[field]}</p>
            )}
          </div>
        ))}

        {error && (
          <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-primary hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}
