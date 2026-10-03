import { createRoom, findRoom, toPublicRoom } from '../services/roomsService.js';
import { HttpError } from '../utils/httpError.js';

export function postRoom(req, res) {
  const room = createRoom();

  if (!room) {
    throw new HttpError(503, 'SERVER_BUSY', 'The server is full right now, please try again later');
  }
  res.status(201).json({ code: room.code });
}

export function getRoomByCode(req, res) {
  const room = findRoom(req.validated.params.code);

  if (!room) {
    throw new HttpError(404, 'ROOM_NOT_FOUND', 'Room not found');
  }
  res.json(toPublicRoom(room));
}
