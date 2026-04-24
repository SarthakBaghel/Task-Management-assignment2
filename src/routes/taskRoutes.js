const express = require('express');
const auth = require('../middleware/auth');
const Task = require('../models/Task');
const {
  validate,
  taskCreateSchema,
  taskUpdateSchema,
} = require('../middleware/validation');
const { wrap } = require('../utils/http');
const { taskResponse } = require('../utils/taskResponse');
const {
  getOwnedTask,
  populateTaskQuery,
  populateTaskDocument,
  resolveTaskRelations,
  buildTaskFilters,
} = require('../services/taskService');
const {
  scheduleTaskReminder,
  clearReminderState,
} = require('../services/reminderService');
const {
  queueCompletionWebhook,
  cancelCompletionWebhook,
} = require('../services/analyticsWebhookService');

const router = express.Router();

function markTaskCompleted(task) {
  task.completedAt = new Date();
}

function clearCompletionState(task) {
  task.completedAt = null;
}

router.use(auth);

router.post(
  '/',
  validate(taskCreateSchema),
  wrap(async (req, res) => {
    const { category, tags } = await resolveTaskRelations({
      ownerId: req.user.id,
      categoryId: req.body.categoryId ?? null,
      tagIds: req.body.tagIds ?? [],
    });

    const task = new Task({
      ownerId: req.user.id,
      title: req.body.title,
      description: req.body.description ?? '',
      dueDate: req.body.dueDate,
      status: req.body.status ?? 'pending',
      categoryId: category ? category._id : null,
      tagIds: tags.map((tag) => tag._id),
    });

    if (task.status === 'completed') {
      markTaskCompleted(task);
    } else {
      clearCompletionState(task);
    }

    await task.save();
    await populateTaskDocument(task);

    if (task.status === 'pending') {
      scheduleTaskReminder(task);
    } else {
      queueCompletionWebhook(task);
    }

    return res.status(201).json({
      success: true,
      data: {
        task: taskResponse(task),
      },
    });
  })
);

router.get(
  '/',
  wrap(async (req, res) => {
    const filters = await buildTaskFilters(req.query, req.user.id);
    const tasks = await populateTaskQuery(
      Task.find(filters).sort({
        createdAt: -1,
      })
    );

    return res.json({
      success: true,
      data: {
        tasks: tasks.map(taskResponse),
      },
    });
  })
);

router.get(
  '/:taskId',
  wrap(async (req, res) => {
    const task = await getOwnedTask(req.params.taskId, req.user.id);

    return res.json({
      success: true,
      data: {
        task: taskResponse(task),
      },
    });
  })
);

router.patch(
  '/:taskId',
  validate(taskUpdateSchema),
  wrap(async (req, res) => {
    const task = await getOwnedTask(req.params.taskId, req.user.id);
    const previousStatus = task.status;

    const relationsToResolve = {
      ownerId: req.user.id,
    };

    if (req.body.categoryId !== undefined) {
      relationsToResolve.categoryId = req.body.categoryId;
    }

    if (req.body.tagIds !== undefined) {
      relationsToResolve.tagIds = req.body.tagIds;
    }

    const { category, tags } = await resolveTaskRelations(relationsToResolve);

    ['title', 'description', 'dueDate', 'status'].forEach((field) => {
      if (req.body[field] !== undefined) {
        task[field] = req.body[field];
      }
    });

    if (req.body.categoryId !== undefined) {
      task.categoryId = category ? category._id : null;
    }

    if (req.body.tagIds !== undefined) {
      task.tagIds = tags.map((tag) => tag._id);
    }

    if (task.status === 'completed' && previousStatus !== 'completed') {
      markTaskCompleted(task);
    } else if (task.status === 'pending' && previousStatus === 'completed') {
      clearCompletionState(task);
    }

    await task.save();
    await populateTaskDocument(task);

    if (task.status === 'pending') {
      cancelCompletionWebhook(task._id);
      scheduleTaskReminder(task);
    } else {
      clearReminderState(task._id);

      if (previousStatus !== 'completed') {
        queueCompletionWebhook(task);
      }
    }

    return res.json({
      success: true,
      data: {
        task: taskResponse(task),
      },
    });
  })
);

router.delete(
  '/:taskId',
  wrap(async (req, res) => {
    const task = await getOwnedTask(req.params.taskId, req.user.id);
    await task.deleteOne();
    clearReminderState(task._id);
    cancelCompletionWebhook(task._id);
    return res.status(204).send();
  })
);

module.exports = router;
