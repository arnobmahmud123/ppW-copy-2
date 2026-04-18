import { redirect } from "next/navigation";

import { requireAppSession } from "@/lib/app-session";

export default async function CurrentProfilePage() {
  const session = await requireAppSession();
  redirect(`/users/${session.id}`);
}
