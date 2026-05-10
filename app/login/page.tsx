import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, signIn } from "@/lib/auth";
import { AuthError } from "next-auth";

type Search = Promise<{ error?: string; callbackUrl?: string }>;

const GOOGLE_ENABLED = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

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

  async function loginGoogle() {
    "use server";
    await signIn("google", { redirectTo: callbackUrl ?? "/lobby" });
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

          {GOOGLE_ENABLED && (
            <>
              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-white/10" />
                <span className="font-label text-label-caps text-on-surface-variant text-[10px]">OR</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>
              <form action={loginGoogle}>
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-surface-container border border-white/10 text-on-surface font-bold flex items-center justify-center gap-3 active:scale-95 hover:bg-white/5 transition-all"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.1A6.56 6.56 0 0 1 5.48 12c0-.73.13-1.44.36-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.94l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.65l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/>
                  </svg>
                  Continue with Google
                </button>
              </form>
            </>
          )}

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
