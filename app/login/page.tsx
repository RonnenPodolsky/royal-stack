import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, signIn } from "@/lib/auth";
import { AuthError } from "next-auth";

type Search = Promise<{ error?: string; callbackUrl?: string }>;

export default async function LoginPage({ searchParams }: { searchParams: Search }) {
  const { error, callbackUrl } = await searchParams;
  const session = await auth();
  if (session?.user) redirect(callbackUrl ?? "/lobby");

  async function login(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: (formData.get("callbackUrl") as string) || "/lobby",
      });
    } catch (e) {
      if (e instanceof AuthError) {
        redirect(`/login?error=invalid${callbackUrl ? `&callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`);
      }
      throw e;
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <Link href="/lobby" className="text-headline-sm font-display font-black text-primary tracking-tighter">
            Royal Stack
          </Link>
          <p className="text-on-surface-variant text-sm mt-2">VIP Lounge — Elite Tier</p>
        </div>

        <div className="glass-panel rounded-xl p-8">
          <h1 className="text-headline-md font-display text-on-surface mb-1">Sign In</h1>
          <p className="text-on-surface-variant text-sm mb-6">Welcome back, high roller.</p>

          {error === "invalid" && (
            <div className="mb-4 p-3 rounded-lg bg-error-container/20 border border-error/30 text-error text-sm">
              Invalid email or password.
            </div>
          )}

          <form action={login} className="space-y-4">
            <input type="hidden" name="callbackUrl" value={callbackUrl ?? ""} />
            <Field name="email" type="email" label="EMAIL" placeholder="you@royalstack.app" />
            <Field name="password" type="password" label="PASSWORD" placeholder="••••••••" />
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-primary text-on-primary font-bold text-label-caps tracking-widest active:scale-95 hover:brightness-110 transition-all shadow-lg shadow-primary/20"
            >
              SIGN IN
            </button>
          </form>

          <p className="text-on-surface-variant text-sm mt-6 text-center">
            New player?{" "}
            <Link href="/register" className="text-primary font-bold hover:underline">
              Register
            </Link>
          </p>
        </div>

        <p className="text-on-surface-variant text-xs mt-6 text-center">
          Or{" "}
          <Link href="/lobby" className="text-on-surface hover:text-primary">
            browse the lobby as a guest
          </Link>
          .
        </p>
      </div>
    </main>
  );
}

function Field({ name, type, label, placeholder }: { name: string; type: string; label: string; placeholder: string }) {
  return (
    <label className="block">
      <span className="font-label text-label-caps text-on-surface-variant block mb-2">{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required
        className="w-full bg-surface-container border border-white/10 rounded-lg px-4 py-3 text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
      />
    </label>
  );
}
