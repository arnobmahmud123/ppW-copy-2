CREATE TABLE "ai_call_automations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "audienceType" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "voiceProfile" TEXT,
    "instructions" TEXT NOT NULL,
    "destinationType" TEXT NOT NULL DEFAULT 'PHONE',
    "phoneField" TEXT,
    "scheduleSummary" TEXT,
    "escalationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "nextRunAt" TIMESTAMP(3),
    "lastRunAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_call_automations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_call_automations_status_nextRunAt_idx" ON "ai_call_automations"("status", "nextRunAt");
CREATE INDEX "ai_call_automations_audienceType_status_idx" ON "ai_call_automations"("audienceType", "status");

ALTER TABLE "ai_call_automations"
ADD CONSTRAINT "ai_call_automations_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
