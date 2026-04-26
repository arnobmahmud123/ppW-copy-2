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
  address?: string;
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
    select: { name: true, email: true, role: true, phone: true, company: true, address: true, avatarUrl: true }
  });

  return {
    id: session.user.id,
    name: dbUser?.name ?? (session.user.name || ""),
    email: dbUser?.email ?? (session.user.email || ""),
    role: dbUser?.role ?? (session.user.role || ""),
    userType: dbUser?.role ?? (session.user.role || ""),
    phone: dbUser?.phone ?? session.user.phone,
    company: dbUser?.company ?? session.user.company,
    address: dbUser?.address ?? undefined,
    avatarUrl: dbUser?.avatarUrl ?? null,
    roles: [dbUser?.role ?? (session.user.role || "")]
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
