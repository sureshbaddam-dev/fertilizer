import { salesInvoiceService } from '../services/salesInvoice.service.js';
import { sendSuccess } from '../../../common/apiResponse.js';
import { HTTP_STATUS } from '../../../common/httpStatuses.js';

export const salesInvoiceController = {
  async getInvoices(req, res, next) {
    try {
      const data = await salesInvoiceService.getAllInvoices(req.query);
      return sendSuccess(res, 'Sales invoices retrieved successfully', data, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  },

  async getInvoiceById(req, res, next) {
    try {
      const data = await salesInvoiceService.getInvoiceById(req.params.id);
      return sendSuccess(res, 'Sales invoice details retrieved successfully', data, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  },

  async createInvoice(req, res, next) {
    try {
      const data = await salesInvoiceService.createInvoice(req.body);
      return sendSuccess(res, 'Invoice created successfully', data, HTTP_STATUS.CREATED);
    } catch (err) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: err.message });
    }
  },

  async previewInvoice(req, res, next) {
    try {
      const data = await salesInvoiceService.previewInvoice(req.body);
      return sendSuccess(res, 'Invoice preview generated successfully', data, HTTP_STATUS.OK);
    } catch (err) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: err.message });
    }
  },

  async deleteInvoice(req, res, next) {
    try {
      const result = await salesInvoiceService.deleteInvoice(req.params.id);
      return sendSuccess(res, result.message, result, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  },

  async updateInvoice(req, res, next) {
    try {
      const data = await salesInvoiceService.updateInvoice(req.params.id, req.body);
      return sendSuccess(res, 'Sales invoice updated successfully', data, HTTP_STATUS.OK);
    } catch (err) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: err.message });
    }
  },
};
