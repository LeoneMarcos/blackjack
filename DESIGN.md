# Blackjack visual contract

Version 2.0 · 2026-09-05 · UI/UX refresh

## Direction and scope
The user selected immersive-experience 1.0.0 and requested neutral colors. Instantiate its spatial composition, clear HUD, recovery, touch and keyboard invariants as a quiet charcoal card table. Adapt the palette locally as permitted by that system; do not modify the global system. Preserve existing game rules, timers, BOT behavior and scoreboards. No stack migration or deployment is included.

## Composition
A 1200px content frame contains a compact brand/score/help header, a mode toolbar, a continuous playing surface and a secondary keyboard footer. Two equal player regions share a table with a fine center divider rather than independent colorful containers. Scores sit beside player identities; cards occupy the visual center. An understated central table inscription supplies atmosphere without media downloads. Mobile below 640px stacks the hands and removes the central inscription; below 1024px the header wraps. Safe margins are 24px desktop and 16px mobile.

## Tokens
Background #171817; table #242623; raised surface #2c2e2a; foreground #eeece5; secondary #b1b1a7; subdued #9a9d92; borders #41443d; primary ivory #e9e5d9 with #faf7ee hover; danger #e39b93; focus #e9e5d9. Player identity is textual and positional, never dependent on a color. Card faces #f4f0e7, black suits #292b28, red suits #9e463e.

Inter 400/500/600 for body; Space Grotesk 500/600/700 for headings; Georgia serif for the decorative table inscription and card faces. Fall back to system-ui for interface fonts. Font scale: 12px metadata, 14px supporting text, 16px body, 20px player titles, 28px brand, 40px scores. Tabular numerals for scores/timer. Spacing follows 4/8/12/16/24/32/48/64. Corners: 4px keys, 8px buttons/cards, 16px dialog; table 48px to convey a shared playing surface. Only table/card surfaces cast shadows.

## States and interaction
Controls are at least 44px tall, use visible hover/pressed/focus states and retain accessible labels. Mode is a two-choice segmented control with aria-pressed. Empty hands use a pair of outlined card silhouettes, a suit mark and a short instruction. Dealt cards overlap and wrap when necessary. Actions remain anchored below cards. BOT state describes automated control and hides the unavailable keyboard shortcut. Round results remain live text, with danger styling for bust. Rules retain close/backdrop/Escape, focus trap and focus restoration; game shortcuts are suppressed while the dialog is open. The round clock continues, preserving existing behavior.

## Motion and accessibility
Cards enter over 220ms, controls respond over 120ms; no ambient animation. Reduced-motion disables movement. Textual status supplements all state colors. Cards have accessible rank/suit labels. Dialog body scrolls on short viewports. Verify 1440x900, 768x1024, 390x844 and 320x740, keyboard dialog recovery, BOT/local dealing, timer completion, replay, reset and page overflow. Use existing unit/static/build gates and installed Playwright. No new dependencies required.

## Header refinement
Generated two-card neutral icon: public/blackjack-neutral.webp, 56px display. Scoreboard uses a restrained bordered charcoal surface with tabular numerals; timer uses a separate stone surface, two-digit seconds and muted danger styling below 11 seconds. The subsequent showcase work adds a versioned Playwright flow and keeps the capture artifacts outside the runtime bundle. Built-in imagegen prompt: two overlapping playing cards based on the original icon, ivory/stone/charcoal palette, subtle bevels, transparent background, no text or glow.
