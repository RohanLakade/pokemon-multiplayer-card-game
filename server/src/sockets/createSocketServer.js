import { Server } from 'socket.io';
import { createRateCounter } from '../utils/rateCounter.js';
import { getClientIp } from '../utils/clientIp.js';
import { createEventRegistrar } from './eventRegistrar.js';
import { createGameFlow } from './gameFlow.js';
import { registerRoomHandlers } from './roomHandlers.js';
import { registerGameHandlers } from './gameHandlers.js';

// Attaches Socket.IO to the HTTP server. "cards" is the loaded card roster.
// config.turnSeconds and config.awayTurnSeconds are optional: tests use short turns.
export function createSocketServer(httpServer, { config, cards }) {
  const io = new Server(httpServer, {
    // Only the client website may connect from a browser (Socket.IO has its own CORS setting)
    cors: { origin: config.clientOrigin, methods: ['GET', 'POST'] },
    maxHttpBufferSize: 10 * 1000, // 10 kB per message; the default is 1 MB
    serveClient: false, // we do not need Socket.IO to serve its browser script
  });

  // 30 events per 10 seconds per socket, and 10 failed joins per 10 minutes per IP address
  const eventLimiter = createRateCounter({ limit: 30, windowMs: 10 * 1000 });
  const failedJoins = createRateCounter({ limit: 10, windowMs: 10 * 60 * 1000 });

  // One game flow serves every room: it knows how to run turns and the turn timer
  const flow = createGameFlow({
    turnSeconds: config.turnSeconds,
    awaySeconds: config.awayTurnSeconds,
  });

  io.on('connection', (socket) => {
    const clientIp = getClientIp(socket.request, config.trustProxy);
    const on = createEventRegistrar(socket, eventLimiter);

    registerRoomHandlers({ io, socket, on, failedJoins, clientIp, flow });
    registerGameHandlers({ io, socket, on, cards, flow });
  });

  return io;
}
