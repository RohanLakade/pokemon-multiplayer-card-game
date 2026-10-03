import { HttpError } from '../utils/httpError.js';

// validate({ params, query, body }) checks each part of the request with a Zod schema.
// Express 5 made req.query read-only, so the cleaned values are stored in req.validated.
export function validate(schemas) {
  return (req, res, next) => {
    const validated = {};

    for (const part of ['params', 'query', 'body']) {
      if (!schemas[part]) continue;

      const result = schemas[part].safeParse(req[part]);
      if (!result.success) {
        const details = result.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));
        throw new HttpError(400, 'VALIDATION_ERROR', 'Invalid request', details);
      }
      validated[part] = result.data;
    }

    req.validated = validated;
    next();
  };
}
