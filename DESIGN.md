# Blackjack visual contract

Version 3.0 · 2026-09-12 · Online P2P multiplayer update

## Direction

The interface is a restrained casino table built from charcoal surfaces, ivory controls and cards, compact typography, and a responsive single-screen layout. Visual treatment must support the game state rather than obscure it.

The implemented product supports three interaction flows:

- **BOT:** Player 1 plays against the Dealer.
- **Two Players:** Local sequential play: Player 1 acts first, Player 2 acts second, and the Dealer resolves last.
- **Online P2P:** Networked multiplayer: Host (Player 1) and Guest (Player 2) play with host authority over WebRTC DataChannels.

The Dealer's second card remains visually hidden until the Dealer turn across all modes.

## Composition

A compact header contains brand lockup, mode selection segmented control (`Play against BOT`, `Two players`, `Online P2P`), rules dialog trigger, and score reset utility.

Dealer and player stations use consistent dimensions and hierarchy so the full game remains usable at normal browser zoom. Two Players and Online modes present two player panels facing the Dealer station.

Mobile layouts stack content while preserving action order and readable cards. The application must avoid horizontal overflow across the supported viewport range.

## Online P2P UX States

Online P2P introduces dedicated states without altering the core table aesthetics:

1. **Lobby State (`idle`)**:
   - Card grid with "Host a Table" (Create Room button) and "Join a Table" (short code text input + Join button).
2. **Waiting for Peer (`waiting` / `creating`)**:
   - Prominent room code badge with one-click copy button.
   - Animated waiting pill: "Waiting for Player 2 to join...".
   - Cancel table action to return to lobby.
3. **Connecting (`connecting`)**:
   - Status pill: "Connecting via WebRTC...".
   - Informative subtext indicating encrypted RTCDataChannel negotiation.
4. **Connected Table Surface (`connected`)**:
   - Top bar displaying room code, connection pill, role badge (`Host (Authority)` or `Guest (Player 2)`), and exit button.
   - Dedicated Online scoreboard displaying independent local table scores.
5. **Readiness Phase (`idle`)**:
   - Player 1 (Host) and Player 2 (Guest) stations display readiness badges (`Ready` or `Not ready`).
   - Host action button reflects readiness progress (`Click Ready` → `Waiting for Guest` → `Deal hand`).
   - Dealing is strictly gated until both players are ready.
6. **Active Turns (`player-turn`, `p2-turn`, `dealer-turn`)**:
   - Active player sees interactive Hit / Stand buttons with keyboard hints (`1`/`H`, `2`/`H`, `S`).
   - Inactive player sees disabled waiting badge and descriptive status announcement.
   - Dealer hole card stays face-down until dealer turn.
7. **Round Resolution & Rematch (`round-ended`)**:
   - Hole card flips face up.
   - Station outcome badges display winner, busted, lost, or push.
   - Mutual rematch UX: Players click `Request Rematch` / `Deal again`; once both agree, the table auto-deals the next round.
8. **Disconnect & Error States (`disconnected`, `error`)**:
   - Warning pill: `Connection alert` / `Disconnected`.
   - Descriptive diagnostic message (e.g. room full, peer left, or connection failure).
   - Actions: `Retry` (re-initiates connection to same room) and `Back to Lobby`.

## Tokens

Background #171817; table #242623; raised surface #2c2e2a; foreground #eeece5; secondary #b1b1a7; subdued #9a9d92; borders #41443d; primary ivory #e9e5d9 with #faf7ee hover; danger #e39b93; focus #e9e5d9. Player identity is textual and positional, never dependent on color. Card faces #f4f0e7, black suits #292b28, red suits #9e463e.

Inter 400/500/600 is used for body text; Space Grotesk 500/600/700 for headings; Georgia serif for card faces. System fallbacks must remain available. Scores and timer use tabular numerals.

## States and interaction

Controls retain visible hover, pressed and focus states with accessible labels. Mode selection uses a three-choice segmented control. Actions are exposed only for the active participant.

Outcome presentation must distinguish win, loss, push and bust through both text and visual treatment. Score-change animation may reinforce an awarded point but cannot be the only indication of the result.

Keyboard shortcuts remain available when appropriate, but native focused interactive controls take precedence. The rules dialog retains Escape handling, focus containment and focus restoration.

## Motion and accessibility

Card motion is brief and functional. Reduced-motion preferences disable nonessential movement. Cards expose rank/suit labels, state colors have textual equivalents, and dialogs remain usable on short viewports.

Regression validation covers desktop and mobile layouts, BOT flow, sequential Two Players flow, Online P2P flow, Dealer hole-card reveal, keyboard interaction, and page overflow.
