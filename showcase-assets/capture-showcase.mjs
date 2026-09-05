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

const browser = await chromium.launch({ channel: 'chrome', headless: false });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: rawDir, size: { width: 1440, height: 900 } },
});
const page = await context.newPage();
const video = page.video();
let failure;

const statusIsComplete = async () =>
  /won|tied|round complete/i.test(await page.getByRole('status').innerText());

const checkpoint = (name) =>
  page.screenshot({ path: path.join(screenshotsDir, `blackjack-${name}.png`) });

try {
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1_500);

  await page.getByRole('button', { name: 'View game rules' }).click();
  await page.waitForTimeout(2_000);
  await checkpoint('rules');
  await page.getByRole('button', { name: 'Continue playing', exact: true }).click();
  await page.waitForTimeout(1_000);

  for (let turn = 0; turn < 8 && !(await statusIsComplete()); turn += 1) {
    await page.getByRole('button', { name: /card for Player 1/ }).click();
    await page.waitForTimeout(750);
  }
  await page.waitForTimeout(500);
  await checkpoint('bot-round');

  await page.getByRole('button', { name: 'Two players', exact: true }).click();
  await page.waitForTimeout(1_000);
  await checkpoint('local-empty');
  await page.keyboard.press('1');
  await page.waitForTimeout(750);
  await page.keyboard.press('2');
  await page.waitForTimeout(1_000);
  await checkpoint('local-cards');

  for (let turn = 0; turn < 10 && !(await statusIsComplete()); turn += 1) {
    const player = turn % 2 === 0 ? '1' : '2';
    await page.getByRole('button', { name: new RegExp(`card for Player ${player}`) }).click();
    await page.waitForTimeout(700);
  }
  await page.waitForTimeout(1_200);
  await checkpoint('local-result');
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
