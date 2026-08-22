import { logger } from '../../../config/logger.config.js';
import { AppError } from '../../../utils/appError.js';
import { HTTP_STATUS } from '../../../common/httpStatuses.js';

/**
 * Format mobile number to E.164 international format (+919848081875)
 */
function formatE164(mobile) {
  let cleaned = (mobile || '').trim();
  if (/^\d{10}$/.test(cleaned)) {
    return `+91${cleaned}`;
  }
  if (!cleaned.startsWith('+') && /^\d{12}$/.test(cleaned)) {
    return `+${cleaned}`;
  }
  return cleaned;
}

/**
 * Send Transactional SMS via Twilio Programmable Messaging API
 * @param {string} recipientMobile - Admin mobile number (+919848081875)
 * @param {string} otp - 6-digit OTP code
 * @returns {Promise<{ success: boolean, sid: string }>}
 */
export async function sendTwilioSms(recipientMobile, otp) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromPhone = process.env.TWILIO_PHONE_NUMBER;

  if (
    !accountSid ||
    !authToken ||
    !fromPhone ||
    accountSid.includes('YOUR_TWILIO') ||
    authToken.includes('YOUR_TWILIO') ||
    fromPhone.includes('YOUR_TWILIO')
  ) {
    logger.error('[TWILIO SMS] Twilio credentials missing or unconfigured in environment.');
    throw new AppError(
      'Twilio SMS API credentials are not configured on the server. Please configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in backend/.env',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }

  const formattedRecipient = formatE164(recipientMobile);
  const smsContent = `Your VEDIXA Admin Login OTP is ${otp}. Valid for 5 minutes. Do not share it with anyone.`;

  const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  const bodyParams = new URLSearchParams();
  bodyParams.append('From', fromPhone.trim());
  bodyParams.append('To', formattedRecipient);
  bodyParams.append('Body', smsContent);

  let response;
  let resData;

  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: bodyParams.toString(),
    });

    const resText = await response.text();
    try {
      resData = JSON.parse(resText);
    } catch (e) {
      resData = { message: resText };
    }
  } catch (netErr) {
    logger.error({ recipient: formattedRecipient, error: netErr.message }, '[TWILIO SMS] Network error calling Twilio Messages API');
    throw new AppError('Failed to connect to Twilio server. Please check network connection.', HTTP_STATUS.SERVICE_UNAVAILABLE);
  }

  if (!response.ok) {
    const twilioCode = resData?.code || response.status;
    const twilioMsg = resData?.message || 'Twilio SMS request failed';

    logger.error(
      {
        httpStatus: response.status,
        twilioCode,
        twilioMsg,
        recipient: formattedRecipient,
      },
      '[TWILIO SMS] Twilio API rejected SMS request'
    );

    if (twilioCode === 21211 || twilioMsg.includes('Invalid To Phone Number')) {
      throw new AppError(`Invalid recipient phone number format: ${formattedRecipient}`, HTTP_STATUS.BAD_REQUEST);
    }

    if (twilioCode === 21608 || twilioMsg.includes('unverified')) {
      throw new AppError(
        `Twilio Trial Account: Recipient ${formattedRecipient} is not verified in your Twilio Console Verified Caller IDs.`,
        HTTP_STATUS.BAD_REQUEST
      );
    }

    if (twilioCode === 21606 || twilioMsg.includes('From phone number')) {
      throw new AppError(`Twilio sender phone number ${fromPhone} is not valid for your Twilio account.`, HTTP_STATUS.BAD_REQUEST);
    }

    throw new AppError(`Twilio SMS Delivery Failed: ${twilioMsg}`, HTTP_STATUS.BAD_REQUEST);
  }

  const sid = resData?.sid || 'ACCEPTED';
  logger.info({ recipient: formattedRecipient, sid, status: resData?.status }, '[TWILIO SMS] SMS request successfully accepted by Twilio API');

  return {
    success: true,
    sid,
  };
}
