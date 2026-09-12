<p align="center">
  <img src="./public/blackjack-neutral.webp" alt="Blackjack icon" width="140" />
</p>

<h1 align="center">Blackjack</h1>

<p align="center">
  A polished, browser-based Blackjack game with solo and sequential local multiplayer against a classic automated Dealer.
</p>

<p align="center">
  <a href="https://blackjack.leonemarcos.com/">
    <img src="https://img.shields.io/badge/Demo-Live-2f2f2f?style=flat-square&logo=googlechrome&logoColor=white" alt="Live Demo" />
  </a>
  <a href="https://github.com/LeoneMarcos/blackjack/actions/workflows/ci.yml">
    <img src="https://img.shields.io/github/actions/workflow/status/LeoneMarcos/blackjack/ci.yml?branch=main&style=flat-square&label=CI&logo=githubactions&logoColor=white" alt="CI" />
  </a>
  <a href="https://github.com/LeoneMarcos/blackjack/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/License-Apache%202.0-2f2f2f?style=flat-square" alt="Apache 2.0 License" />
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-149eca?style=flat-square&logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178c6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript 5.9" />
  <img src="https://img.shields.io/badge/Vite-7-646cff?style=flat-square&logo=vite&logoColor=white" alt="Vite 7" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06b6d4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS 4" />
  <img src="https://img.shields.io/badge/Vitest-4-6e9f18?style=flat-square&logo=vitest&logoColor=white" alt="Vitest 4" />
  <img src="https://img.shields.io/badge/Playwright-1.63-2ead33?style=flat-square&logo=playwright&logoColor=white" alt="Playwright 1.63" />
</p>

<p align="center">
  <a href="#overview">Overview</a> ·
  <a href="#showcase">Showcase</a> ·
  <a href="#features">Features</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="#tech-stack">Tech Stack</a> ·
  <a href="#quick-start">Quick Start</a> ·
  <a href="#testing">Testing</a> ·
  <a href="#documentation">Documentation</a>
</p>

<p align="center">
  <img src="./showcase-assets/screenshots/blackjack-hero.png" alt="Blackjack Table Interface" width="100%" />
</p>

---

## Overview

**Blackjack** is a lightweight card game designed around a focused casino-style interface. In BOT mode, Player 1 plays against the Dealer. In Two Players mode, Player 1 completes their hand first, Player 2 plays second, and the Dealer resolves the round last. Each mode keeps its own scoreboard.

The interface uses a continuous charcoal card table, ivory playing cards, restrained typography, Lucide icons, responsive layouts, and inline round feedback that keeps the game visible.

### Highlights

- **Three game modes** — Play Player 1 vs Dealer in BOT mode, sequential Player 1 → Player 2 → Dealer in local Two Players mode, or peer-to-peer multiplayer with host authority in Online P2P mode.
- **Mode-specific scoreboards** — Local, BOT, and Online table victories are tracked independently.
- **Responsive casino-style UI** — Neutral charcoal surfaces, ivory controls, animated cards, and responsive behavior.
- **Classic Dealer flow** — The Dealer keeps the second card hidden until its turn, hits below 17, and stands on 17+.
- **P2P Multiplayer with Information Hiding** — Host acts as authoritative table master over WebRTC DataChannels. The Dealer hole card and undealt cards never leak to the guest.
- **Clear game feedback** — Outcome badges and inline notifications communicate wins, pushes, losses, busts, and ready/rematch states without blocking the table.

---

## Showcase

