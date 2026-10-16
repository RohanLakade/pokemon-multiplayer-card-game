import { expect, test } from '@playwright/test';

test('one player starts a game against the computer, finishes it and plays again', async ({
  browser,
}) => {
  test.setTimeout(120_000);

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto('/');
    await page.getByLabel('Your name').fill('Alice');
    await page.getByRole('button', { name: 'Play vs computer' }).click();

    // No lobby step: the game starts straight away, with the computer on the scoreboard
    await expect(page).toHaveURL(/\/game\//);
    await expect(page.getByRole('heading', { name: /^Round 1 of 10$/ })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Scoreboard' })).toContainText('Computer');

    // The human steps away, so the server plays both sides (the computer pauses before each move)
    await page.getByRole('button', { name: 'I need to step away' }).click();
    await expect(
      page.getByRole('heading', { level: 1, name: /wins the game!|It's a tie!/ }),
    ).toBeVisible({ timeout: 90_000 });

    // The human is the host: play again returns to the lobby, where the computer is still seated
    await page.getByRole('button', { name: 'Play again with the same players' }).click();
    await expect(page).toHaveURL(/\/lobby\//);
    await expect(page.getByRole('list', { name: 'Players in this room' })).toContainText(
      'Computer',
    );
  } finally {
    await context.close();
  }
});
