const mongoose = require('mongoose');
const Category = require('../models/Category');
const Tag = require('../models/Tag');
const Task = require('../models/Task');
const { createError } = require('../utils/http');

const TASK_POPULATE = [{ path: 'categoryId' }, { path: 'tagIds' }];

function assertObjectId(value, label) {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw createError(400, `Invalid ${label}`);
  }
}

function populateTaskQuery(query) {
  return query.populate(TASK_POPULATE);
}

async function populateTaskDocument(task) {
  return task.populate(TASK_POPULATE);
}

async function getOwnedTask(taskId, ownerId) {
  assertObjectId(taskId, 'task id');

  const task = await populateTaskQuery(Task.findById(taskId));

  if (!task) {
    throw createError(404, 'Task not found');
  }

  if (task.ownerId !== ownerId) {
    throw createError(403, 'You do not have access to this task');
  }

  
  return task;
}

async function resolveTaskRelations({ ownerId, categoryId, tagIds }) {
  let category;
  let tags;

  if (categoryId !== undefined) {
    if (categoryId === null) {
      category = null;
    } else {
      assertObjectId(categoryId, 'category id');
      category = await Category.findOne({ _id: categoryId, ownerId });

      if (!category) {
        throw createError(404, 'Category not found');
      }
    }
  }

  if (tagIds !== undefined) {
    const uniqueTagIds = [...new Set(tagIds)];

    uniqueTagIds.forEach((tagId) => assertObjectId(tagId, 'tag id'));

    const tagDocs = uniqueTagIds.length
      ? await Tag.find({ _id: { $in: uniqueTagIds }, ownerId })
      : [];

    if (tagDocs.length !== uniqueTagIds.length) {
      throw createError(404, 'One or more tags were not found');
    }

    const tagMap = new Map(tagDocs.map((tag) => [String(tag._id), tag]));
    tags = uniqueTagIds.map((tagId) => tagMap.get(String(tagId)));
  }

  return {
    category,
    tags,
  };
}

function parseIdList(value) {
  if (value === undefined || value === null || value === '') {
    return [];
  }

  const items = Array.isArray(value) ? value : String(value).split(',');

  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

async function buildTaskFilters(query, ownerId) {
  const filters = { ownerId };

  if (query.status !== undefined) {
    if (!['pending', 'completed'].includes(query.status)) {
      throw createError(400, 'Invalid status filter');
    }

    filters.status = query.status;
  }

  if (query.categoryId) {
    assertObjectId(query.categoryId, 'category id');

    const category = await Category.findOne({ _id: query.categoryId, ownerId });

    if (!category) {
      throw createError(404, 'Category not found');
    }

    filters.categoryId = category._id;
  }

  const tagIds = parseIdList(query.tagIds);

  if (tagIds.length > 0) {
    const { tags } = await resolveTaskRelations({ ownerId, tagIds });
    const objectIds = tags.map((tag) => new mongoose.Types.ObjectId(tag._id));
    filters.tagIds = { $in: objectIds };
  }

  return filters;
}

module.exports = {
  assertObjectId,
  populateTaskQuery,
  populateTaskDocument,
  getOwnedTask,
  resolveTaskRelations,
  buildTaskFilters,
};
