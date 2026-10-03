import { io } from 'socket.io-client';
import { SERVER_URL } from './config.js';

// One socket for the whole app. autoConnect is off: we connect only when a player joins a room.
export const socket = io(SERVER_URL, { autoConnect: false });

// Connects and waits until the connection is open (or fails).
export function connectSocket() {
  if (socket.connected) return Promise.resolve();

  return new Promise((resolve, reject) => {
    function stopListening() {
      socket.off('connect', handleConnect);
      socket.off('connect_error', handleError);
    }
    function handleConnect() {
      stopListening();
      resolve();
    }
    function handleError() {
      stopListening();
      socket.disconnect(); // stop the automatic retries
      reject(new Error('Cannot reach the game server. Is it running?'));
    }

    socket.on('connect', handleConnect);
    socket.on('connect_error', handleError);
    socket.connect();
  });
}

// Sends an event and waits for the server's answer, which looks like { ok: true, ... }.
// Rejects with the server's message when ok is false, or after 5 seconds without an answer.
export function sendEvent(eventName, payload = {}) {
  return new Promise((resolve, reject) => {
    socket.timeout(5000).emit(eventName, payload, (timeoutError, response) => {
      if (timeoutError) {
        reject(new Error('The server did not answer in time'));
        return;
      }
      if (!response.ok) {
        reject(new Error(response.error.message));
        return;
      }
      resolve(response);
    });
  });
}
