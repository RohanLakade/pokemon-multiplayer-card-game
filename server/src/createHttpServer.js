import { createServer } from 'node:http';
import { createApp } from './app.js';
import { createSocketServer } from './sockets/createSocketServer.js';

// One HTTP server that answers REST requests (Express) and WebSocket connections (Socket.IO).
// Kept apart from server.js so tests can start their own copy on a random port.
export function createHttpServer(config, cards) {
  const httpServer = createServer(createApp(config));
  const io = createSocketServer(httpServer, { config, cards });
  return { httpServer, io };
}