[![Blackjack animated showcase preview](./showcase-assets/showcase-preview.gif)](https://raw.githubusercontent.com/LeoneMarcos/blackjack/main/showcase-assets/blackjack-showcase.mp4)

The animated preview shows a short excerpt of bot play, local two-player mode, and round feedback. Open the full video below for the complete flow.

[![Showcase Video](https://img.shields.io/badge/Showcase-Video-2f2f2f?style=flat-square&logo=github&logoColor=white)](https://raw.githubusercontent.com/LeoneMarcos/blackjack/main/showcase-assets/blackjack-showcase.mp4)

---

## Features

- Full 52-card deck with suits, face cards, and shuffled dealing.
- 21-point scoring with flexible Ace values of 1 or 11.
- Classic Dealer hole-card flow with the second Dealer card hidden until the Dealer turn.
- BOT mode for Player 1 vs Dealer.
- Sequential local Two Players mode: Player 1 → Player 2 → Dealer.
- **Online P2P mode**:
  - WebRTC RTCDataChannel peer-to-peer gameplay with zero gameplay relay over the server.
  - Short 4-character room codes for easy table sharing.
  - Cloudflare Worker + Durable Object signaling layer with max 2 peers per room.
  - Host authority: Host (Player 1) executes deck shuffling, card dealing, rule validation, dealer autoplay, and scoring.
  - Guest validation: Guest (Player 2) sends only versioned, typed intentions (`hit`, `stand`, `ready`, `rematch`).
  - Strict information hiding: Deck order, undealt cards, and the dealer's hidden hole card are never sent to the network before reveal.
  - Full rematch synchronization and connection lifecycle handling (creating, waiting, connecting, connected, disconnected, retry).
- Dealer autoplay that hits below 17 and stands on 17+.
- Binary per-player scoring against the Dealer, with independent scoreboards by mode.
- 30-second round timer with automatic round resolution.
- Temporary win, push, loss, and bust notifications.
- Game rules dialog with keyboard support through `Escape`.
- Keyboard controls: `1` for Player 1, `2` for Player 2, `H` to hit, `S` to stand, and `R` to reset scores.
- Responsive layout with a Blackjack favicon and Lucide interface icons.

---

## Architecture

The project is structured as a client-first application with an optional lightweight signaling worker for online multiplayer:

- **Presentation Layer (`src/App.tsx`)**: Controls visual hierarchy, mode switching (BOT, Local, Online), lobby UX, scoreboard presentation, keyboard shortcuts, rules dialog, and round feedback.
- **Domain Rules & Engine (`src/lib/game-logic.ts`, `src/lib/deck.ts`, `src/hooks/useBlackjackGame.ts`)**: Pure card dealing, dynamic Ace valuation (1 or 11), hand outcome comparison, and reducer-driven game loop.
- **Online P2P Subsystem (`src/lib/online/`, `src/hooks/useOnlineBlackjack.ts`)**:
  - `signaling.ts`: WebSocket client connecting to the signaling Worker to exchange WebRTC SDP and ICE candidates.
  - `peer.ts`: Native `RTCPeerConnection` and `RTCDataChannel` manager for encrypted, low-latency peer communication.
  - `authority.ts`: `HostAuthorityManager` running domain rules exclusively on the Host, gating deals behind mutual readiness, and verifying guest intentions.
  - `serializer.ts`: Projects canonical game state into `PublicGameState`, replacing hidden cards with `{ label: '?', value: 0, isHidden: true }` and stripping undealt cards and RNG data.
  - `types.ts`: Protocol definitions (`PROTOCOL_VERSION = 1`) and strict runtime validators.
- **Signaling Worker (`worker/`)**: Cloudflare Worker + Durable Objects (`RoomDO`) routing signaling messages. Validates room codes, enforces 2-peer room limits, validates create/join intent, enforces SDP/candidate message schemas and role directions, and immediately drops non-signaling frames.
- **Styling (`src/index.css`)**: Dark casino theme tokens, responsive layouts, card tilt and deal animations, and mobile safe-area adaptations.

---

## Tech Stack

| Area | Technologies |
| --- | --- |
| Frontend | React 19, TypeScript 5.9 |
| Tooling | Vite 7 |
| Styling | Tailwind CSS 4 |
| Icons | Lucide React |
| Networking | WebRTC (`RTCPeerConnection`, `RTCDataChannel`) |
| Signaling | Cloudflare Worker, Durable Objects, WebSockets |
| Local Worker Dev | Wrangler 4 |
| Testing | Vitest 4, Playwright 1.63 |
| Quality | ESLint 10, Prettier 3, TypeScript strict mode |
| CI | GitHub Actions |

---

## Quick Start

### Prerequisites

- Node.js 22 and npm (matching CI)

### 1. Clone the repository

```bash
git clone https://github.com/LeoneMarcos/blackjack.git
cd blackjack
```

### 2. Install dependencies

```bash
npm ci
```

### 3. Local Development (BOT & Local Two Players)

```bash
npm run dev
```

### 4. Local Development (Online P2P Mode with Worker Signaling)

Running Online P2P locally requires running both the signaling worker and the Vite frontend across two terminal windows on Windows (PowerShell):

**Terminal 1 — Start the Signaling Worker:**
```powershell
npm run worker:dev
```
*(Runs Wrangler dev at `ws://127.0.0.1:8787` without requiring Cloudflare credentials)*

**Terminal 2 — Start the Frontend:**
```powershell
# Copy environment configuration if not already present
Copy-Item .env.example .env.local
npm run dev
```

Open two browser tabs or windows to test host creation and guest joining with room codes.

---

## Online P2P Trust Boundary & Limitations

- **Trust Boundary**: The Host browser tab acts as the game server authority. Guest intentions (`hit`, `stand`, `ready`, `rematch`) are validated against game phase, turn, and schema. Malicious or malformed guest messages are rejected without affecting Host game state. Undealt deck order and the dealer's hole card remain strictly in Host memory and are never serialized onto the network before the Dealer's turn.
- **NAT / Connectivity**: Uses standard Google STUN servers (`stun.l.google.com:19302`). Most home and office networks connect directly. Strict symmetric NATs without TURN may fail to establish a direct P2P connection.
- **Production Deployment**: To deploy signaling to Cloudflare Workers manually:
  1. Authenticate with Cloudflare: `npx wrangler login`
  2. Deploy the Worker: `npx wrangler deploy -c worker/wrangler.jsonc`
  3. Set `VITE_SIGNALING_URL=wss://blackjack-signaling.<your-subdomain>.workers.dev` in your frontend deployment settings (e.g. Cloudflare Pages or Vercel).

---

## Testing

Verified commands to test, lint, format-check, and build the project:

```bash
npm test
npm run lint
npm run typecheck
npm run format:check
npm run build
npm run test:e2e
```

The automated suite covers BOT, sequential local Two Players, and Online P2P, including Dealer hole-card visibility, keyboard safeguards, host authority, signaling validation, and a two-context WebRTC flow. This feature branch passes 69 unit/integration tests and 6 Playwright specs. To record the approved showcase flow locally, run `npm run showcase:prepare`; it starts Vite when needed, keeps the raw WebM, and produces a GitHub-compatible H.264 MP4. The **Publish Showcase** workflow performs the same capture in GitHub Actions and regenerates the canonical MP4, screenshots, and short README GIF preview when relevant product/showcase inputs change; it can also be run manually.

---

## Documentation

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — System architecture and component roles.
- [`DESIGN.md`](DESIGN.md) — Visual styling tokens, UI behavior, and responsive contracts.
- [`PRODUCT.md`](PRODUCT.md) — Core game rules and product requirements.
- [`STACK.md`](STACK.md) — Technical stack constraints and tooling specifications.
- [`TEST_PLAN.md`](TEST_PLAN.md) — Test plan and validation strategy.
- [`docs/STATUS.md`](docs/STATUS.md) — Final release status and validation evidence.

---

## License

This project is licensed under the **Apache License 2.0**. See [`LICENSE`](LICENSE) for details.
