import { HTTP_STATUS } from './httpStatuses.js';

export const sendSuccess = (res, message = 'Success', data = null, statusCode = HTTP_STATUS.OK) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

export const sendError = (
  res,
  message = 'Internal Server Error',
  errors = null,
  statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR
) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
};
