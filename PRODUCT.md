# Product scope

Blackjack is a single-page, client-only card game with two supported modes:

- **BOT mode:** Player 1 plays against the Dealer.
- **Two Players mode:** Player 1 completes their hand, then Player 2 completes theirs, then the Dealer resolves the round.

## Canonical rules

- A standard 52-card deck is used.
- Aces count as 1 or 11 according to the hand value.
- The Dealer's second card stays face-down until the Dealer turn.
- The Dealer hits below 17 and stands on 17+.
- Natural Blackjack can complete a player turn without requiring an extra action.
- In Two Players mode, each player is scored independently against the Dealer.
- The Dealer earns a point in Two Players mode only when defeating both players.
- Pushes do not award a point.
- BOT and Two Players scoreboards are tracked independently.
- Rounds retain the 30-second timer and automatic resolution behavior.

## Product boundaries

The game is local and browser-only. It has no accounts, payments, persistence, backend API, network multiplayer, or server-side game state.

## Acceptance contract

The supported release must preserve:

- readable empty, playing, and completed states;
- usable BOT and sequential Two Players flows;
- correct Dealer hole-card reveal timing;
- stable Dealer autoplay, including soft-Ace hands;
- keyboard controls that do not override focused interactive controls;
- responsive layouts without horizontal overflow;
- deterministic automated coverage for the critical game flows;
- canonical showcase media that represents the implemented rules.
