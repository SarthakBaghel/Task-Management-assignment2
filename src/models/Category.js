const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    ownerId: {
      type: Number,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    normalizedName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 80,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

categorySchema.pre('validate', function setNormalizedName(next) {
  this.normalizedName = (this.name || '').trim().toLowerCase();
  next();
});

categorySchema.index({ ownerId: 1, normalizedName: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);
