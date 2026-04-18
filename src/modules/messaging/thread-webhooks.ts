import { db } from "@/lib/db";
import { decryptString } from "@/lib/security";

type ThreadWebhookEventName =
  | "MESSAGE_CREATED"
  | "TASK_CREATED"
  | "TASK_UPDATED"
  | "NOTE_UPDATED"
  | "POLL_CREATED"
  | "MEETING_CREATED";

export async function dispatchThreadWebhookEvent(input: {
  threadId: string;
  event: ThreadWebhookEventName;
  payload: Record<string, unknown>;
}) {
  const webhookModel =
    (db as unknown as {
      messageThreadWebhook?: typeof db.messageThreadWebhook;
    }).messageThreadWebhook;

  if (!webhookModel) {
    return;
  }

  const webhooks = await webhookModel.findMany({
    where: {
      messageThreadId: input.threadId,
      enabled: true,
    },
  });

  await Promise.all(
    webhooks.map(async (webhook) => {
      const subscribed = webhook.subscribedEvents
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

      if (!subscribed.includes(input.event)) {
        return;
      }

      try {
        const response = await fetch(webhook.targetUrl, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(webhook.secret ? { "x-thread-webhook-secret": decryptString(webhook.secret) ?? "" } : {}),
          },
          body: JSON.stringify({
            event: input.event,
            threadId: input.threadId,
            occurredAt: new Date().toISOString(),
            payload: input.payload,
          }),
        });

        await webhookModel.update({
          where: { id: webhook.id },
          data: {
            lastTriggeredAt: new Date(),
            lastStatus: response.ok ? "Delivered" : `HTTP ${response.status}`,
          },
        });
      } catch (error) {
        await webhookModel.update({
          where: { id: webhook.id },
          data: {
            lastTriggeredAt: new Date(),
            lastStatus: error instanceof Error ? error.message : "Delivery failed",
          },
        });
      }
    })
  );
}
