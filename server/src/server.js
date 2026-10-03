import { loadConfig } from './config/env.js';
import { createApp } from './app.js';
import { getAllCards } from './services/cardsService.js';

const config = loadConfig();

// Load cards.json now, so a missing file stops the server at startup, not on the first request
await getAllCards();

const app = createApp(config);

app.listen(config.port, (error) => {
  if (error) throw error;
  console.log(`Server listening on port ${config.port}`);
});
