export function softDeletePlugin(schema) {
  schema.add({
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
    deletedBy: {
      type: Object,
      default: null,
    },
  });

  schema.methods.softDelete = async function (userId = null) {
    this.isActive = false;
    this.deletedAt = new Date();
    if (userId) this.deletedBy = userId;
    return await this.save();
  };

  schema.methods.restore = async function () {
    this.isActive = true;
    this.deletedAt = null;
    this.deletedBy = null;
    return await this.save();
  };

  schema.statics.findActive = function (conditions = {}, projection, options) {
    return this.find({ ...conditions, isActive: true }, projection, options);
  };

  schema.statics.findAllIncludeInactive = function (conditions = {}, projection, options) {
    return this.find(conditions, projection, options);
  };
}
