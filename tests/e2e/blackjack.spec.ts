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
      const drawButton = page.getByRole('button', { name: 'Draw card for Player 1', exact: true });
      if (await drawButton.isVisible()) {
        await drawButton.click();
        await page.waitForTimeout(700);
      } else {
        break;
      }
    }
    await expect
      .poll(() => page.getByRole('status').innerText())
      .toMatch(/won|tied|round complete/i);

    await page.getByRole('button', { name: 'Deal again for Player 1', exact: true }).click();
    await expect(
      page.getByRole('button', { name: /Draw card for Player 1|Deal again for Player 1/ }),
    ).toBeEnabled();
  });

  test('hides the BOT hole card in Classic mode during active round and reveals it when round ends', async ({
    page,
  }) => {
    await page.goto('/');

    // Verify BOT mode is active by default
    await expect(
      page.getByRole('button', { name: 'Play against BOT', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');

    const playerOne = page.getByRole('button', { name: 'Draw card for Player 1', exact: true });
    await playerOne.click();

    // Verify cards are visible
    const botCards = page.getByRole('list', { name: 'BOT cards', exact: true });
    await expect(botCards).toBeVisible();

    const status = await page.getByRole('status').innerText();
    if (!/won|tied|round complete/i.test(status)) {
      const faceDownCard = page.getByLabel('Face-down card');
      await expect(faceDownCard).toBeVisible();

      // Verify score display does not reveal full total
      const botScore = page.getByLabel('BOT score');
      await expect(botScore).toContainText('+ ?');

      // Continue round until completion
      for (let turn = 0; turn < 8 && !(await roundIsComplete(page)); turn += 1) {
        const drawBtn = page.getByRole('button', { name: 'Draw card for Player 1', exact: true });
        if (await drawBtn.isVisible()) {
          await drawBtn.click();
          await page.waitForTimeout(700);
        } else {
          break;
        }
      }
    }

    await expect
      .poll(() => page.getByRole('status').innerText())
      .toMatch(/won|tied|round complete/i);

    // Once round is over, hidden card is revealed
    await expect(page.getByLabel('Face-down card')).toBeHidden();
    const botScore = page.getByLabel('BOT score');
    await expect(botScore).not.toContainText('?');
  });

  test('supports keyboard controls, rules dialog, and score reset', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /Two players/ })).toBeEnabled();

    await page.keyboard.press('1');
    await expect(page.getByRole('list', { name: 'Player 1 cards', exact: true })).toBeVisible();
    await expect(page.getByRole('list', { name: 'BOT cards', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'View game rules' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();

    await page.keyboard.press('r');
    await expect(page.getByRole('list', { name: 'Player 1 cards', exact: true })).toHaveCount(0);
    await expect(page.getByRole('list', { name: 'BOT cards', exact: true })).toHaveCount(0);
  });

  test('supports Two players mode with both players facing the Dealer', async ({ page }) => {
    await page.goto('/');
    const twoPlayersBtn = page.getByRole('button', { name: 'Two players' });
    await expect(twoPlayersBtn).toBeEnabled();
    await twoPlayersBtn.click();
    await expect(twoPlayersBtn).toHaveAttribute('aria-pressed', 'true');

    // Both players and dealer should be visible
    await expect(page.getByRole('heading', { name: 'Player 1' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Player 2' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Dealer' })).toBeVisible();

    // Deal round
    await page.getByRole('button', { name: 'Draw card for Player 1' }).click();
    await expect(page.getByRole('list', { name: 'Player 1 cards' })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Player 2 cards' })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Dealer cards' })).toBeVisible();
  });
});
