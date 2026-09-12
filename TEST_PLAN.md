# Blackjack validation plan and evidence

## Critical flows

- Load the game and verify the default BOT mode.
- Complete a Player 1 vs Dealer round and verify Dealer autoplay.
- Confirm the Dealer hole card remains hidden until the Dealer turn.
- Verify Dealer hits below 17 and stands on 17+.
- Switch to Two Players and complete the sequential Player 1 → Player 2 → Dealer flow.
- Verify natural Blackjack can skip an already-complete player action phase.
- Verify per-player binary scoring and isolated mode scoreboards.
- Verify keyboard shortcuts do not override focused interactive controls.
- Open and close the rules dialog with keyboard recovery.
- Verify timer completion, replay/reset, responsive layouts, and no page errors.
- Capture the canonical showcase from the real game flow.

## Commands

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run showcase:prepare
```

## Final release evidence — 2026-09-11

The final feature branch passed the complete CI gate before merge:

- `npm run format:check`: PASS
- `npm run lint`: PASS
- `npm run typecheck`: PASS
- `npm test`: PASS — 47 unit/component tests
- `npm run build`: PASS
- `npm run test:e2e`: PASS — 5 Playwright specs

GitHub Actions CI run #51 completed successfully on the final PR head.

The canonical showcase was regenerated after the product flow was finalized. The resulting MP4 is H.264/yuv420p at 1440×900 with a 19.00-second duration. The media set includes BOT state, Two Players in-round state with the Dealer hole card hidden, Two Players final state with the Dealer revealed, mobile state, screenshots, GIF preview, raw WebM, and MP4.

The capture script is state-aware and fails on incomplete flows instead of silently producing misleading media.

## Scope

Automated validation targets the supported Chromium release flow. The application remains client-only and stores no secrets in source or showcase artifacts. Any future game-rule or interaction-flow change must update affected tests and regenerate canonical showcase media.
