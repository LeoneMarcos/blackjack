# Blackjack validation plan and evidence

## Critical flows

- Load the single-screen game and verify the title and default BOT mode.
- Draw for Player 1 and wait for the BOT response.
- Complete a BOT round and deal a new round.
- Switch to local mode, draw for both players with keyboard `1` and `2`, open and close rules with `Escape`, and reset with `R`.
- Capture the approved visual flow with rules, BOT play, local play and round feedback.

## Commands

- `npm run test:e2e` runs the versioned Chromium suite through `playwright.config.ts`.
- `npm run test:e2e:visual-flow` runs the visual flow with Playwright video enabled.
- `npm run showcase:prepare` captures a headed WebM, retains checkpoints, and converts it to H.264 MP4.
- `npm run showcase:publish` uploads the MP4 through GitHub CLI, verifies the authenticated attachment, updates README and closes the temporary helper issue.

## Evidence from 2026-09-05

`npm run test:e2e`: **PASS**, 3 tests passed in Chromium. The suite covers BOT response and replay, local keyboard controls, rules dialog recovery and score reset, plus the visual flow's round feedback.

`npm run showcase:prepare`: **PASS**. Raw source: `showcase-assets/raw/blackjack-showcase-raw.webm`. The converter trims the first 0.08 seconds to remove the partially painted startup frame, then writes `showcase-assets/blackjack-showcase.mp4` as H.264, yuv420p, 1440×900, 14.84 seconds, 350,058 bytes. Checkpoints are in `showcase-assets/screenshots/` and were visually inspected, including rules, BOT result, local cards, local result and a mid-video BOT-thinking frame.

`npm run showcase:publish`: **PASS**. GitHub accepted the attachment as `video/mp4`; the verified user-attachment URL is now in the local README Showcase section. The temporary upload issue was closed. The repository was not committed or pushed as part of this task.

## Scope limits

The E2E suite runs Chromium locally and does not yet run in CI. Firefox/WebKit, Lighthouse, axe-core and full raw-video playback were not part of this capture pass. No secrets are stored in the repository or artifacts.
