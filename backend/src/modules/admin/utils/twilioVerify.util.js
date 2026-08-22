import https from 'https';
import { logger } from '../../../config/logger.config.js';
import { AppError } from '../../../utils/appError.js';
import { HTTP_STATUS } from '../../../common/httpStatuses.js';

// Resilient HTTPS Agent for outbound Twilio Verify API calls with strict TLS verification
const twilioHttpsAgent = new https.Agent({
  rejectUnauthorized: true,
  keepAlive: false,
  minVersion: 'TLSv1.2',
  maxVersion: 'TLSv1.3',
  ALPNProtocols: ['http/1.1'],
});

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
 * Execute resilient HTTPS request to Twilio Verify API v2
 */
function executeTwilioRequest(endpointPath, bodyParams) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

  if (!accountSid || !authToken || !serviceSid) {
    logger.error('[ADMIN OTP] Missing required Twilio Verify credentials in environment variables.');
    throw new AppError(
      'Twilio Verify API credentials are not configured on the server.',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }

  const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  const postData = bodyParams.toString();
  const hostname = 'verify.twilio.com';
  const requestPath = `/v2/Services/${serviceSid}/${endpointPath}`;

  return new Promise((resolve, reject) => {
    const options = {
      hostname,
      port: 443,
      path: requestPath,
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        Accept: 'application/json',
      },
      agent: twilioHttpsAgent,
    };

    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => (responseBody += chunk));
      res.on('end', () => {
        let parsedData;
        try {
          parsedData = JSON.parse(responseBody);
        } catch (_e) {
          parsedData = { message: responseBody };
        }
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          statusText: res.statusMessage || '',
          data: parsedData,
        });
      });
    });

    req.on('error', (netErr) => {
      logger.error(
        {
          code: netErr.code,
          syscall: netErr.syscall,
          hostname,
          errorMsg: netErr.message,
        },
        `[ADMIN OTP] Outbound TLS/HTTPS Request Error to ${hostname}`
      );

      reject(
        new AppError(
          'Failed to connect to Twilio verification service. Please check network connection.',
          HTTP_STATUS.SERVICE_UNAVAILABLE
        )
      );
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Send Verification SMS via Twilio Verify API v2
 * @param {string} recipientMobile - Admin mobile number (+919848081875)
 * @returns {Promise<{ success: boolean, sid: string, status: string }>}
 */
export async function sendTwilioVerification(recipientMobile) {
  const formattedMobile = formatE164(recipientMobile);
  const bodyParams = new URLSearchParams();
  bodyParams.append('To', formattedMobile);
  bodyParams.append('Channel', 'sms');

  logger.info(`[ADMIN OTP] Calling Twilio Verifications Endpoint for recipient: ${formattedMobile}`);

  const response = await executeTwilioRequest('Verifications', bodyParams);
  const resData = response.data;

  logger.info(`[ADMIN OTP] Twilio Verify API HTTP Status: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const twilioCode = resData?.code || response.status;
    const twilioMsg = resData?.message || 'Twilio verification request failed';

    logger.error(
      {
        httpStatus: response.status,
        twilioCode,
        twilioMsg,
        recipient: formattedMobile,
      },
      '[ADMIN OTP] Twilio Verify API rejected request'
    );

    if (twilioCode === 60200 || twilioMsg.includes('Invalid parameter')) {
      throw new AppError(`Invalid recipient phone number format: ${formattedMobile}`, HTTP_STATUS.BAD_REQUEST);
    }

    if (twilioCode === 60203 || twilioMsg.includes('Max send attempts reached')) {
      throw new AppError('Maximum OTP send attempts reached for this number. Please try again later.', HTTP_STATUS.TOO_MANY_REQUESTS);
    }

    throw new AppError(`Twilio Verify Error: ${twilioMsg}`, HTTP_STATUS.BAD_REQUEST);
  }

  const sid = resData?.sid || 'PENDING';
  const status = resData?.status || 'pending';

  logger.info(
    { recipient: formattedMobile, verificationSid: sid, status },
    '[ADMIN OTP] Verification SMS successfully sent via Twilio Verify API v2'
  );

  return {
    success: true,
    sid,
    status,
  };
}

/**
 * Verify OTP Code via Twilio Verify API v2 VerificationCheck
 * @param {string} recipientMobile - Admin mobile number (+919848081875)
 * @param {string} code - OTP code entered by Admin
 * @returns {Promise<{ approved: boolean, sid: string }>}
 */
export async function checkTwilioVerification(recipientMobile, code) {
  const formattedMobile = formatE164(recipientMobile);
  const cleanCode = (code || '').trim();

  if (!cleanCode || cleanCode.length < 4) {
    throw new AppError('Please enter a valid OTP code.', HTTP_STATUS.BAD_REQUEST);
  }

  const bodyParams = new URLSearchParams();
  bodyParams.append('To', formattedMobile);
  bodyParams.append('Code', cleanCode);

  logger.info(`[ADMIN OTP] Calling VerificationCheck Endpoint for recipient: ${formattedMobile}`);

  const response = await executeTwilioRequest('VerificationCheck', bodyParams);
  const resData = response.data;

  logger.info(`[ADMIN OTP] VerificationCheck HTTP Status: ${response.status}, Verification Status: ${resData?.status}`);

  if (!response.ok) {
    const twilioCode = resData?.code || response.status;
    const twilioMsg = resData?.message || 'Verification check failed';

    if (twilioCode === 20404 || twilioMsg.includes('not found')) {
      throw new AppError('Invalid or expired Admin OTP code.', HTTP_STATUS.BAD_REQUEST);
    }

    if (twilioCode === 60202 || twilioMsg.includes('Max check attempts reached')) {
      throw new AppError('Maximum verification check attempts reached. Please request a new OTP.', HTTP_STATUS.TOO_MANY_REQUESTS);
    }

    throw new AppError(`Twilio Verification Check Failed: ${twilioMsg}`, HTTP_STATUS.BAD_REQUEST);
  }

  const isApproved = resData?.status === 'approved' || resData?.valid === true;

  if (!isApproved) {
    logger.warn({ recipient: formattedMobile, status: resData?.status }, '[ADMIN OTP] Verification status is not approved');
    throw new AppError('Invalid or unapproved OTP code. Please try again.', HTTP_STATUS.BAD_REQUEST);
  }

  logger.info({ recipient: formattedMobile, sid: resData?.sid }, '[ADMIN OTP] OTP code verified and APPROVED by Twilio Verify API v2');

  return {
    approved: true,
    sid: resData?.sid,
  };
}
