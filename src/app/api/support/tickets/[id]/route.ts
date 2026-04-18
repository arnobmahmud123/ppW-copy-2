import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

function canManageSupportTickets(role: string) {
  return role === "ADMIN" || role === "COORDINATOR";
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session.user.role) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        createdByUser: {
          select: { id: true, name: true, email: true, role: true, avatarUrl: true },
        },
        assignedToUser: {
          select: { id: true, name: true, email: true, role: true, avatarUrl: true },
        },
        closedByUser: {
          select: { id: true, name: true, email: true, role: true, avatarUrl: true },
        },
        comments: {
          include: {
            createdByUser: {
              select: { id: true, name: true, email: true, role: true, avatarUrl: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    }

    if (!canManageSupportTickets(session.user.role) && ticket.createdByUserId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json({
      ticket,
      permissions: {
        canClose: canManageSupportTickets(session.user.role),
      },
    });
  } catch (error) {
    console.error("Support ticket detail error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session.user.role) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const json = await request.json().catch(() => ({}));
    const action = String(json.action ?? "").trim();
    const body = String(json.body ?? "").trim();

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      select: {
        id: true,
        createdByUserId: true,
        status: true,
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    }

    const canManage = canManageSupportTickets(session.user.role);
    if (!canManage && ticket.createdByUserId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (action === "comment") {
      if (!body) {
        return NextResponse.json({ error: "Reply message is required." }, { status: 400 });
      }

      const comment = await prisma.supportTicketComment.create({
        data: {
          supportTicketId: id,
          createdByUserId: session.user.id,
          body,
        },
        include: {
          createdByUser: {
            select: { id: true, name: true, email: true, role: true, avatarUrl: true },
          },
        },
      });

      await prisma.supportTicket.update({
        where: { id },
        data: {
          status: ticket.status === "OPEN" && canManage ? "IN_PROGRESS" : ticket.status,
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({ comment });
    }

    if (action === "close") {
      if (!canManage) {
        return NextResponse.json({ error: "Only admin or coordinator can close tickets." }, { status: 403 });
      }

      const updated = await prisma.supportTicket.update({
        where: { id },
        data: {
          status: "CLOSED",
          closedAt: new Date(),
          closedByUserId: session.user.id,
          comments: {
            create: {
              body: "Ticket closed.",
              isSystem: true,
              createdByUserId: session.user.id,
            },
          },
        },
        include: {
          createdByUser: {
            select: { id: true, name: true, email: true, role: true, avatarUrl: true },
          },
          assignedToUser: {
            select: { id: true, name: true, email: true, role: true, avatarUrl: true },
          },
          closedByUser: {
            select: { id: true, name: true, email: true, role: true, avatarUrl: true },
          },
          _count: {
            select: { comments: true },
          },
        },
      });

      return NextResponse.json({ ticket: updated });
    }

    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch (error) {
    console.error("Support ticket update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
