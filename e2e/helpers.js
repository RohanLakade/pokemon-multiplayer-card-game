import { expect } from '@playwright/test';

// Two players in two separate browser contexts (like two different devices): Alice creates a
// room, Bob joins it, Alice picks a 10-card deck and starts the game. Returns both pages.
export async function startGame(browser) {
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();

  await host.goto('/');
  await host.getByLabel('Your name').fill('Alice');
  await host.getByRole('button', { name: 'Create a room for friends' }).click();
  await expect(host).toHaveURL(/\/lobby\/[A-Z2-9]{6}$/);
  const code = host.url().split('/').pop();

  await guest.goto('/');
  await guest.getByLabel('Your name').fill('Bob');
  await guest.getByLabel(/^Room code/).fill(code);
  await guest.getByRole('button', { name: 'Join room' }).click();
  await expect(guest).toHaveURL(/\/lobby\//);

  // A short game keeps the tests quick
  await host.getByText('10 rounds', { exact: true }).click();
  await host.getByRole('button', { name: 'Start the game' }).click();
  await expect(host).toHaveURL(/\/game\//);
  await expect(guest).toHaveURL(/\/game\//);

  return {
    host,
    guest,
    code,
    close: async () => {
      await hostContext.close();
      await guestContext.close();
    },
  };
}
