import { expect, test } from '@playwright/test';
import { startGame } from './helpers.js';

test('two players on auto-play finish a whole game, then play again', async ({ browser }) => {
  const game = await startGame(browser);
  const { host, guest } = game;

  try {
    // With auto-play on for both, the server makes every move at once
    await host.getByRole('button', { name: 'I need to step away' }).click();
    await guest.getByRole('button', { name: 'I need to step away' }).click();

    // The last round's result closes by itself, then the final result page appears
    for (const page of [host, guest]) {
      await expect(
        page.getByRole('heading', { level: 1, name: /wins the game!|It's a tie!/ }),
      ).toBeVisible({ timeout: 30_000 });
    }

    // Only the host can start the next game, and everybody returns to the lobby of the same room
    await expect(guest.getByText('Waiting for the host to start a new game…')).toBeVisible();
    await host.getByRole('button', { name: 'Play again with the same players' }).click();
    await expect(host).toHaveURL(/\/lobby\//);
    await expect(guest).toHaveURL(/\/lobby\//);
  } finally {
    await game.close();
  }
});

test('a round: the leader chooses a stat, picks stay secret, then the cards are revealed', async ({
  browser,
}) => {
  const game = await startGame(browser);
  const { host, guest } = game;

  try {
    // Only the round leader gets the stat buttons. Whoever shows them first is the leader.
    const hostStats = host.getByRole('group', { name: 'Choose a stat' });
    const guestStats = guest.getByRole('group', { name: 'Choose a stat' });
    await Promise.race([hostStats.waitFor(), guestStats.waitFor()]);
    const hostLeads = await hostStats.isVisible();
    const leader = hostLeads ? host : guest;
    const other = hostLeads ? guest : host;

    await expect(other.getByRole('group', { name: 'Choose a stat' })).toHaveCount(0);
    await leader.getByRole('button', { name: 'Choose Speed' }).click();

    // The leader picks a card first: the other player is only told THAT they picked
    await leader.getByRole('button', { name: /^Play / }).click();
    await expect(leader.getByText(/You picked .*Waiting for the other players/)).toBeVisible();
    await expect(other.getByText('Picked')).toBeVisible();
    await expect(other.getByRole('dialog')).toHaveCount(0);

    // The last pick reveals every card at the same time, for both players
    await other.getByRole('button', { name: /^Play / }).click();
    for (const page of [host, guest]) {
      await expect(page.getByText(/Round 1, stat: Speed/)).toBeVisible();
      await expect(page.getByRole('list', { name: 'Revealed cards' })).toBeVisible();
    }
  } finally {
    await game.close();
  }
});

test('a player who leaves a running game can rejoin from the home page', async ({ browser }) => {
  const game = await startGame(browser);
  const { guest } = game;

  try {
    // Leaving asks for confirmation in a browser dialog
    guest.once('dialog', (dialog) => dialog.accept());
    await guest.getByRole('button', { name: 'Leave game' }).click();
    await expect(guest).toHaveURL(/\/$/);

    // The seat was kept, so the home page offers to go back
    await expect(guest.getByText('You have a game in progress')).toBeVisible();
    await guest.getByRole('button', { name: 'Rejoin the game' }).click();

    await expect(guest).toHaveURL(/\/game\//);
    await expect(guest.getByRole('heading', { name: /^Round \d+ of 10$/ })).toBeVisible();
  } finally {
    await game.close();
  }
});
