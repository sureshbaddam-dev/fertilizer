import { Supplier } from '../models/supplier.model.js';
import { createBaseMasterRepository } from '../../../common/baseMaster.repository.js';

const baseRepo = createBaseMasterRepository(Supplier);

export const supplierRepository = {
  ...baseRepo,

  async findByName(name) {
    return await Supplier.findOne({ name: new RegExp(`^${name}$`, 'i') }).exec();
  },

  async updateBalance(id, dueAmount, session = null) {
    const opts = session ? { session } : {};
    return await Supplier.findByIdAndUpdate(
      id,
      { $inc: { outstandingBalance: dueAmount } },
      { new: true, ...opts }
    ).exec();
  },
};
