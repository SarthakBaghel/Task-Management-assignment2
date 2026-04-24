const Task = require('../models/Task');
const env = require('../config/env');

const scheduledReminders = new Map();
const sentReminders = new Map();

function cancelTaskReminder(taskId) {
  const reminderId = String(taskId);
  const reminder = scheduledReminders.get(reminderId);

  if (reminder) {
    clearTimeout(reminder.timeoutId);
    scheduledReminders.delete(reminderId);
  }
}

function clearReminderState(taskId) {
  cancelTaskReminder(taskId);
  sentReminders.delete(String(taskId));
}

function shouldScheduleReminder(task) {
  if (!task || task.status !== 'pending' || !task.dueDate) {
    return false;
  }

  const dueDate = new Date(task.dueDate);
  const reminderId = String(task._id);

  if (Number.isNaN(dueDate.getTime())) {
    return false;
  }

  if (sentReminders.get(reminderId) === dueDate.getTime()) {
    return false;
  }

  return true;
}

async function triggerReminder(taskId, expectedDueDateMs) {
  cancelTaskReminder(taskId);

  const task = await Task.findById(taskId);

  if (!task || task.status !== 'pending' || !task.dueDate) {
    return;
  }

  const dueDate = new Date(task.dueDate);

  if (dueDate.getTime() !== expectedDueDateMs) {
    return;
  }

  const payload = {
    event: 'task.reminder',
    taskId: String(task._id),
    ownerId: task.ownerId,
    title: task.title,
    dueDate: dueDate.toISOString(),
    reminderLeadTimeMs: env.reminderLeadTimeMs,
    triggeredAt: new Date().toISOString(),
  };

  console.log(`[reminder] ${JSON.stringify(payload)}`);

  sentReminders.set(String(task._id), dueDate.getTime());

  if (env.reminderWebhookUrl) {
    try {
      const response = await fetch(env.reminderWebhookUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Reminder webhook responded with ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to deliver reminder webhook', error);
    }
  }
}

function scheduleTaskReminder(task) {
  cancelTaskReminder(task._id);

  if (!shouldScheduleReminder(task)) {
    return;
  }

  const dueDate = new Date(task.dueDate);
  const triggerAt = dueDate.getTime() - env.reminderLeadTimeMs;
  const delayMs = Math.max(triggerAt - Date.now(), 0);

  const timeoutId = setTimeout(() => {
    triggerReminder(String(task._id), dueDate.getTime()).catch((error) => {
      console.error('Reminder processing failed', error);
    });
  }, delayMs);

  scheduledReminders.set(String(task._id), {
    timeoutId,
  });
}

module.exports = {
  scheduleTaskReminder,
  clearReminderState,
};
