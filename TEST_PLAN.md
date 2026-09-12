# Blackjack validation plan and evidence

## Critical flows

### Local & Bot flows
- Load the game and verify default BOT mode.
- Complete a Player 1 vs Dealer round and verify Dealer autoplay.
- Confirm the Dealer hole card remains hidden until the Dealer turn.
- Verify Dealer hits below 17 and stands on 17+.
- Switch to Two Players and complete the sequential Player 1 → Player 2 → Dealer flow.
- Verify natural Blackjack can skip an already-complete player action phase.
- Verify per-player binary scoring and isolated mode scoreboards.
- Verify keyboard shortcuts do not override focused interactive controls.
- Open and close the rules dialog with keyboard recovery.
- Verify timer completion, replay/reset, responsive layouts, and no page errors.

### Online P2P multiplayer flows
- **Signaling Worker**: Room validation (3-8 uppercase alphanumeric), 2-peer room limit enforcement, create/join intent routing (prevent guest joining empty room as host or duplicate host creation), and WebSocket upgrade validation.
- **Signal Shape & Direction**: Role-enforced signaling schemas (only Host may initiate `offer`, only Guest may reply with `answer`, candidates allowed for both, dropping non-signaling or malformed frames).
- **Information Hiding**: `serializeCanonicalToPublic` projects public state without leaking undealt cards, deck array, RNG seeds, or the dealer hole card before dealer turn.
- **Host Authority & Negative Testing**: Host is the sole authority. Guest messages during idle, Player 1 turn, or post-round are rejected. Malformed messages, messages without `version: 1`, or messages with extra unrecognized fields are rejected.
- **Readiness Gating**: Dealing is strictly prevented until both Host and Guest mark ready state.
- **Full P2P Synchronization**: Two-context Playwright E2E testing WebRTC DataChannel connection, readiness handshake, deal, sequential turns, hole-card reveal, mutual rematch, and disconnect notification.

## Commands

```bash
# Code style and formatting
npm run format:check

# Static analysis and linting
npm run lint

# TypeScript compilation (client + worker)
npm run typecheck

# Unit and integration tests (Vitest)
npm test

# Production build
npm run build

# End-to-end browser tests (Playwright)
npm run test:e2e

# Worker configuration validation (dry run)
npx wrangler deploy --dry-run -c worker/wrangler.jsonc
```

## Validation Evidence — feat/online-p2p-multiplayer

- `npm run format:check`: PASS — all frontend, worker, and test files formatted with Prettier.
- `npm run lint`: PASS — zero ESLint warnings or errors across the entire codebase.
- `npm run typecheck`: PASS — both client `tsconfig.json` and worker `worker/tsconfig.json` typecheck cleanly without emit errors.
- `npm test`: PASS — 69 unit/integration tests passing:
  - `online-authority.test.ts`: Host authority validation, readiness gating, out-of-turn rejection, schema validation.
  - `online-lifecycle.test.ts`: End-to-end simulated DataChannel communication and round scoring.
  - `online-serializer.test.ts`: Information hiding, dealer masking, JSON leak prevention.
  - `worker.test.ts`: Durable Object signaling, 2-peer limit, create/join intent rejection, signal shape/direction validation.
  - `game-logic.test.ts`, `useBlackjackGame.test.ts`, `App.test.tsx`: Regressions for local BOT and Two Players modes pass.
- `npm run build`: PASS — Vite production bundle generated cleanly (`dist/`).
- `npm run test:e2e`: PASS — 6 Playwright specs passing, including `online-p2p.spec.ts` (two-browser context flow).
- `npx wrangler deploy --dry-run -c worker/wrangler.jsonc`: PASS — Worker bundle verified with Durable Object bindings.
