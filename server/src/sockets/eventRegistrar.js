import { GameRuleError } from '../services/gameErrors.js';

function parsePayload(schema, payload) {
  const result = schema.safeParse(payload);

  if (!result.success) {
    const problems = result.error.issues.map(
      (issue) => `${issue.path.join('.') || 'payload'}: ${issue.message}`,
    );
    throw new GameRuleError('VALIDATION_ERROR', `Invalid data (${problems.join('; ')})`);
  }
  return result.data;
}

// Rule breaks are shown to the player. Anything unexpected is only logged on the server.
function toErrorInfo(error) {
  if (error instanceof GameRuleError) {
    return { code: error.code, message: error.message };
  }
  console.error(error);
  return { code: 'INTERNAL_ERROR', message: 'Something went wrong' };
}

function reply(ack, response) {
  if (typeof ack === 'function') ack(response);
}

// Creates "on(eventName, options, handler)" for one socket. It wraps every handler with the
// same safety steps: rate limit -> validate payload -> run -> reply or send an "error" event.
//   options.schema    optional Zod schema for the payload (events without one ignore their payload)
//   options.onFailure optional function called with the error when the handler fails
export function createEventRegistrar(socket, eventLimiter) {
  socket.on('disconnect', () => eventLimiter.reset(socket.id));

  return function on(eventName, options, handler) {
    socket.on(eventName, (...args) => {
      // Socket.IO puts the acknowledgement callback last; clients may leave out the payload
      const ack = typeof args.at(-1) === 'function' ? args.pop() : undefined;
      const payload = args[0];

      try {
        if (!eventLimiter.hit(socket.id)) {
          throw new GameRuleError('RATE_LIMITED', 'Too many requests, please slow down');
        }

        const data = options.schema ? parsePayload(options.schema, payload) : undefined;
        const result = handler(data);
        reply(ack, { ok: true, ...result });
      } catch (error) {
        options.onFailure?.(error);

        const info = toErrorInfo(error);
        socket.emit('error', info);
        reply(ack, { ok: false, error: info });
      }
    });
  };
}
