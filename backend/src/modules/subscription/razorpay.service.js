import crypto from 'crypto';
import { envConfig } from '../../config/env.config.js';
import { logger } from '../../config/logger.config.js';
import { AppError } from '../../utils/appError.js';
import { HTTP_STATUS } from '../../common/httpStatuses.js';

export const razorpayService = {
  /**
   * Create a Razorpay Order (Amount in INR)
   */
  async createOrder({ amountInRupees, currency = 'INR', receipt, notes = {} }) {
    const amountInPaise = Math.round(Number(amountInRupees) * 100);
    const keyId = envConfig.razorpay.keyId || process.env.RAZORPAY_KEY_ID;
    const keySecret = envConfig.razorpay.keySecret || process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      logger.error('❌ Razorpay API credentials missing (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET).');
      throw new AppError(
        'Razorpay payment gateway is not properly configured on the server. Please contact support.',
        HTTP_STATUS.SERVICE_UNAVAILABLE
      );
    }

    try {
      const authString = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      const response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${authString}`,
        },
        body: JSON.stringify({
          amount: amountInPaise,
          currency,
          receipt: receipt || `rcpt_${Date.now()}`,
          notes,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`❌ Razorpay API order creation failed (HTTP ${response.status}): ${errorText}`);
        throw new AppError(`Razorpay Order creation failed: HTTP ${response.status}`, HTTP_STATUS.BAD_REQUEST);
      }

      const orderData = await response.json();
      logger.info(`✅ Created Razorpay Order: ${orderData.id} for ₹${amountInRupees}`);
      return {
        orderId: orderData.id,
        amount: orderData.amount,
        currency: orderData.currency,
        keyId,
      };
    } catch (err) {
      logger.error(`❌ Razorpay API Exception: ${err.message}`);
      if (err instanceof AppError) throw err;
      throw new AppError(`Failed to create Razorpay payment order: ${err.message}`, HTTP_STATUS.SERVICE_UNAVAILABLE);
    }
  },

  /**
   * Verify Razorpay Payment HMAC-SHA256 Signature
   */
  verifySignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return false;
    }

    const keySecret = envConfig.razorpay.keySecret || process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      logger.error('❌ Cannot verify Razorpay signature: RAZORPAY_KEY_SECRET is missing.');
      return false;
    }

    const generatedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    const isValid = generatedSignature === razorpaySignature;

    if (isValid) {
      logger.info(`✅ Razorpay Payment Signature verified for Order: ${razorpayOrderId}`);
    } else {
      logger.error(`❌ Razorpay Signature Verification Failed for Order: ${razorpayOrderId}`);
    }

    return isValid;
  },

  /**
   * Verify Razorpay Webhook HMAC-SHA256 Signature
   */
  verifyWebhookSignature({ rawBody, signature, webhookSecret }) {
    if (!rawBody || !signature || !webhookSecret) {
      return false;
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      return expectedSignature === signature;
    } catch (err) {
      logger.error(`❌ Webhook Signature Exception: ${err.message}`);
      return false;
    }
  },

  /**
   * Query Razorpay Order Details directly from REST API (Server Source of Truth)
   */
  async getOrderDetails(orderId) {
    if (!orderId) {
      throw new AppError('Order ID is required to fetch Razorpay order status.', HTTP_STATUS.BAD_REQUEST);
    }

    const keyId = envConfig.razorpay.keyId || process.env.RAZORPAY_KEY_ID;
    const keySecret = envConfig.razorpay.keySecret || process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      throw new AppError('Razorpay API credentials missing.', HTTP_STATUS.SERVICE_UNAVAILABLE);
    }

    try {
      const authString = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      const response = await fetch(`https://api.razorpay.com/v1/orders/${orderId}`, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${authString}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`❌ Fetch Razorpay Order failed (HTTP ${response.status}): ${errorText}`);
        throw new AppError(`Failed to fetch order status from Razorpay: HTTP ${response.status}`, HTTP_STATUS.BAD_REQUEST);
      }

      return await response.json();
    } catch (err) {
      logger.error(`❌ Razorpay getOrderDetails Exception: ${err.message}`);
      if (err instanceof AppError) throw err;
      throw new AppError(`Failed to retrieve order status from Razorpay: ${err.message}`, HTTP_STATUS.SERVICE_UNAVAILABLE);
    }
  },

  /**
   * Query Razorpay Payments for an Order directly from REST API
   */
  async getOrderPayments(orderId) {
    if (!orderId) {
      throw new AppError('Order ID is required to fetch Razorpay payments.', HTTP_STATUS.BAD_REQUEST);
    }

    const keyId = envConfig.razorpay.keyId || process.env.RAZORPAY_KEY_ID;
    const keySecret = envConfig.razorpay.keySecret || process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      throw new AppError('Razorpay API credentials missing.', HTTP_STATUS.SERVICE_UNAVAILABLE);
    }

    try {
      const authString = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      const response = await fetch(`https://api.razorpay.com/v1/orders/${orderId}/payments`, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${authString}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`❌ Fetch Razorpay Order Payments failed (HTTP ${response.status}): ${errorText}`);
        throw new AppError(`Failed to fetch payments from Razorpay: HTTP ${response.status}`, HTTP_STATUS.BAD_REQUEST);
      }

      return await response.json();
    } catch (err) {
      logger.error(`❌ Razorpay getOrderPayments Exception: ${err.message}`);
      if (err instanceof AppError) throw err;
      throw new AppError(`Failed to retrieve payments from Razorpay: ${err.message}`, HTTP_STATUS.SERVICE_UNAVAILABLE);
    }
  },
};
