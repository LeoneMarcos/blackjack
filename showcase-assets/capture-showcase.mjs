import { chromium } from 'playwright';
import { copyFile, mkdir, unlink } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';

const projectRoot = process.cwd();
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4173/';
const rawDir = path.join(projectRoot, 'showcase-assets', 'raw');
const screenshotsDir = path.join(projectRoot, 'showcase-assets', 'screenshots');
const stableRawPath = path.join(rawDir, 'blackjack-showcase-raw.webm');

await mkdir(rawDir, { recursive: true });
await mkdir(screenshotsDir, { recursive: true });

const serverURL = new URL(baseURL);
let ownedServer;
const isServerReady = async () => {
  try {
    const response = await fetch(serverURL);
    return response.ok;
  } catch {
    return false;
  }
};

if (!(await isServerReady())) {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  ownedServer = spawn(npmCommand, ['run', 'dev', '--', '--host', serverURL.hostname, '--port', serverURL.port], {
    cwd: projectRoot,
    shell: true,
    stdio: 'ignore',
    windowsHide: true,
  });
  const deadline = Date.now() + 30_000;
  while (!(await isServerReady()) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (!(await isServerReady())) throw new Error(`Vite did not become ready at ${baseURL}`);
}

const headless = process.env.CI === 'true' || process.env.CI === '1' || process.env.SHOWCASE_HEADLESS === '1';
const browser = await chromium.launch({ headless });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: rawDir, size: { width: 1440, height: 900 } },
});
const page = await context.newPage();
const video = page.video();
let failure;

const isRoundComplete = async () => {
  try {
    const dealAgain = page.getByRole('button', { name: 'Deal again for Player 1', exact: true });
    if (await dealAgain.isVisible()) return true;
    const badgeCount = await page.locator('.outcome-badge').count();
    if (badgeCount > 0) return true;
    const status = await page.getByRole('status').innerText();
    return /won|tied|round complete|both players busted|dealer busted/i.test(status);
  } catch {
    return false;
  }
};

const waitForRoundComplete = async (timeoutMs = 12_000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isRoundComplete()) return;
    await page.waitForTimeout(250);
  }
  if (await isRoundComplete()) return;
  throw new Error(`Round did not complete within ${timeoutMs}ms`);
};

const getPlayerScore = async (playerLabel) => {
  try {
    const text = await page.getByLabel(`${playerLabel} score`).innerText();
    const match = text.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  } catch {
    return 0;
  }
};

const playHand = async (playerLabel, timeoutMs = 12_000) => {
  const hitBtn = page.getByRole('button', { name: `Draw card for ${playerLabel}`, exact: true });
  const standBtn = page.getByRole('button', { name: `Stand for ${playerLabel}`, exact: true });
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await isRoundComplete()) return;

    const canStand = await standBtn.isEnabled().catch(() => false);
    if (!canStand) return;

    const score = await getPlayerScore(playerLabel);
    const canHit = await hitBtn.isEnabled().catch(() => false);

    if (score < 17 && canHit) {
      await hitBtn.click();
      await page.waitForTimeout(800);
      continue;
    }

    await standBtn.click();
    await page.waitForTimeout(800);
    return;
  }

  throw new Error(`${playerLabel} hand did not finish within ${timeoutMs}ms`);
};

const waitForPlayerTurn = async (playerLabel, timeoutMs = 5_000) => {
  const standBtn = page.getByRole('button', { name: `Stand for ${playerLabel}`, exact: true });
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await isRoundComplete()) return false;
    if (await standBtn.isEnabled().catch(() => false)) return true;
    await page.waitForTimeout(100);
  }

  if (await isRoundComplete()) return false;
  throw new Error(`${playerLabel} did not become active within ${timeoutMs}ms`);
};

const checkpoint = (name) =>
  page.screenshot({ path: path.join(screenshotsDir, `blackjack-${name}.png`) });

try {
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1_500);
  await checkpoint('hero');

  await page.getByRole('button', { name: 'View game rules' }).click();
  await page.waitForTimeout(2_000);
  await checkpoint('rules');
  await page.getByRole('button', { name: 'Continue playing', exact: true }).click();
  await page.waitForTimeout(1_000);

  // Take 2 — BOT gameplay
  const p1BotDealBtn = page.getByRole('button', { name: 'Draw card for Player 1', exact: true });
  await p1BotDealBtn.click();
  await page.waitForTimeout(1_200);

  await playHand('Player 1');
  await waitForRoundComplete();
  await page.waitForTimeout(1_000);
  await checkpoint('bot-round');

  // Take 3 — Sequential Two Players gameplay
  await page.getByRole('button', { name: 'Two players', exact: true }).click();
  await page.waitForTimeout(1_000);
  await checkpoint('local-empty');

  // Start round through the real UI
  const p1LocalDealBtn = page.getByRole('button', { name: 'Draw card for Player 1', exact: true });
  await p1LocalDealBtn.click();
  await page.waitForTimeout(1_200);

  // Capture in-round state while the Dealer hole card is still hidden
  await checkpoint('local-cards');

  // Sequential play: complete Player 1 hand first
  await playHand('Player 1');
  await page.waitForTimeout(500);

  // Sequential play: complete Player 2 hand only when Player 2 is actually active
  if (await waitForPlayerTurn('Player 2')) {
    await playHand('Player 2');
  }
  await page.waitForTimeout(500);

  // Dealer autoplay plays and reveals hole card
  await waitForRoundComplete();
  await page.waitForTimeout(1_500);
  await checkpoint('local-result');

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await mobilePage.evaluate(() => document.fonts.ready);
  await mobilePage.waitForTimeout(1_000);
  await mobilePage.screenshot({ path: path.join(screenshotsDir, 'blackjack-mobile.png') });
  await mobileContext.close();
} catch (error) {
  failure = error;
} finally {
  await context.close();
  await browser.close();
  ownedServer?.kill();
}

if (!video) throw new Error('Playwright did not expose the recorded video.');
const recordedPath = await video.path();
await copyFile(recordedPath, stableRawPath);
if (recordedPath !== stableRawPath) await unlink(recordedPath);
if (failure) throw failure;

console.log(JSON.stringify({ rawVideo: stableRawPath, screenshots: screenshotsDir, viewport: '1440x900' }));
