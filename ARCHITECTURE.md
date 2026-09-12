# Architecture

Blackjack is a client-only React single-page application rendered by Vite from `src/main.tsx`. There is no API, authentication, database, persistent storage, or server runtime.

## Presentation

`src/App.tsx` owns the primary screen composition, mode selection, scoreboard presentation, keyboard shortcuts, rules dialog integration, and round feedback. Reusable game presentation is split into local components such as `PlayerPanel`, `PlayingCard`, and `RulesModal`.

## Game state

`src/hooks/useBlackjackGame.ts` owns the reducer-driven game loop and the canonical turn sequence.

- BOT mode resolves Player 1 against the Dealer.
- Two Players mode resolves Player 1 → Player 2 → Dealer.
- Natural Blackjack can mark a player complete without an unnecessary action phase.
- Dealer autoplay keeps the hole card hidden until the Dealer turn, hits below 17, and stands on 17+.
- Dealer progression is driven by card state as well as score so soft-Ace recalculation cannot stall the turn.
- BOT and Two Players scoreboards remain isolated from one another.
- The 30-second round timer and automatic resolution stay inside the game-state layer.

## Domain rules

Pure deck, hand-value, Blackjack, and outcome logic live in `src/lib`. These functions stay independent from React presentation so rules can be covered deterministically by unit tests.

## Styling and assets

`src/index.css` contains the casino-style design tokens, responsive layout rules, card animation, outcome presentation, and mobile adaptations. Canonical showcase media is generated from the real application flow under `showcase-assets/`.

## Quality boundary

TypeScript strict mode, ESLint, Prettier, Vitest, Playwright, production builds, and GitHub Actions form the release gate. Product-flow changes must update automated coverage and regenerate showcase media when the recorded behavior is affected.
