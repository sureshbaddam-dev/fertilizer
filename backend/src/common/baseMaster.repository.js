/**
 * Reusable Base Master Repository Factory
 * Wraps any Mongoose Model to provide standardized CRUD, Soft Delete, Restoration, and Reference Audit methods.
 */
export function createBaseMasterRepository(Model) {
  return {
    async findActive(filter = {}, options = {}) {
      const query = Model.find({ ...filter, isActive: true });
      if (options.sort) query.sort(options.sort);
      if (options.skip) query.skip(options.skip);
      if (options.limit) query.limit(options.limit);
      return await query.exec();
    },

    async findAll(filter = {}, options = {}) {
      const query = Model.find(filter);
      if (options.sort) query.sort(options.sort);
      if (options.skip) query.skip(options.skip);
      if (options.limit) query.limit(options.limit);
      return await query.exec();
    },

    async findById(id) {
      return await Model.findById(id).exec();
    },

    async findOne(filter = {}) {
      return await Model.findOne(filter).exec();
    },

    async create(data) {
      return await Model.create(data);
    },

    async update(id, data) {
      return await Model.findByIdAndUpdate(id, data, { new: true, runValidators: true }).exec();
    },

    async softDelete(id) {
      return await Model.findByIdAndUpdate(id, { isActive: false }, { new: true }).exec();
    },

    async restore(id) {
      return await Model.findByIdAndUpdate(id, { isActive: true }, { new: true }).exec();
    },

    async toggleStatus(id) {
      const doc = await Model.findById(id);
      if (!doc) return null;
      doc.isActive = !doc.isActive;
      return await doc.save();
    },

    async count(filter = {}) {
      return await Model.countDocuments(filter);
    },

    /**
     * Checks if a master record is referenced in downstream transactional models.
     * @param {string} id Master Record ID
     * @param {Array<{ model: Object, field: string, label: string }>} referenceConfigs
     */
    async checkReferences(id, referenceConfigs = []) {
      const referencesFound = [];
      for (const config of referenceConfigs) {
        const count = await config.model.countDocuments({ [config.field]: id });
        if (count > 0) {
          referencesFound.push({
            module: config.label || config.model.modelName,
            count,
          });
        }
      }
      return referencesFound;
    },
  };
}
