const env = require('../config/env');

const scheduledDeliveries = new Map();
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000;

function cancelCompletionWebhook(taskId) {
  const delivery = scheduledDeliveries.get(String(taskId));

  if (delivery) {
    clearTimeout(delivery.timeoutId);
    scheduledDeliveries.delete(String(taskId));
  }
}

async function sendCompletionWebhook(payload, attempt = 0) {
  try {
    const response = await fetch(env.analyticsWebhookUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Analytics webhook responded with ${response.status}`);
    }
    cancelCompletionWebhook(payload.taskId);
  } catch (error) {
    if (attempt >= MAX_RETRIES) {
      console.error('Analytics webhook failed after retries', error);
      cancelCompletionWebhook(payload.taskId);
      return;
    }

    const backoffMs = RETRY_BASE_MS * 2 ** attempt;
    const timeoutId = setTimeout(() => {
      sendCompletionWebhook(payload, attempt + 1).catch((deliveryError) => {
        console.error('Analytics webhook retry failed', deliveryError);
      });
    }, backoffMs);

    scheduledDeliveries.set(String(payload.taskId), {
      timeoutId,
    });
  }
}

function queueCompletionWebhook(task) {
  if (!env.analyticsWebhookUrl) {
    return;
  }

  cancelCompletionWebhook(task._id);

  const payload = {
    taskId: String(task._id),
    title: task.title,
    completionDate: task.completedAt
      ? task.completedAt.toISOString()
      : new Date().toISOString(),
    userId: task.ownerId,
  };

  sendCompletionWebhook(payload).catch((error) => {
    console.error('Analytics webhook delivery failed', error);
  });
}

module.exports = {
  queueCompletionWebhook,
  cancelCompletionWebhook,
};
