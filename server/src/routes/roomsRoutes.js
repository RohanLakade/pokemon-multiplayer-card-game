import { Router } from 'express';
import { roomCodeParamsSchema } from '@pokemon-game/shared';
import { postRoom, getRoomByCode } from '../controllers/roomsController.js';
import { validate } from '../middleware/validate.js';

// A function, because these routes need this app's own rate limiters
export function createRoomsRoutes(limiters) {
  const router = Router();

  router.post('/', limiters.createRoom, postRoom);
  // The limiter runs BEFORE validation, so malformed codes count as failed attempts too
  router.get(
    '/:code',
    limiters.failedJoin,
    validate({ params: roomCodeParamsSchema }),
    getRoomByCode,
  );

  return router;
}
