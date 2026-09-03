import { chromium } from 'playwright';
import { copyFile, mkdir, unlink } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = process.cwd();
const rawDir = path.join(projectRoot, 'showcase-assets', 'raw');
const stableRawPath = path.join(rawDir, 'blackjack-showcase-raw.webm');

await mkdir(rawDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: rawDir, size: { width: 1440, height: 900 } }
});
const page = await context.newPage();
const video = page.video();

const waitForNotice = async () => {
  await page.getByRole('status').waitFor({ state: 'visible', timeout: 12000 });
  await page.waitForTimeout(3000);
};

try {
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1600);

  await page.getByRole('button', { name: 'View game rules' }).click();
  await page.waitForTimeout(3200);
  await page.getByRole('button', { name: 'Got it' }).click();
  await page.waitForTimeout(1800);

  // Reset the BOT round by switching it off and on, then demonstrate the response loop.
  await page.locator('#TrocarNPC').click();
  await page.waitForTimeout(900);
  await page.locator('#TrocarNPC').click();
  await page.waitForTimeout(1800);

  for (let i = 0; i < 8; i += 1) {
    if (await page.getByRole('status').count()) break;
    await page.locator('#hitP1').click();
    await page.waitForTimeout(900);
  }
  await waitForNotice();

  // Switch to local mode and alternate turns until the local round ends.
  await page.locator('#TrocarNPC').click();
  await page.waitForTimeout(1200);
  for (let i = 0; i < 10; i += 1) {
    if (await page.getByRole('status').count()) break;
    await page.locator(i % 2 === 0 ? '#hitP1' : '#cartaP2').click();
    await page.waitForTimeout(700);
  }
  await waitForNotice();
} finally {
  await context.close();
  await browser.close();
}

const recordedPath = await video.path();
await copyFile(recordedPath, stableRawPath);
if (recordedPath !== stableRawPath) await unlink(recordedPath);
console.log(JSON.stringify({ rawVideo: stableRawPath, viewport: '1440x900' }));
