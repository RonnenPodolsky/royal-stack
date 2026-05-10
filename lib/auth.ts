import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { verifyCredentials } from "@/lib/server/credentials";
import { getOrCreateUser, getUser } from "@/lib/server/users";

const providers: Provider[] = [
  Credentials({
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    authorize: async (credentials) => {
      const email = String(credentials?.email ?? "");
      const password = String(credentials?.password ?? "");
      if (!email || !password) return null;
      const verified = await verifyCredentials(email, password);
      if (!verified) return null;
      return {
        id: verified.userId,
        email: verified.email,
        name: verified.displayName,
      };
    },
  }),
];

// Google OAuth — only enabled when GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET are
// present. Lets the app run locally without the credentials.
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      // For Google OAuth: ensure the Google user has an underlying user
      // record. Identifier is the Google account's `sub` (stable Google user id).
      if (account?.provider === "google" && account.providerAccountId) {
        const googleUserKey = `google:${account.providerAccountId}`;
        const record = await getOrCreateUser(googleUserKey);
        if (user.name) record.displayName = user.name;
        user.id = record.id;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) token.userId = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token.userId && session.user) {
        session.user.id = String(token.userId);
        // Refresh displayName from the live user record so it reflects updates.
        const u = await getUser(session.user.id);
        if (u) session.user.name = u.displayName;
      }
      return session;
    },
  },
});
