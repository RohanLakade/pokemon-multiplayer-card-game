import { Router } from 'express';
import { cardsQuerySchema, cardIdParamsSchema } from '@pokemon-game/shared';
import { getCards, getCardById } from '../controllers/cardsController.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.get('/', validate({ query: cardsQuerySchema }), getCards);
router.get('/:id', validate({ params: cardIdParamsSchema }), getCardById);

export default router;
