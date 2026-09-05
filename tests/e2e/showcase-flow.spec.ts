import { expect, test } from '@playwright/test';

test.use({ video: 'on' });

test.describe('Blackjack showcase flow', () => {
  test('shows rules, BOT play, local play, and round feedback', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1_200);

    await page.getByRole('button', { name: 'View game rules' }).click();
    await page.waitForTimeout(1_800);
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Continue playing', exact: true }).click();
    await page.waitForTimeout(900);

    await page.getByRole('button', { name: 'Draw card for Player 1', exact: true }).click();
    await page.waitForTimeout(1_200);
    await expect(page.getByRole('list', { name: 'BOT cards', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Two players', exact: true }).click();
    await page.waitForTimeout(900);
    await page.keyboard.press('1');
    await page.waitForTimeout(700);
    await page.keyboard.press('2');
    await page.waitForTimeout(900);
    await expect(page.getByRole('list', { name: 'Player 1 cards', exact: true })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Player 2 cards', exact: true })).toBeVisible();

    for (let turn = 0; turn < 10; turn += 1) {
      const status = await page.getByRole('status').innerText();
      if (/won|tied|round complete/i.test(status)) break;
      const player = turn % 2 === 0 ? '1' : '2';
      await page.getByRole('button', { name: new RegExp(`card for Player ${player}`) }).click();
      await page.waitForTimeout(650);
    }
    await expect.poll(() => page.getByRole('status').innerText()).toMatch(/won|tied|round complete/i);
    await page.waitForTimeout(1_500);
  });
});
