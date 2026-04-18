import { notFound } from "next/navigation";

import { UserAvatar } from "@/components/ui/user-avatar";
import { requireAppSession } from "@/lib/app-session";
import { db } from "@/lib/db";

type UserProfilePageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatRole(role: string) {
  return role
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value: Date | null | undefined) {
  if (!value) return "Not available";
  return value.toLocaleString();
}

export default async function UserProfilePage({ params }: UserProfilePageProps) {
  await requireAppSession();
  const { id } = await params;

  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      company: true,
      address: true,
      avatarUrl: true,
      createdAt: true,
      updatedAt: true,
      presence: {
        select: {
          status: true,
          lastActiveAt: true,
        },
      },
      _count: {
        select: {
          messageThreadMemberships: true,
          authoredMessages: true,
          workOrdersAssigned: true,
          workOrdersAsCoordinator: true,
          workOrdersAsProcessor: true,
          workOrdersAsClient: true,
        },
      },
    },
  });

  if (!user) {
    notFound();
  }

  const stats = [
    { label: "Chats", value: user._count.messageThreadMemberships },
    { label: "Messages", value: user._count.authoredMessages },
    { label: "Assigned WOs", value: user._count.workOrdersAssigned },
    { label: "Coordinator WOs", value: user._count.workOrdersAsCoordinator },
    { label: "Processor WOs", value: user._count.workOrdersAsProcessor },
    { label: "Client WOs", value: user._count.workOrdersAsClient },
  ].filter((item) => item.value > 0);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fffefe_0%,#f8f4ff_52%,#eef4ff_100%)] px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-4xl">
        <div className="overflow-hidden rounded-[2rem] border border-[#e8defd] bg-white shadow-[0_24px_70px_rgba(187,173,232,0.18)]">
          <div className="border-b border-[#efe7ff] bg-[linear-gradient(135deg,rgba(255,247,252,0.96)_0%,rgba(244,240,255,0.96)_50%,rgba(237,244,255,0.96)_100%)] px-8 py-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size="lg" />
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-slate-900">{user.name}</h1>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                      {formatRole(user.role)}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        user.presence?.status === "ONLINE"
                          ? "bg-emerald-50 text-emerald-700"
                          : user.presence?.status === "AWAY"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {user.presence?.status ? formatRole(user.presence.status) : "Offline"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-[#ece5ff] bg-white/85 px-4 py-3 text-sm text-slate-600 shadow-sm">
                <div className="font-semibold text-slate-800">Last active</div>
                <div>{formatDate(user.presence?.lastActiveAt)}</div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 px-8 py-8 lg:grid-cols-[1.2fr_0.8fr]">
            <section className="space-y-6">
              <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50/80 p-5">
                <h2 className="text-base font-bold text-slate-900">Contact details</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Email</div>
                    <div className="mt-1 text-sm font-medium text-slate-700">{user.email || "Not available"}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Phone</div>
                    <div className="mt-1 text-sm font-medium text-slate-700">{user.phone || "Not available"}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Company</div>
                    <div className="mt-1 text-sm font-medium text-slate-700">{user.company || "Not available"}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Address</div>
                    <div className="mt-1 text-sm font-medium text-slate-700">{user.address || "Not available"}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-slate-100 bg-white p-5 shadow-[0_10px_30px_rgba(180,168,228,0.08)]">
                <h2 className="text-base font-bold text-slate-900">Profile activity</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Created</div>
                    <div className="mt-1 text-sm font-medium text-slate-700">{formatDate(user.createdAt)}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Updated</div>
                    <div className="mt-1 text-sm font-medium text-slate-700">{formatDate(user.updatedAt)}</div>
                  </div>
                </div>
              </div>
            </section>

            <aside className="space-y-6">
              <div className="rounded-[1.5rem] border border-[#ece5ff] bg-[linear-gradient(135deg,rgba(255,247,252,0.92)_0%,rgba(243,240,255,0.92)_52%,rgba(236,245,255,0.92)_100%)] p-5">
                <h2 className="text-base font-bold text-slate-900">Quick summary</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  This profile is pulled from the current app database, so the contact details, presence, and activity counts here reflect the real user record.
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-slate-100 bg-white p-5 shadow-[0_10px_30px_rgba(180,168,228,0.08)]">
                <h2 className="text-base font-bold text-slate-900">Current stats</h2>
                {stats.length > 0 ? (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {stats.map((item) => (
                      <div key={item.label} className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                        <div className="text-lg font-bold text-slate-900">{item.value}</div>
                        <div className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                          {item.label}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                    No activity stats are available for this user yet.
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}
