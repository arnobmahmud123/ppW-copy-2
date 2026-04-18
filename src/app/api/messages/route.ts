import { NextResponse } from "next/server";
import { getAppSession } from "@/lib/app-session";
import { getMessagingAccessContext, getMessagingNotificationSummary } from "@/modules/messaging";

export async function GET() {
  const session = await getAppSession();

  if (!session?.id) {
    return NextResponse.json({ totalBadgeCount: 0, unreadMessages: 0, pendingNotifications: 0 });
  }

  const context = await getMessagingAccessContext(session.id);

  if (!context) {
    return NextResponse.json({ totalBadgeCount: 0, unreadMessages: 0, pendingNotifications: 0 });
  }

  const summary = await getMessagingNotificationSummary(context);

  return NextResponse.json(summary);
}
