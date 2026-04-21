import { BookOpen, CheckCircle2, PlayCircle, Presentation } from "lucide-react"

import { getLearningPathForRole, trainingCatalog } from "@/modules/training/catalog"

const roleCards = [
  { role: "ADMIN", title: "Admin path", description: "Executive visibility, finance review, and system-wide control." },
  { role: "COORDINATOR", title: "Coordinator path", description: "Dispatch, reassignment, contractor communication, and field follow-up." },
  { role: "PROCESSOR", title: "Processor path", description: "Review quality, evidence validation, office approval, and invoice handoff." },
  { role: "CONTRACTOR", title: "Contractor path", description: "Field execution, media submission, and compliance documentation." },
] as const

function getFormatIcon(format: string) {
  switch (format) {
    case "VIDEO":
      return PlayCircle
    case "WORKSHOP":
      return Presentation
    default:
      return BookOpen
  }
}

export default function AdminTrainingPage() {
  return (
    <div className="space-y-6 text-[#435072]">
      <div className="rounded-[28px] border border-[#e4ddff] bg-[linear-gradient(180deg,#ffffff_0%,#f8f5ff_100%)] p-6 shadow-[0_18px_40px_rgba(196,186,255,0.14)]">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#eadfff] bg-[#f7f2ff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8a78cb]">
          <BookOpen className="h-3.5 w-3.5" />
          Training Portal
        </div>
        <h1 className="mt-4 text-3xl font-semibold text-[#26324f]">Role-based learning portal</h1>
        <p className="mt-2 max-w-4xl text-sm text-[#7280ad]">
          A built-in video, guide, checklist, and workshop library for admin, coordinators, processors, contractors, and clients.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
        <section className="rounded-[28px] border border-[#e4ddff] bg-[linear-gradient(180deg,#ffffff_0%,#f8f5ff_100%)] p-6 shadow-[0_18px_40px_rgba(196,186,255,0.14)]">
          <h2 className="text-xl font-semibold text-[#26324f]">Role-based learning paths</h2>
          <div className="mt-4 space-y-4">
            {roleCards.map((card) => (
              <div key={card.role} className="rounded-[24px] border border-[#ece5ff] bg-white/85 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-base font-semibold text-[#26324f]">{card.title}</div>
                    <p className="mt-1 text-sm text-[#7280ad]">{card.description}</p>
                  </div>
                  <div className="rounded-full bg-[#f7f2ff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#8a78cb]">
                    {getLearningPathForRole(card.role).length} modules
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {getLearningPathForRole(card.role).map((module) => (
                    <div key={module.id} className="flex items-start gap-3 rounded-2xl border border-[#f0ebff] bg-[#fbf9ff] px-3 py-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#2f9b67]" />
                      <div>
                        <div className="text-sm font-semibold text-[#26324f]">{module.title}</div>
                        <div className="mt-1 text-xs text-[#7280ad]">{module.duration} · {module.level}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-[#e4ddff] bg-[linear-gradient(180deg,#ffffff_0%,#f8f5ff_100%)] p-6 shadow-[0_18px_40px_rgba(196,186,255,0.14)]">
          <h2 className="text-xl font-semibold text-[#26324f]">Training library</h2>
          <div className="mt-4 grid gap-4">
            {trainingCatalog.map((module) => {
              const Icon = getFormatIcon(module.format)
              return (
                <div key={module.id} className="rounded-[24px] border border-[#ece5ff] bg-white/85 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#fef5ff_0%,#eef6ff_100%)]">
                        <Icon className="h-5 w-5 text-[#7d58df]" />
                      </div>
                      <div>
                        <div className="text-base font-semibold text-[#26324f]">{module.title}</div>
                        <p className="mt-1 text-sm text-[#7280ad]">{module.description}</p>
                      </div>
                    </div>
                    <div className="rounded-full bg-[#f7f2ff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#8a78cb]">
                      {module.format}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#5c688d]">
                    <span className="rounded-full bg-[#fbf9ff] px-3 py-1">{module.duration}</span>
                    <span className="rounded-full bg-[#fbf9ff] px-3 py-1">{module.level}</span>
                    <span className="rounded-full bg-[#fbf9ff] px-3 py-1">{module.roles.join(", ")}</span>
                  </div>

                  <div className="mt-4 space-y-2">
                    {module.outcomes.map((outcome) => (
                      <div key={outcome} className="text-sm text-[#435072]">• {outcome}</div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
