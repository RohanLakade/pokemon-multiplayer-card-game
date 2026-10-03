import { listCards, findCardById } from '../services/cardsService.js';
import { HttpError } from '../utils/httpError.js';

export async function getCards(req, res) {
  const { limit, offset } = req.validated.query;
  res.json(await listCards(limit, offset));
}

export async function getCardById(req, res) {
  const card = await findCardById(req.validated.params.id);

  if (!card) {
    throw new HttpError(404, 'CARD_NOT_FOUND', 'Card not found');
  }
  res.json(card);
}
