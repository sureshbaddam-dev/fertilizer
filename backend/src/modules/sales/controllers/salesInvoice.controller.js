import { salesInvoiceService } from '../services/salesInvoice.service.js';
import { sendSuccess } from '../../../common/apiResponse.js';
import { HTTP_STATUS } from '../../../common/httpStatuses.js';

export const salesInvoiceController = {
  async getInvoices(req, res, next) {
    try {
      const userId = req.user._id;
      const data = await salesInvoiceService.getAllInvoices(req.query, userId);
      return sendSuccess(res, 'Sales invoices retrieved successfully', data, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  },

  async getInvoiceById(req, res, next) {
    try {
      const userId = req.user._id;
      const data = await salesInvoiceService.getInvoiceById(req.params.id, userId);
      return sendSuccess(res, 'Sales invoice details retrieved successfully', data, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  },

  async createInvoice(req, res, next) {
    const startTime = Date.now();
    console.log(`[BILL TIMING] Request received: ${new Date().toISOString()}`);
    try {
      const userId = req.user._id;
      const data = await salesInvoiceService.createInvoice(req.body, userId, startTime);
      const totalDuration = Date.now() - startTime;
      console.log(`[BILL TIMING] Total: ${totalDuration}ms`);
      console.log(`[BILL TIMING] Response sent: ${totalDuration}ms`);
      return sendSuccess(res, 'Invoice created successfully', data, HTTP_STATUS.CREATED);
    } catch (err) {
      console.log(`[BILL TIMING] Failed after ${Date.now() - startTime}ms: ${err.message}`);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: err.message });
    }
  },

  async previewInvoice(req, res, next) {
    try {
      const userId = req.user._id;
      const data = await salesInvoiceService.previewInvoice(req.body, userId);
      return sendSuccess(res, 'Invoice preview generated successfully', data, HTTP_STATUS.OK);
    } catch (err) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: err.message });
    }
  },

  async deleteInvoice(req, res, next) {
    try {
      const userId = req.user._id;
      const result = await salesInvoiceService.deleteInvoice(req.params.id, userId);
      return sendSuccess(res, result.message, result, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  },

  async updateInvoice(req, res, next) {
    try {
      const userId = req.user._id;
      const data = await salesInvoiceService.updateInvoice(req.params.id, req.body, userId);
      return sendSuccess(res, 'Sales invoice updated successfully', data, HTTP_STATUS.OK);
    } catch (err) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: err.message });
    }
  },

  async restoreInvoice(req, res, next) {
    try {
      const userId = req.user._id;
      const result = await salesInvoiceService.restoreInvoice(req.params.id, userId);
      return sendSuccess(res, result.message, result.invoice, HTTP_STATUS.OK);
    } catch (err) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: err.message });
    }
  },
};
