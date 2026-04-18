import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

function canManageSupportTickets(role: string) {
  return role === "ADMIN" || role === "COORDINATOR";
}

async function getNextSupportTicketNumber() {
  const latest = await prisma.supportTicket.findFirst({
    select: { ticketNumber: true },
    orderBy: { createdAt: "desc" },
  });

  const currentNumber = latest?.ticketNumber?.match(/SUP-(\d+)/)?.[1];
  const nextNumber = Number.parseInt(currentNumber ?? "0", 10) + 1;
  return `SUP-${String(nextNumber).padStart(4, "0")}`;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session.user.role) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const where = canManageSupportTickets(session.user.role)
      ? {}
      : { createdByUserId: session.user.id };

    const tickets = await prisma.supportTicket.findMany({
      where,
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
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    });

    return NextResponse.json({
      tickets,
      permissions: {
        canClose: canManageSupportTickets(session.user.role),
      },
    });
  } catch (error) {
    console.error("Support tickets fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session.user.role) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await request.json().catch(() => ({}));
    const subject = String(json.subject ?? "").trim();
    const description = String(json.description ?? "").trim();
    const rawPriority = String(json.priority ?? "MEDIUM").trim().toUpperCase();
    const priority = ["LOW", "MEDIUM", "HIGH", "URGENT"].includes(rawPriority) ? rawPriority : "MEDIUM";

    if (!subject || !description) {
      return NextResponse.json({ error: "Subject and description are required." }, { status: 400 });
    }

    const ticketNumber = await getNextSupportTicketNumber();

    const ticket = await prisma.supportTicket.create({
      data: {
        ticketNumber,
        subject,
        description,
        priority: priority as "LOW" | "MEDIUM" | "HIGH" | "URGENT",
        createdByUserId: session.user.id,
        comments: {
          create: {
            body: description,
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

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error) {
    console.error("Support ticket creation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
