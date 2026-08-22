import { logger } from '../../../config/logger.config.js';
import { AppError } from '../../../utils/appError.js';
import { HTTP_STATUS } from '../../../common/httpStatuses.js';

/**
 * Send Transactional SMS via Brevo API using native fetch
 * @param {string} recipientMobile - 10-digit mobile number or E.164 format (+919848081875)
 * @param {string} otp - 6-digit OTP code
 * @returns {Promise<{ success: boolean, messageId?: string }>} success object or throws AppError
 */
export async function sendBrevoSms(recipientMobile, otp) {
  const apiKey = process.env.BREVO_API_KEY;
  const sender = process.env.BREVO_SMS_SENDER || 'VEDIXA';

  if (!apiKey || apiKey === 'YOUR_BREVO_API_KEY') {
    logger.error('[BREVO SMS] BREVO_API_KEY is missing or unconfigured in environment.');
    throw new AppError('Brevo SMS API key is not configured on the server.', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }

  // Format mobile number to international format if 10 digits (+919848081875)
  let formattedRecipient = (recipientMobile || '').trim();
  if (/^\d{10}$/.test(formattedRecipient)) {
    formattedRecipient = `+91${formattedRecipient}`;
  } else if (!formattedRecipient.startsWith('+') && /^\d{12}$/.test(formattedRecipient)) {
    formattedRecipient = `+${formattedRecipient}`;
  }

  const smsContent = `Your VEDIXA Admin Login OTP is ${otp}. Valid for 5 minutes. Do not share it with anyone.`;

  let response;
  let resData;

  try {
    response = await fetch('https://api.brevo.com/v3/transactionalSMS/sms', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        type: 'transactional',
        sender,
        recipient: formattedRecipient,
        content: smsContent,
      }),
    });

    const resText = await response.text();
    try {
      resData = JSON.parse(resText);
    } catch (e) {
      resData = { message: resText };
    }
  } catch (netErr) {
    logger.error({ recipient: formattedRecipient, error: netErr.message }, '[BREVO SMS] Network connection error calling Brevo API');
    throw new AppError('Failed to connect to Brevo SMS server. Please check network connection.', HTTP_STATUS.SERVICE_UNAVAILABLE);
  }

  if (!response.ok) {
    const brevoCode = resData?.code || 'UNKNOWN_BREVO_ERROR';
    const brevoMsg = resData?.message || 'Brevo SMS service error';

    logger.error(
      {
        httpStatus: response.status,
        brevoCode,
        brevoMsg,
        recipient: formattedRecipient,
      },
      '[BREVO SMS] Brevo API rejected SMS request'
    );

    // Specific configuration error detection for missing SMS addon or zero credits
    if (
      brevoCode === 'invalid_parameter' &&
      (brevoMsg.includes('No sms related addons') || brevoMsg.includes('addons are found'))
    ) {
      throw new AppError(
        'Brevo Transactional SMS is not activated on your Brevo account. Please enable SMS Addon or purchase SMS credits in Brevo Dashboard.',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    if (brevoCode === 'unauthorized_sender' || brevoMsg.includes('sender')) {
      throw new AppError(
        `Brevo SMS Sender Name "${sender}" is not authorized on your Brevo account.`,
        HTTP_STATUS.BAD_REQUEST
      );
    }

    if (brevoCode === 'insufficient_credits' || brevoMsg.includes('credits')) {
      throw new AppError(
        'Brevo SMS account has insufficient credits to deliver SMS.',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    throw new AppError(`Brevo SMS Delivery Failed: ${brevoMsg}`, HTTP_STATUS.BAD_REQUEST);
  }

  const messageId = resData?.messageId || resData?.reference || 'ACCEPTED';
  logger.info({ recipient: formattedRecipient, messageId }, '[BREVO SMS] SMS successfully accepted by Brevo API');

  return {
    success: true,
    messageId,
  };
}
