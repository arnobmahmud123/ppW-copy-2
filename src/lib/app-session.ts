import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export interface AppSession {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  company?: string;
  avatarUrl?: string | null;
  userType?: string;
  roles?: string[];
}

/**
 * Get the current session, returns null if not authenticated
 */
export async function getAppSession(): Promise<AppSession | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return null;
  }

  // Fetch fresh essential details from DB since session JWT is immutable after login
  const dbUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: { avatarUrl: true }
  });

  return {
    id: session.user.id,
    name: session.user.name || "",
    email: session.user.email || "",
    role: session.user.role || "",
    userType: session.user.role || "",
    phone: session.user.phone,
    company: session.user.company,
    avatarUrl: dbUser?.avatarUrl ?? null,
    roles: [session.user.role || ""]
  };
}

/**
 * Require an authenticated session, redirects to login if not authenticated
 */
export async function requireAppSession(): Promise<AppSession> {
  const session = await getAppSession();

  if (!session) {
    redirect("/auth/signin");
  }

  return session;
}
