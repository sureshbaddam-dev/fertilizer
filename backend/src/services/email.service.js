import nodemailer from 'nodemailer';
import { logger } from '../config/logger.config.js';

export const emailService = {
  getTransporter() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;

    if (!host || !user || !pass) {
      throw new Error(
        'SMTP email configuration is missing or incomplete in backend/.env. Please set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD.'
      );
    }

    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      connectionTimeout: 10000,
      greetingTimeout: 5000,
      socketTimeout: 15000,
    });
  },

  async verifyConnection() {
    try {
      const transporter = this.getTransporter();
      await transporter.verify();
      logger.info('[Email Service Diagnostic] SMTP connection verified successfully.');
      return true;
    } catch (err) {
      logger.error(`[Email Service Diagnostic] SMTP connection verification failed: ${err.message}`);
      throw err;
    }
  },

  async sendEmail({ to, subject, html, text }) {
    logger.info(`[Email Service Diagnostic] Verification email requested for: ${to}`);

    let transporter;
    try {
      transporter = this.getTransporter();
      logger.info('[Email Service Diagnostic] SMTP Transporter initialized: yes');
    } catch (configErr) {
      logger.error(`[Email Service Diagnostic] SMTP Transporter initialization failed: ${configErr.message}`);
      throw configErr;
    }

    // Verify SMTP connection before attempting sendMail
    try {
      await transporter.verify();
      logger.info('[Email Service Diagnostic] SMTP Connection verification: SUCCESS');
    } catch (verifyErr) {
      logger.error(`[Email Service Diagnostic] SMTP Connection verification: FAILED (${verifyErr.message})`);
      throw new Error(`SMTP Connection failed: ${verifyErr.message}`);
    }

    const from = process.env.EMAIL_FROM || `"VEDIXA ERP" <${process.env.SMTP_USER}>`;

    logger.info(`[Email Service Diagnostic] Outgoing Email Details -> FROM: ${from} | TO: ${to} | SUBJECT: ${subject}`);

    try {
      const info = await transporter.sendMail({
        from,
        to,
        subject,
        html,
        text,
      });

      logger.info(`[Email Service Diagnostic] sendMail Output:`);
      logger.info(`  - MessageID: ${info.messageId}`);
      logger.info(`  - Envelope TO: ${JSON.stringify(info.envelope?.to)}`);
      logger.info(`  - Accepted: ${JSON.stringify(info.accepted)}`);
      logger.info(`  - Rejected: ${JSON.stringify(info.rejected)}`);
      logger.info(`  - Response: ${info.response}`);

      if (info.rejected && info.rejected.length > 0 && info.rejected.includes(to)) {
        throw new Error(`Recipient ${to} was rejected by SMTP server: ${info.response}`);
      }

      if (!info.accepted || info.accepted.length === 0) {
        throw new Error(`SMTP server did not accept message delivery for ${to}: ${info.response}`);
      }

      return {
        sent: true,
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
        response: info.response,
      };
    } catch (err) {
      logger.error(`[Email Service Diagnostic] Failed to send email to ${to}: ${err.message}`);
      throw err;
    }
  },

  async sendBrevoOtpEmail({ toEmail, toName, otp }) {
    if (!toEmail || typeof toEmail !== 'string' || !toEmail.trim() || !toEmail.includes('@')) {
      throw new Error('Valid recipient email address (toEmail) is required for OTP delivery');
    }
    const cleanToEmail = toEmail.trim().toLowerCase();

    const brevoApiKey = process.env.BREVO_API_KEY;
    const templateId = Number(process.env.BREVO_TEMPLATE_ID || '2');
    const senderEmail = process.env.EMAIL_FROM || 'info@vedixaerp.com';
    const senderName = process.env.EMAIL_FROM_NAME || 'VEDIXA ERP';

    logger.info(`[Signup OTP] Recipient: ${cleanToEmail}`);

    if (!brevoApiKey) {
      throw new Error('BREVO_API_KEY is missing in backend environment configuration.');
    }

    logger.info(`[Brevo API] Dispatching OTP via Template #${templateId} from ${senderEmail} (${senderName}) to recipient: ${cleanToEmail}`);
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'api-key': brevoApiKey,
        },
        body: JSON.stringify({
          sender: { email: senderEmail, name: senderName },
          to: [{ email: cleanToEmail, name: toName || 'Valued User' }],
          templateId: templateId,
          params: {
            otp: String(otp),
          },
        }),
      });

      logger.info(`[Brevo API] Response status: ${response.status}`);

      if (response.ok) {
        const resData = await response.json();
        logger.info(`[Brevo API] OTP email delivered successfully via Template #${templateId} to recipient: ${cleanToEmail} (MessageID: ${resData.messageId})`);
        return { sent: true, provider: 'brevo_api', messageId: resData.messageId };
      } else {
        const errText = await response.text();
        let sanitizedReason = errText;
        try {
          const parsed = JSON.parse(errText);
          sanitizedReason = parsed.message || parsed.code || errText;
        } catch (_e) {}
        logger.error(`[Brevo API] Brevo REST API returned HTTP ${response.status}: ${sanitizedReason}`);
        throw new Error(`Brevo API Error (${response.status}): ${sanitizedReason}`);
      }
    } catch (apiErr) {
      logger.error(`[Brevo API] Execution failed for ${cleanToEmail}: ${apiErr.message}`);
      throw apiErr;
    }
  },

  async sendVerificationEmail(toEmail, verifyUrl) {
    const subject = 'Verify your VEDIXA ERP Account Email';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #047857; font-size: 24px; margin: 0;">VEDIXA ERP</h1>
          <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Enterprise Cloud Billing & Inventory Management</p>
        </div>
        <h2 style="color: #0f172a; font-size: 18px; font-weight: bold;">Verify Your Email Address</h2>
        <p style="font-size: 14px; color: #334155; line-height: 1.6;">Thank you for signing up for VEDIXA ERP. Please verify your email address to complete your account setup and access your dashboard.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${verifyUrl}" style="background-color: #047857; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Verify Email Address</a>
        </div>
        <p style="font-size: 12px; color: #64748b;">This verification link will expire in <strong>15 minutes</strong>.</p>
        <p style="font-size: 12px; color: #64748b;">If the button does not work, copy and paste this link into your web browser:</p>
        <p style="font-size: 12px; color: #047857; word-break: break-all; background-color: #f1f5f9; padding: 10px; border-radius: 8px; font-family: monospace;">${verifyUrl}</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">If you did not request this registration, please ignore this message.</p>
      </div>
    `;
    const text = `Welcome to VEDIXA ERP. Please verify your email address by opening this link in your browser: ${verifyUrl}`;

    return await this.sendEmail({ to: toEmail, subject, html, text });
  },
};
