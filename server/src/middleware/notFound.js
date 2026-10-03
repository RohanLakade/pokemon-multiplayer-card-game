import { HttpError } from '../utils/httpError.js';

// Runs when no route matched. Express 5 forwards the thrown error to errorHandler.
export function notFound() {
  throw new HttpError(404, 'NOT_FOUND', 'Route not found');
}
