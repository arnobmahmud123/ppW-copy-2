import { db } from "@/lib/db";
import type { MessagingAccessContext } from "@/modules/messaging/types";

function serializeCall(call: {
  id: string;
  roomName: string;
  title: string | null;
  mode: "AUDIO" | "VIDEO";
  status: string;
  startedAt: Date;
  endedAt: Date | null;
  createdByUser: { id: string; name: string } | null;
  participants: Array<{
    id: string;
    userId: string;
    joinedAt: Date;
    leftAt: Date | null;
    lastSeenAt: Date;
    micEnabled: boolean;
    cameraEnabled: boolean;
    user: { id: string; name: string };
  }>;
}) {
  return {
    id: call.id,
    roomName: call.roomName,
    title: call.title,
    mode: call.mode,
    status: call.status,
    startedAt: call.startedAt,
    endedAt: call.endedAt,
    createdByUser: call.createdByUser
      ? {
          id: call.createdByUser.id,
          name: call.createdByUser.name,
          avatarUrl: null,
        }
      : null,
    participants: call.participants.map((participant) => ({
      id: participant.id,
      userId: participant.userId,
      name: participant.user.name,
      avatarUrl: null,
      joinedAt: participant.joinedAt,
      leftAt: participant.leftAt,
      lastSeenAt: participant.lastSeenAt,
      micEnabled: participant.micEnabled,
      cameraEnabled: participant.cameraEnabled,
    })),
  };
}

async function loadActiveThreadCall(threadId: string) {
  const call = await db.messageCallSession.findFirst({
    where: {
      messageThreadId: threadId,
      endedAt: null,
      status: {
        in: ["RINGING", "ACTIVE"],
      },
    },
    orderBy: { startedAt: "desc" },
    include: {
      createdByUser: {
        select: {
          id: true,
          name: true,
        },
      },
      participants: {
        where: {
          leftAt: null,
        },
        orderBy: { joinedAt: "asc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  return call;
}

export async function getActiveThreadCall(threadId: string): Promise<unknown> {
  const call = await loadActiveThreadCall(threadId);
  return call ? serializeCall(call) : null;
}

export async function startOrJoinThreadCall(input: {
  context: MessagingAccessContext;
  threadId: string;
  mode: "AUDIO" | "VIDEO";
}): Promise<unknown> {
  let activeCall = await loadActiveThreadCall(input.threadId);

  if (!activeCall) {
    activeCall = await db.messageCallSession.create({
      data: {
        messageThreadId: input.threadId,
        createdByUserId: input.context.userId,
        roomName: `thread-${input.threadId}-${Date.now()}`,
        mode: input.mode,
        status: "ACTIVE",
        participants: {
          create: {
            userId: input.context.userId,
            micEnabled: true,
            cameraEnabled: input.mode === "VIDEO",
          },
        },
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
          },
        },
        participants: {
          where: {
            leftAt: null,
          },
          orderBy: { joinedAt: "asc" },
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return serializeCall(activeCall);
  }

  await db.messageCallParticipant.upsert({
    where: {
      messageCallSessionId_userId: {
        messageCallSessionId: activeCall.id,
        userId: input.context.userId,
      },
    },
    create: {
      messageCallSessionId: activeCall.id,
      userId: input.context.userId,
      micEnabled: true,
      cameraEnabled: activeCall.mode === "VIDEO",
    },
    update: {
      leftAt: null,
      lastSeenAt: new Date(),
      micEnabled: true,
      cameraEnabled: activeCall.mode === "VIDEO",
    },
  });

  await db.messageCallSession.update({
    where: { id: activeCall.id },
    data: {
      status: "ACTIVE",
      endedAt: null,
    },
  });

  const refreshedCall = await loadActiveThreadCall(input.threadId);
  return refreshedCall ? serializeCall(refreshedCall) : null;
}

export async function touchMessageCallParticipant(input: {
  context: MessagingAccessContext;
  callId: string;
  micEnabled?: boolean;
  cameraEnabled?: boolean;
}): Promise<void> {
  const call = await db.messageCallSession.findUnique({
    where: { id: input.callId },
    select: {
      id: true,
      mode: true,
    },
  });

  if (!call) {
    throw new Error("Call not found.");
  }

  await db.messageCallParticipant.upsert({
    where: {
      messageCallSessionId_userId: {
        messageCallSessionId: call.id,
        userId: input.context.userId,
      },
    },
    create: {
      messageCallSessionId: call.id,
      userId: input.context.userId,
      lastSeenAt: new Date(),
      micEnabled: input.micEnabled ?? true,
      cameraEnabled: input.cameraEnabled ?? (call.mode === "VIDEO"),
    },
    update: {
      leftAt: null,
      lastSeenAt: new Date(),
      micEnabled: input.micEnabled ?? true,
      cameraEnabled: input.cameraEnabled ?? (call.mode === "VIDEO"),
    },
  });

  await db.messageCallSession.update({
    where: { id: call.id },
    data: {
      status: "ACTIVE",
      endedAt: null,
    },
  });
}

export async function leaveMessageCall(input: {
  context: MessagingAccessContext;
  callId: string;
}): Promise<void> {
  const now = new Date();

  await db.messageCallParticipant.updateMany({
    where: {
      messageCallSessionId: input.callId,
      userId: input.context.userId,
      leftAt: null,
    },
    data: {
      leftAt: now,
      lastSeenAt: now,
    },
  });

  const remainingParticipants = await db.messageCallParticipant.count({
    where: {
      messageCallSessionId: input.callId,
      leftAt: null,
    },
  });

  if (remainingParticipants === 0) {
    await db.messageCallSession.update({
      where: { id: input.callId },
      data: {
        status: "ENDED",
        endedAt: now,
      },
    });
  }
}

export async function endMessageCall(input: {
  context: MessagingAccessContext;
  callId: string;
}): Promise<void> {
  const now = new Date();

  await db.messageCallSession.update({
    where: { id: input.callId },
    data: {
      status: "ENDED",
      endedAt: now,
      endedByUserId: input.context.userId,
    },
  });

  await db.messageCallParticipant.updateMany({
    where: {
      messageCallSessionId: input.callId,
      leftAt: null,
    },
    data: {
      leftAt: now,
      lastSeenAt: now,
    },
  });
}
