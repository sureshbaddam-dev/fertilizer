import { customerService } from '../services/customer.service.js';
import { sendSuccess } from '../../../common/apiResponse.js';
import { HTTP_STATUS } from '../../../common/httpStatuses.js';

export const customerController = {
  async getCustomers(req, res, next) {
    try {
      const result = await customerService.getAllCustomers(req.query);
      return sendSuccess(res, 'Customers retrieved successfully', result, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  },

  async getGeneralCustomers(req, res, next) {
    try {
      const result = await customerService.getGeneralCustomers(req.query);
      return sendSuccess(res, 'General Customers retrieved successfully', result, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  },

  async getSuggestions(req, res, next) {
    try {
      const suggestions = await customerService.getSuggestions();
      return sendSuccess(res, 'Customer suggestions retrieved successfully', suggestions, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  },

  async getCustomerById(req, res, next) {
    try {
      const result = await customerService.getCustomerById(req.params.id);
      if (!result || !result.customer) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Customer not found' });
      }
      return sendSuccess(res, 'Customer retrieved successfully', result, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  },

  async createCustomer(req, res, next) {
    try {
      const customer = await customerService.createCustomer(req.body);
      return sendSuccess(res, 'Customer created successfully', { customer }, HTTP_STATUS.CREATED);
    } catch (err) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: err.message });
    }
  },

  async updateCustomer(req, res, next) {
    try {
      const customer = await customerService.updateCustomer(req.params.id, req.body);
      return sendSuccess(res, 'Customer updated successfully', { customer }, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  },

  async deleteCustomer(req, res, next) {
    try {
      await customerService.deleteCustomer(req.params.id);
      return sendSuccess(res, 'Customer deleted successfully', null, HTTP_STATUS.OK);
    } catch (err) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: err.message });
    }
  },

  async recordPayment(req, res, next) {
    try {
      const payment = await customerService.recordPayment(req.params.id, req.body);
      return sendSuccess(res, 'Payment recorded and persisted successfully', { payment }, HTTP_STATUS.CREATED);
    } catch (err) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: err.message });
    }
  },

  async updatePayment(req, res, next) {
    try {
      const payment = await customerService.updatePayment(req.params.paymentId, req.body);
      return sendSuccess(res, 'Payment updated successfully', { payment }, HTTP_STATUS.OK);
    } catch (err) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: err.message });
    }
  },

  async deletePayment(req, res, next) {
    try {
      const result = await customerService.deletePayment(req.params.paymentId);
      return sendSuccess(res, result.message, result, HTTP_STATUS.OK);
    } catch (err) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: err.message });
    }
  },

  async addNote(req, res, next) {
    try {
      const notes = await customerService.addNote(req.params.id, req.body);
      return sendSuccess(res, 'Note added successfully', { notes }, HTTP_STATUS.CREATED);
    } catch (err) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: err.message });
    }
  },

  async updateNote(req, res, next) {
    try {
      const notes = await customerService.updateNote(req.params.id, req.params.noteId, req.body);
      return sendSuccess(res, 'Note updated successfully', { notes }, HTTP_STATUS.OK);
    } catch (err) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: err.message });
    }
  },

  async deleteNote(req, res, next) {
    try {
      const notes = await customerService.deleteNote(req.params.id, req.params.noteId);
      return sendSuccess(res, 'Note deleted successfully', { notes }, HTTP_STATUS.OK);
    } catch (err) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: err.message });
    }
  },

  async addDocument(req, res, next) {
    try {
      const documents = await customerService.addDocument(req.params.id, req.body);
      return sendSuccess(res, 'Document added successfully', { documents }, HTTP_STATUS.CREATED);
    } catch (err) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: err.message });
    }
  },

  async deleteDocument(req, res, next) {
    try {
      const documents = await customerService.deleteDocument(req.params.id, req.params.docId);
      return sendSuccess(res, 'Document deleted successfully', { documents }, HTTP_STATUS.OK);
    } catch (err) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: err.message });
    }
  },
};
