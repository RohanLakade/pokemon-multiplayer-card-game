import { loadConfig } from './config/env.js';
import { createHttpServer } from './createHttpServer.js';
import { getAllCards } from './services/cardsService.js';

const config = loadConfig();

// Load cards.json now, so a missing file stops the server at startup, not on the first request
const cards = await getAllCards();

const { httpServer } = createHttpServer(config, cards);

httpServer.on('error', (error) => {
  console.error(`Could not start the server: ${error.message}`);
  process.exit(1);
});

httpServer.listen(config.port, () => {
  console.log(`Server listening on port ${config.port}`);
});
