import { HTTP_STATUS } from '../common/httpStatuses.js';
import { sendError } from '../common/apiResponse.js';
import { logger } from '../config/logger.config.js';
import { AppError } from '../utils/appError.js';

function extractSourceLocation(stack) {
  if (!stack) return 'Unknown location';
  const lines = stack.split('\n');
  for (const line of lines) {
    if (line.includes('src/') || line.includes('src\\')) {
      const match = line.match(/(src[\\\/][^:\s]+):(\d+):(\d+)/);
      if (match) {
        return `${match[1].replace(/\\/g, '/')}:${match[2]}`;
      }
    }
  }
  return lines[1] ? lines[1].trim() : 'Unknown location';
}

function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return body;
  const sanitized = { ...body };
  if (sanitized.password) sanitized.password = '***';
  if (sanitized.confirmPassword) sanitized.confirmPassword = '***';
  if (sanitized.newPassword) sanitized.newPassword = '***';
  return sanitized;
}

export const globalErrorHandler = (err, req, res, _next) => {
  let error = err;

  // 1. Handle Mongoose Validation Error
  if (err.name === 'ValidationError' && err.errors) {
    const fieldMessages = Object.values(err.errors).map((e) => e.message);
    const message = `Validation Failed: ${fieldMessages.join(', ')}`;
    error = new AppError(message, HTTP_STATUS.BAD_REQUEST, err.errors);
    error.name = 'MongooseValidationError';
  }

  // 2. Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    const message = `Invalid format for field '${err.path}': '${err.value}'`;
    error = new AppError(message, HTTP_STATUS.BAD_REQUEST);
    error.name = 'MongooseCastError';
  }

  // 3. Handle Mongo Duplicate Key Error (Code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const val = err.keyValue ? err.keyValue[field] : '';
    const message = `Duplicate entry '${val}' for field '${field}'. Record already exists.`;
    error = new AppError(message, HTTP_STATUS.CONFLICT, err.keyValue);
    error.name = 'MongoDuplicateKeyError';
  }

  if (!(error instanceof AppError)) {
    const statusCode = error.statusCode || error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    const message = error.message || 'Internal Server Error';
    error = new AppError(message, statusCode, error.errors || null);
    error.name = err.name || 'UnhandledError';
    error.stack = err.stack || error.stack;
  }

  const location = extractSourceLocation(error.stack);
  const safeBody = sanitizeBody(req.body);
  const timestamp = new Date().toISOString();

  const fullDebugText =
    `\n====================================================\n` +
    `🚨 BACKEND ERROR OCCURRED\n` +
    `----------------------------------------------------\n` +
    `• Timestamp    : ${timestamp}\n` +
    `• Route        : ${req.method} ${req.originalUrl}\n` +
    `• Error Name   : ${error.name || 'Error'}\n` +
    `• HTTP Status  : ${error.statusCode}\n` +
    `• Message      : ${error.message}\n` +
    `• File Location: ${location}\n` +
    `----------------------------------------------------\n` +
    `• Request Body :\n${JSON.stringify(safeBody, null, 2)}\n` +
    (error.errors ? `----------------------------------------------------\n• Validation Errors:\n${JSON.stringify(error.errors, null, 2)}\n` : '') +
    `----------------------------------------------------\n` +
    `• Stack Trace:\n${error.stack}\n` +
    `====================================================\n`;

  logger.error(fullDebugText);
  console.error(fullDebugText);

  const message = error.message || 'An error occurred';
  const errors = error.errors || (process.env.NODE_ENV === 'development' ? { stack: error.stack } : null);

  return sendError(res, message, errors, error.statusCode);
};

export const notFoundHandler = (req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found`, HTTP_STATUS.NOT_FOUND));
};
