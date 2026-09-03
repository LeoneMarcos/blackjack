# Blackjack Showcase Capture Script

Status: approved by the user before capture.

## Capture setup

- Route: `http://127.0.0.1:5173/`
- Browser: Playwright-managed Chromium
- Viewport: 1440x900
- Initial state: BOT enabled; allow the automatic opening BOT card to appear before opening the rules.
- Audio, captions, music, narration, zooms, and decorative overlays: not used.

## Takes

### Take 1 — Game Rules

1. Open the game with the BOT enabled and its automatic opening card visible.
2. Click `Game Rules`.
3. Keep the rules modal visible long enough to read.
4. Click `Got it`.

The beginning before the rules modal may be shortened in the edit so the rules are the first featured moment.

### Take 2 — BOT gameplay

1. Let the BOT’s automated play appear after closing the rules.
2. Turn the BOT off (`ON` to `OFF`).
3. Turn the BOT on again (`OFF` to `ON`) so the BOT round resets.
4. Click Player 1 repeatedly until the round ends and the BOT responds.
5. Keep the winner/loser notice visible, then wait for it to disappear.

### Take 3 — Local Player 1 vs Player 2

1. Turn the BOT off (`ON` to `OFF`).
2. Alternate clicks between Player 1 and Player 2 until the round ends.
3. Keep the winner/loser notice visible, then wait for it to disappear.
4. End the recording.

## Editorial plan

- Keep the takes in the order above.
- Use clean cuts between meaningful states, with restrained 250 ms crossfades between the approved takes.
- Do not use zooms, captions, music, narration, or sound effects.
- Remove only excess waiting before the rules, between actions, and after the final notice disappears.
- Preserve the card animations, BOT response, score changes, and ephemeral round notices.
