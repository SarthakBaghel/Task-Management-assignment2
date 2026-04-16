const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Task = require('../models/Task');
const {
  validate,
  taskCreateSchema,
  taskUpdateSchema,
} = require('../middleware/validation');

const router = express.Router();

function wrap(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function createError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function taskResponse(task) {
  const raw = typeof task.toObject === 'function' ? task.toObject() : task;

  return {
    id: String(raw._id),
    ownerId: raw.ownerId,
    title: raw.title,
    description: raw.description || '',
    dueDate: raw.dueDate,
    status: raw.status,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

async function getOwnedTask(taskId, userId) {
  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    throw createError(400, 'Invalid task id');
  }

  const task = await Task.findById(taskId);

  if (!task) {
    throw createError(404, 'Task not found');
  }

  if (task.ownerId !== userId) {
    throw createError(403, 'You do not have access to this task');
  }

  return task;
}

router.use(auth);

router.post(
  '/',
  validate(taskCreateSchema),
  wrap(async (req, res) => {
    const task = await Task.create({
      ownerId: req.user.id,
      title: req.body.title,
      description: req.body.description ?? '',
      dueDate: req.body.dueDate,
      status: req.body.status ?? 'pending',
    });

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
    const tasks = await Task.find({ ownerId: req.user.id }).sort({
      createdAt: -1,
    });

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

    ['title', 'description', 'dueDate', 'status'].forEach((field) => {
      if (req.body[field] !== undefined) {
        task[field] = req.body[field];
      }
    });

    await task.save();

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
    return res.status(204).send();
  })
);

module.exports = router;
