import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDemoUserAvatar, isDemoPortraitUrl } from "@/lib/demo-user-avatars";

export async function GET() {
  try {
    const channels = await db.messageThread.findMany({
      where: { 
        threadType: "GENERAL"
      }
    });

    let updatedCount = 0;
    for (const channel of channels) {
      let logoUrl = "";
      const titleLower = (channel.title || "").toLowerCase();

      // Refining domains for better Clearbit success
      if (titleLower.includes("mcs")) logoUrl = "https://logo.clearbit.com/mcs360.com";
      else if (titleLower.includes("servicelink")) logoUrl = "https://logo.clearbit.com/svclnk.com";
      else if (titleLower.includes("msi")) logoUrl = "https://logo.clearbit.com/msionline.com";
      else if (titleLower.includes("cyprexx")) logoUrl = "https://logo.clearbit.com/cyprexx.com";
      else if (titleLower.includes("altisource")) logoUrl = "https://logo.clearbit.com/altisource.com";
      else if (titleLower.includes("singlesource")) logoUrl = "https://logo.clearbit.com/singlesource.com"; // Changed from singlesourceproperty.com
      else if (titleLower.includes("nfr")) logoUrl = "https://logo.clearbit.com/nfronline.com";
      else if (titleLower.includes("guardian")) logoUrl = "https://logo.clearbit.com/guardianassetmgt.com";
      else if (titleLower.includes("mortgage assets") || titleLower.includes("mams")) logoUrl = "https://logo.clearbit.com/mams.com";
      else if (titleLower.includes("assurant")) logoUrl = "https://logo.clearbit.com/assurant.com";
      else if (titleLower.includes("nationstar") || titleLower.includes("mr. cooper")) logoUrl = "https://logo.clearbit.com/mrcooper.com";
      else {
        const fallbackName = channel.title || "Channel";
        logoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackName)}&background=random&color=fff&bold=true`;
      }

      await db.messageThread.update({
        where: { id: channel.id },
        data: { channelImageUrl: logoUrl }
      });
      updatedCount++;
    }

    const users = await db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
      },
    });

    let updatedUsers = 0;
    for (const user of users) {
      const nextAvatarUrl = getDemoUserAvatar(user);
      const currentAvatarUrl = user.avatarUrl?.trim() ?? null;
      const shouldUpdateUser =
        !currentAvatarUrl ||
        currentAvatarUrl.startsWith("data:image/svg+xml") ||
        currentAvatarUrl.includes("ui-avatars.com") ||
        currentAvatarUrl.includes("via.placeholder.com") ||
        isDemoPortraitUrl(currentAvatarUrl);

      if (!shouldUpdateUser) {
        continue;
      }

      await db.user.update({
        where: { id: user.id },
        data: { avatarUrl: nextAvatarUrl },
      });
      updatedUsers++;
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully assigned profile photos to ${updatedCount} channels and ${updatedUsers} users.` 
    });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
