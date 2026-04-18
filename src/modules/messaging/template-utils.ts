// STUB: Message Template Utilities
// Simplified version for build purposes

export const messageTemplateVariables = [
  { key: "work_order_number", label: "Work order number" },
  { key: "address", label: "Address" },
  { key: "contractor_name", label: "Contractor name" },
  { key: "client_name", label: "Client name" },
  { key: "due_date", label: "Due date" },
  { key: "service_type", label: "Service type" },
  { key: "reviewer_note", label: "Reviewer note" }
] as const;

export type MessageTemplateContext = Partial<Record<(typeof messageTemplateVariables)[number]["key"], string | null | undefined>>;

export function renderTemplateString(
  template: string | null | undefined,
  _context: MessageTemplateContext
): string {
  // Stub: Return template as-is
  return template ?? "";
}

export function inferTemplateVariables(_template: string | null | undefined): string[] {
  // Stub: Return empty array
  return [];
}
