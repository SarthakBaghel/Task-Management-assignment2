const express = require('express');
const auth = require('../middleware/auth');
const Category = require('../models/Category');
const Task = require('../models/Task');
const {
  validate,
  categoryCreateSchema,
  categoryUpdateSchema,
} = require('../middleware/validation');
const { wrap, createError } = require('../utils/http');
const { taxonomyResponse } = require('../utils/taskResponse');
const { assertObjectId } = require('../services/taskService');

const router = express.Router();

async function getOwnedCategory(categoryId, ownerId) {
  assertObjectId(categoryId, 'category id');

  const category = await Category.findOne({ _id: categoryId, ownerId });

  if (!category) {
    throw createError(404, 'Category not found');
  }

  return category;
}

router.use(auth);

router.post(
  '/',
  validate(categoryCreateSchema),
  wrap(async (req, res) => {
    const category = await Category.create({
      ownerId: req.user.id,
      name: req.body.name,
    });

    return res.status(201).json({
      success: true,
      data: {
        category: taxonomyResponse(category),
      },
    });
  })
);

router.get(
  '/',
  wrap(async (req, res) => {
    const categories = await Category.find({ ownerId: req.user.id }).sort({
      name: 1,
    });

    return res.json({
      success: true,
      data: {
        categories: categories.map(taxonomyResponse),
      },
    });
  })
);

router.get(
  '/:categoryId',
  wrap(async (req, res) => {
    const category = await getOwnedCategory(req.params.categoryId, req.user.id);

    return res.json({
      success: true,
      data: {
        category: taxonomyResponse(category),
      },
    });
  })
);

router.patch(
  '/:categoryId',
  validate(categoryUpdateSchema),
  wrap(async (req, res) => {
    const category = await getOwnedCategory(req.params.categoryId, req.user.id);
    category.name = req.body.name;
    await category.save();

    return res.json({
      success: true,
      data: {
        category: taxonomyResponse(category),
      },
    });
  })
);

router.delete(
  '/:categoryId',
  wrap(async (req, res) => {
    const category = await getOwnedCategory(req.params.categoryId, req.user.id);
    await Task.updateMany(
      { ownerId: req.user.id, categoryId: category._id },
      { $set: { categoryId: null } }
    );
    await category.deleteOne();
    return res.status(204).send();
  })
);

module.exports = router;
