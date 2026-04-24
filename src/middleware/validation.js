const Joi = require('joi');

const registerSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  password: Joi.string().min(8).max(128).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  password: Joi.string().required(),
});

const nameSchema = Joi.string().trim().min(2).max(80).required();

const taskCreateSchema = Joi.object({
  title: Joi.string().trim().min(3).max(150).required(),
  description: Joi.string().trim().allow('').max(2000).optional(),
  dueDate: Joi.date().iso().required(),
  status: Joi.string().valid('pending', 'completed').default('pending'),
  categoryId: Joi.string().trim().allow(null).optional(),
  tagIds: Joi.array()
    .items(Joi.string().trim())
    .max(25)
    .unique()
    .optional(),
});

const taskUpdateSchema = Joi.object({
  title: Joi.string().trim().min(3).max(150),
  description: Joi.string().trim().allow('').max(2000),
  dueDate: Joi.date().iso(),
  status: Joi.string().valid('pending', 'completed'),
  categoryId: Joi.string().trim().allow(null),
  tagIds: Joi.array().items(Joi.string().trim()).max(25).unique(),
}).min(1);

const categoryCreateSchema = Joi.object({
  name: nameSchema,
});

const categoryUpdateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(80).required(),
});

const tagCreateSchema = Joi.object({
  name: nameSchema,
});

const tagUpdateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(80).required(),
});

function validate(schema) {
  return (req, res, next) => {
    const { value, error } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const err = new Error('Validation failed');
      err.statusCode = 400;
      err.details = error.details.map((detail) => ({
        message: detail.message,
        path: detail.path.join('.'),
      }));
      return next(err);
    }

    req.body = value;
    return next();
  };
}

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  taskCreateSchema,
  taskUpdateSchema,
  categoryCreateSchema,
  categoryUpdateSchema,
  tagCreateSchema,
  tagUpdateSchema,
};
