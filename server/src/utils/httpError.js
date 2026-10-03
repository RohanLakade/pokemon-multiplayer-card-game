// An error that carries an HTTP status. The error handler turns it into a JSON response.
// "code" is a short machine-readable name; "message" is safe to show to the user.
export class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
