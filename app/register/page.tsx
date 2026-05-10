"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: fd.get("email"),
          password: fd.get("password"),
          displayName: fd.get("displayName"),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Registration failed");
        setBusy(false);
        return;
      }
      // Auto sign-in
      const signInRes = await fetch("/api/auth/callback/credentials", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          email: String(fd.get("email") ?? ""),
          password: String(fd.get("password") ?? ""),
          redirect: "false",
        }),
      });
      if (signInRes.redirected || signInRes.ok) {
        router.push("/lobby");
        router.refresh();
      } else {
        // Fallback: send them to /login
        router.push("/login");
      }
    } catch {
      setError("Network error");
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <Link href="/lobby" className="text-headline-sm font-display font-black text-primary tracking-tighter">
            Royal Stack
          </Link>
          <p className="text-on-surface-variant text-sm mt-2">Open your VIP account</p>
        </div>

        <div className="glass-panel rounded-xl p-8">
          <h1 className="text-headline-md font-display text-on-surface mb-1">Register</h1>
          <p className="text-on-surface-variant text-sm mb-6">$10,000 starter bankroll on the house.</p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-error-container/20 border border-error/30 text-error text-sm">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <Field name="displayName" type="text" label="DISPLAY NAME" placeholder="Ace Vance" />
            <Field name="email" type="email" label="EMAIL" placeholder="you@royalstack.app" />
            <Field name="password" type="password" label="PASSWORD (8+ chars)" placeholder="••••••••" minLength={8} />
            <button
              type="submit"
              disabled={busy}
              className="w-full py-3 rounded-xl bg-primary text-on-primary font-bold text-label-caps tracking-widest active:scale-95 hover:brightness-110 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              {busy ? "CREATING…" : "CREATE ACCOUNT"}
            </button>
          </form>

          <p className="text-on-surface-variant text-sm mt-6 text-center">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-bold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

function Field({ name, type, label, placeholder, minLength }: { name: string; type: string; label: string; placeholder: string; minLength?: number }) {
  return (
    <label className="block">
      <span className="font-label text-label-caps text-on-surface-variant block mb-2">{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required
        minLength={minLength}
        className="w-full bg-surface-container border border-white/10 rounded-lg px-4 py-3 text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
      />
    </label>
  );
}
