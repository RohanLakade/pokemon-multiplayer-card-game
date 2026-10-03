import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import cardsRoutes from './cardsRoutes.js';
import { createRoomsRoutes } from './roomsRoutes.js';

// Everything under /api
export function createApiRouter(limiters) {
  const router = Router();

  router.use('/health', healthRoutes);
  router.use('/cards', cardsRoutes);
  router.use('/rooms', createRoomsRoutes(limiters));

  return router;
}
