const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    ownerId: {
      type: Number,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: 2000,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

taskSchema.index({ ownerId: 1, createdAt: -1 });

module.exports = mongoose.model('Task', taskSchema);
