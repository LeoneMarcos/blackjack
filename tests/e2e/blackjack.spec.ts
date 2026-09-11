import { expect, test } from '@playwright/test';

async function roundIsComplete(page: import('@playwright/test').Page) {
  const status = await page.getByRole('status').innerText();
  return /won|tied|round complete/i.test(status);
}

test.describe('Blackjack critical browser flows', () => {
  test('loads, deals against the BOT, and starts a new round', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('Blackjack');
    await expect(
      page.getByRole('button', { name: 'Play against BOT', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');

    const playerOne = page.getByRole('button', { name: 'Draw card for Player 1', exact: true });
    await playerOne.click();
    await expect(page.getByRole('list', { name: 'Player 1 cards', exact: true })).toBeVisible();
    await expect(page.getByRole('list', { name: 'BOT cards', exact: true })).toBeVisible({
      timeout: 3_000,
    });

    for (let turn = 0; turn < 8 && !(await roundIsComplete(page)); turn += 1) {
      await page.getByRole('button', { name: 'Draw card for Player 1', exact: true }).click();
      await page.waitForTimeout(650);
    }
    await expect
      .poll(() => page.getByRole('status').innerText())
      .toMatch(/won|tied|round complete/i);

    await page.getByRole('button', { name: 'Deal again for Player 1', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Draw card for Player 1', exact: true }),
    ).toBeEnabled();
  });

  test('hides the BOT hole card in Classic mode during active round and reveals it when round ends', async ({
    page,
  }) => {
    await page.goto('/');

    // Verify Classic mode toggle is active by default for BOT
    await expect(page.getByRole('button', { name: 'Classic mode', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    // Draw for Player 1
    const playerOne = page.getByRole('button', { name: 'Draw card for Player 1', exact: true });
    await playerOne.click();
    await page.waitForTimeout(800);
    await playerOne.click();
    await page.waitForTimeout(800);

    // Verify face-down card is present during active round if BOT has at least 2 cards
    const botCards = page.getByRole('list', { name: 'BOT cards', exact: true });
    await expect(botCards).toBeVisible();

    const faceDownCard = page.getByLabel('Face-down card');
    await expect(faceDownCard).toBeVisible();

    // Verify score display does not reveal full total
    const botScore = page.getByLabel('BOT score');
    await expect(botScore).toContainText('+ ?');

    // Continue round until completion
    for (let turn = 0; turn < 8 && !(await roundIsComplete(page)); turn += 1) {
      if (
        await page.getByRole('button', { name: 'Draw card for Player 1', exact: true }).isVisible()
      ) {
        await page.getByRole('button', { name: 'Draw card for Player 1', exact: true }).click();
        await page.waitForTimeout(650);
      }
    }

    await expect
      .poll(() => page.getByRole('status').innerText())
      .toMatch(/won|tied|round complete/i);

    // Once round is over, hidden card is revealed
    await expect(page.getByLabel('Face-down card')).toBeHidden();
    await expect(botScore).not.toContainText('?');
  });

  test('switches to local play, supports keyboard controls, rules, and reset', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Two players', exact: true }).click();

    await page.keyboard.press('1');
    await page.keyboard.press('2');
    await expect(page.getByRole('list', { name: 'Player 1 cards', exact: true })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Player 2 cards', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'View game rules' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();

    await page.keyboard.press('r');
    await expect(page.getByRole('list', { name: 'Player 1 cards', exact: true })).toHaveCount(0);
    await expect(page.getByRole('list', { name: 'Player 2 cards', exact: true })).toHaveCount(0);
  });
});
