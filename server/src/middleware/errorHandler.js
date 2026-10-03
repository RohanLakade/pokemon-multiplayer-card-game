import { HttpError } from '../utils/httpError.js';

function sendError(res, status, code, message, details) {
  res.status(status).json({ error: { code, message, ...(details && { details }) } });
}

// Turns every error into a safe JSON response.
// Stack traces and internal messages are logged here and never sent to the client.
// Express recognises an error handler by its 4 parameters, so all 4 must stay.
export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof HttpError) {
    return sendError(res, error.status, error.code, error.message, error.details);
  }

  // Errors raised by the JSON body parser
  if (error.type === 'entity.too.large') {
    return sendError(res, 413, 'PAYLOAD_TOO_LARGE', 'Request body is too large');
  }
  if (error.type === 'entity.parse.failed') {
    return sendError(res, 400, 'INVALID_JSON', 'Request body is not valid JSON');
  }

  // Any other client error: a generic message, so no internal text leaks
  const status = error.status ?? error.statusCode;
  if (status >= 400 && status < 500) {
    return sendError(res, status, 'BAD_REQUEST', 'Bad request');
  }

  console.error(error);
  return sendError(res, 500, 'INTERNAL_ERROR', 'Something went wrong');
}
