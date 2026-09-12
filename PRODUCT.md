# Product scope

Blackjack is a casino-style card game with three supported modes:

- **BOT mode:** Player 1 plays against the Dealer.
- **Two Players mode:** Local sequential play: Player 1 completes their hand, then Player 2 completes theirs, then the Dealer resolves the round.
- **Online P2P mode:** Peer-to-peer multiplayer using native WebRTC DataChannels with host authority and Cloudflare Worker Durable Object signaling.

## Canonical rules

- A standard 52-card deck is used.
- Aces count as 1 or 11 according to the hand value.
- The Dealer's second card stays face-down until the Dealer turn.
- The Dealer hits below 17 and stands on 17+.
- Natural Blackjack can complete a player turn without requiring an extra action.
- In Two Players and Online P2P modes, each player is scored independently against the Dealer.
- The Dealer earns a point in Two Players and Online modes only when defeating both players.
- Pushes do not award a point.
- BOT and Two Players / Online scoreboards are tracked independently.
- Rounds retain the 30-second timer and automatic resolution behavior in local play.

## Online P2P rules & trust model

- **Topology:** Exactly two peers per room (Host as Player 1, Guest as Player 2).
- **Authority:** Host tab is the authoritative game master. Host manages deck generation, shuffle, dealing, dealer autoplay, scoring, and turn progression.
- **Guest interface:** Guest (Player 2) is untrusted and can only submit versioned, typed intention messages (`ready`, `hit`, `stand`, `rematch`). Guest actions are validated by the Host and only accepted during Player 2's turn.
- **Readiness gating:** Dealing a round is gated on both players indicating ready state (`hostReady` and `guestReady`).
- **Information hiding:** The Dealer hole card, undealt deck, and RNG metadata are strictly concealed on the Host and never transmitted over the network until valid revelation during the Dealer turn.
- **Signaling:** The standalone `blackjack-signaling` Cloudflare Worker with Durable Objects (`RoomDO`) handles room allocation and WebRTC signaling exchange (SDP offer/answer and ICE candidates). No gameplay traffic passes through the service once the DataChannel is open.

## Product boundaries

The game requires no accounts, passwords, matchmaking queues, chat, persistent database records, or payments. Signaling is strictly ephemeral and scoped to active 2-player rooms.

## Acceptance contract

The supported release must preserve:

- readable empty, waiting, connecting, playing, and completed states across all modes;
- usable BOT, sequential local Two Players, and Online P2P flows;
- visual identity: dark charcoal card table, ivory cards, and typography;
- correct Dealer hole-card reveal timing and strict information hiding;
- stable Dealer autoplay, including soft-Ace hands;
- keyboard controls that do not override focused interactive controls;
- responsive layouts without horizontal overflow;
- deterministic automated coverage for local and online critical game flows;
- canonical showcase media representing the implemented game.
