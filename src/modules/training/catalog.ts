export type TrainingRole = "ADMIN" | "COORDINATOR" | "PROCESSOR" | "CONTRACTOR" | "CLIENT"

export type TrainingModule = {
  id: string
  title: string
  format: "VIDEO" | "GUIDE" | "CHECKLIST" | "WORKSHOP"
  duration: string
  level: "FOUNDATION" | "INTERMEDIATE" | "ADVANCED"
  roles: TrainingRole[]
  description: string
  outcomes: string[]
}

export const trainingCatalog: TrainingModule[] = [
  {
    id: "ops-queue-foundation",
    title: "Operations Queue Mastery",
    format: "VIDEO",
    duration: "26 min",
    level: "FOUNDATION",
    roles: ["ADMIN", "COORDINATOR", "PROCESSOR"],
    description: "Daily workflow for scanning aging work, saved views, bulk actions, and dispatch priorities.",
    outcomes: ["Scan queue by urgency", "Use bulk actions safely", "Move work from assigned to invoice-ready faster"],
  },
  {
    id: "wo-communication-playbook",
    title: "Work Order Communication Playbook",
    format: "GUIDE",
    duration: "12 min",
    level: "FOUNDATION",
    roles: ["ADMIN", "COORDINATOR", "PROCESSOR", "CONTRACTOR"],
    description: "Templates and messaging rules for contractor updates, revision requests, and client-facing notes.",
    outcomes: ["Use message templates", "Escalate clearly", "Keep a clean audit trail"],
  },
  {
    id: "property-compliance-review",
    title: "Property Compliance Review",
    format: "CHECKLIST",
    duration: "9 min",
    level: "INTERMEDIATE",
    roles: ["ADMIN", "COORDINATOR", "PROCESSOR"],
    description: "How to validate access codes, front images, inspection photos, and before/during/after coverage.",
    outcomes: ["Spot missing compliance items", "Validate inspection readiness", "Catch overdue evidence gaps"],
  },
  {
    id: "billing-profit-readiness",
    title: "Billing & Profit Readiness",
    format: "WORKSHOP",
    duration: "34 min",
    level: "ADVANCED",
    roles: ["ADMIN", "PROCESSOR"],
    description: "How to review estimate quality, profit leakage, material exposure, and invoice handoff quality.",
    outcomes: ["Review estimated margin", "Spot chargeback pressure", "Hand off cleaner invoices"],
  },
  {
    id: "contractor-photo-submission",
    title: "Contractor Photo Submission Standards",
    format: "VIDEO",
    duration: "11 min",
    level: "FOUNDATION",
    roles: ["CONTRACTOR"],
    description: "Practical guide to uploading before/during/after photos and sending voice, image, and video updates.",
    outcomes: ["Upload evidence correctly", "Use chat attachments", "Avoid rejection for incomplete documentation"],
  },
  {
    id: "client-portal-basics",
    title: "Client Portal Basics",
    format: "GUIDE",
    duration: "8 min",
    level: "FOUNDATION",
    roles: ["CLIENT"],
    description: "How clients track work order status, review invoices, and communicate with the office team.",
    outcomes: ["Track order status", "Review invoices", "Use client messaging correctly"],
  },
]

export function getLearningPathForRole(role: TrainingRole) {
  return trainingCatalog.filter((module) => module.roles.includes(role))
}
