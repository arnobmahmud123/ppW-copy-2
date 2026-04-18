// Stub: Audit logging
export async function writeAuditLog(input: {
  actorUserId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
  [key: string]: any;
}): Promise<void> {
  // Stub implementation - does nothing
  return;
}
