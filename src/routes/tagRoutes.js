const express = require('express');
const auth = require('../middleware/auth');
const Tag = require('../models/Tag');
const Task = require('../models/Task');
const {
  validate,
  tagCreateSchema,
  tagUpdateSchema,
} = require('../middleware/validation');
const { wrap, createError } = require('../utils/http');
const { taxonomyResponse } = require('../utils/taskResponse');
const { assertObjectId } = require('../services/taskService');

const router = express.Router();

async function getOwnedTag(tagId, ownerId) {
  assertObjectId(tagId, 'tag id');

  const tag = await Tag.findOne({ _id: tagId, ownerId });

  if (!tag) {
    throw createError(404, 'Tag not found');
  }

  return tag;
}

router.use(auth);

router.post(
  '/',
  validate(tagCreateSchema),
  wrap(async (req, res) => {
    const tag = await Tag.create({
      ownerId: req.user.id,
      name: req.body.name,
    });

    return res.status(201).json({
      success: true,
      data: {
        tag: taxonomyResponse(tag),
      },
    });
  })
);

router.get(
  '/',
  wrap(async (req, res) => {
    const tags = await Tag.find({ ownerId: req.user.id }).sort({
      name: 1,
    });

    return res.json({
      success: true,
      data: {
        tags: tags.map(taxonomyResponse),
      },
    });
  })
);

router.get(
  '/:tagId',
  wrap(async (req, res) => {
    const tag = await getOwnedTag(req.params.tagId, req.user.id);

    return res.json({
      success: true,
      data: {
        tag: taxonomyResponse(tag),
      },
    });
  })
);

router.patch(
  '/:tagId',
  validate(tagUpdateSchema),
  wrap(async (req, res) => {
    const tag = await getOwnedTag(req.params.tagId, req.user.id);
    tag.name = req.body.name;
    await tag.save();

    return res.json({
      success: true,
      data: {
        tag: taxonomyResponse(tag),
      },
    });
  })
);

router.delete(
  '/:tagId',
  wrap(async (req, res) => {
    const tag = await getOwnedTag(req.params.tagId, req.user.id);
    await Task.updateMany(
      { ownerId: req.user.id },
      { $pull: { tagIds: tag._id } }
    );
    await tag.deleteOne();
    return res.status(204).send();
  })
);

module.exports = router;
