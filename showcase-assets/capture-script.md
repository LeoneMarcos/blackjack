# Blackjack Showcase Capture Script

Status: approved by the user before capture.

## Capture setup

- Route: `http://127.0.0.1:4173/` (override with `PLAYWRIGHT_BASE_URL`)
- Browser: isolated headed Playwright-managed Chrome
- Viewport: 1440x900
- Initial state: BOT enabled; allow fonts and the opening state to settle before opening the rules.
- Audio, captions, music, narration, zooms, and decorative overlays: not used.

## Takes

### Take 1 — Game rules

1. Open the game with the BOT enabled and its automatic opening card visible.
2. Click `Game Rules`.
3. Keep the rules modal visible long enough to read.
4. Click `Continue playing`.

The beginning before the rules modal may be shortened in the edit so the rules are the first featured moment.

### Take 2 — BOT gameplay

1. Let the BOT’s automated play appear after closing the rules.
2. Click Player 1 repeatedly until the round ends and the BOT responds.
3. Keep the winner/loser notice visible for a short dwell.

### Take 3 — Local Player 1 vs Player 2

1. Select `Two players`.
2. Use keyboard `1` and `2` once to reveal both hands.
3. Alternate clicks between Player 1 and Player 2 until the round ends.
4. Keep the winner/loser notice visible, then end the recording.

## Commands

Run `npm run showcase:prepare`; the capture script reuses a ready `PLAYWRIGHT_BASE_URL` or starts and stops Vite on port 4173. The raw WebM is retained at `showcase-assets/raw/blackjack-showcase-raw.webm`; the converted H.264 MP4 is written to `showcase-assets/blackjack-showcase.mp4`. Run `npm run showcase:publish` only after reviewing the MP4; it uploads through the authenticated GitHub CLI, verifies the attachment as `video/mp4`, updates README, and closes the temporary helper issue.

## Editorial plan

- Keep the takes in the order above.
- Use clean cuts between meaningful states, with restrained 250 ms crossfades between the approved takes.
- Do not use zooms, captions, music, narration, or sound effects.
- Remove only excess waiting before the rules, between actions, and after the final notice disappears.
- Preserve the card animations, BOT response, score changes, and ephemeral round notices.
