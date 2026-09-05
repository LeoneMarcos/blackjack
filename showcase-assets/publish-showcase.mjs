import { readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';

const root = process.cwd();
const videoPath = path.join(root, 'showcase-assets', 'blackjack-showcase.mp4');
const readmePath = path.join(root, 'README.md');
const gh = process.platform === 'win32' ? 'gh.exe' : 'gh';

const run = (args) =>
  new Promise((resolve, reject) => {
    const child = spawn(gh, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0 ? resolve(stdout.trim()) : reject(new Error(`gh exited ${code}: ${stderr}`)),
    );
  });

const repo = execFileSync(gh, ['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner'], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'ignore'],
}).trim();
execFileSync(gh, ['auth', 'status'], { stdio: 'ignore' });
execFileSync(gh, ['issue', 'create', '--help'], { stdio: 'ignore' });

const bodyPath = path.join(root, 'showcase-assets', '.showcase-upload-body.md');
await writeFile(bodyPath, '![Blackjack showcase](./blackjack-showcase.mp4)\n', 'utf8');
let issueUrl;
try {
  issueUrl = await run([
    'issue',
    'create',
    '--repo',
    repo,
    '--title',
    'Temporary Blackjack showcase video upload',
    '--body-file',
    bodyPath,
    '--attach',
    videoPath,
  ]);
} finally {
  await unlink(bodyPath).catch(() => undefined);
}

const body = await run(['issue', 'view', issueUrl, '--repo', repo, '--json', 'body', '--jq', '.body']);
const assetUrl = body.match(/https:\/\/github\.com\/user-attachments\/assets\/[^\s)]+/)?.[0];
if (!assetUrl) throw new Error('The GitHub issue body did not contain a user-attachment URL.');

const token = execFileSync(gh, ['auth', 'token'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
const response = await fetch(assetUrl, {
  headers: { Authorization: `Bearer ${token}`, Accept: 'video/mp4' },
});
if (response.status !== 200 || !response.headers.get('content-type')?.includes('video/mp4')) {
  throw new Error(`GitHub attachment verification failed with ${response.status}.`);
}

const readme = await readFile(readmePath, 'utf8');
const showcasePattern = /(## Showcase\s*\n\s*Watch the real browser flow in the showcase video:\s*\n\s*)https?:\/\/\S+/;
if (!showcasePattern.test(readme)) throw new Error('Could not locate the README Showcase video section.');
await writeFile(readmePath, readme.replace(showcasePattern, `$1${assetUrl}`), 'utf8');

await run(['issue', 'close', issueUrl, '--repo', repo, '--comment', 'Attachment published in the README Showcase section.']);
console.log(JSON.stringify({ repo, issueUrl, assetUrl, readme: readmePath, contentType: response.headers.get('content-type') }));
