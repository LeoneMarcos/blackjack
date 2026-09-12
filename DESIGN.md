# Blackjack visual contract

Version 2.1 · 2026-09-12 · Final release contract

## Direction

The interface is a restrained casino table built from charcoal surfaces, ivory controls and cards, compact typography, and a responsive single-screen layout. Visual treatment must support the game state rather than obscure it.

The implemented product has two interaction flows:

- **BOT:** Player 1 plays against the Dealer.
- **Two Players:** Player 1 acts first, Player 2 acts second, and the Dealer resolves last.

The Dealer's second card remains visually hidden until the Dealer turn.

## Composition

A compact header contains identity, mode selection, score and utility controls above a continuous playing surface. Dealer and player stations use consistent dimensions and hierarchy so the full game remains usable at normal browser zoom. Two Players mode adds the second player without changing the underlying table language.

Mobile layouts stack content while preserving action order and readable cards. The application must avoid horizontal overflow across the supported viewport range.

## Tokens

Background #171817; table #242623; raised surface #2c2e2a; foreground #eeece5; secondary #b1b1a7; subdued #9a9d92; borders #41443d; primary ivory #e9e5d9 with #faf7ee hover; danger #e39b93; focus #e9e5d9. Player identity is textual and positional, never dependent on color. Card faces #f4f0e7, black suits #292b28, red suits #9e463e.

Inter 400/500/600 is used for body text; Space Grotesk 500/600/700 for headings; Georgia serif for card faces. System fallbacks must remain available. Scores and timer use tabular numerals.

## States and interaction

Controls retain visible hover, pressed and focus states with accessible labels. Mode selection uses a two-choice segmented control. Actions are exposed only for the active participant.

Outcome presentation must distinguish win, loss, push and bust through both text and visual treatment. Score-change animation may reinforce an awarded point but cannot be the only indication of the result.

Keyboard shortcuts remain available when appropriate, but native focused interactive controls take precedence. The rules dialog retains Escape handling, focus containment and focus restoration.

Dealer status must reflect actual play: an early-ending round cannot describe an unplayed Dealer hand as standing.

## Motion and accessibility

Card motion is brief and functional. Reduced-motion preferences disable nonessential movement. Cards expose rank/suit labels, state colors have textual equivalents, and dialogs remain usable on short viewports.

Regression validation should cover desktop and mobile layouts, BOT flow, sequential Two Players flow, Dealer hole-card reveal, keyboard interaction, timer resolution, replay/reset, and page overflow.

## Showcase

The canonical showcase is generated from the implemented application rather than a mocked flow. It must capture the sequential Two Players behavior, an in-round state with the Dealer hole card face-down, and a completed state after Dealer reveal. Incomplete capture flows must fail rather than publish misleading media.
