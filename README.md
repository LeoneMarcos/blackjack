<p align="center">
  <img src="./public/blackjack-neutral.webp" alt="Blackjack icon" width="160" />
</p>

<h1 align="center">Blackjack</h1>

<p align="center">
  A polished, browser-based 21 card game with local multiplayer and an optional automated opponent.
</p>

<p align="center">
  <a href="https://blackjack.leonemarcos.com/">
    <img src="https://img.shields.io/badge/Demo-Live-brightgreen?style=flat-square" alt="Live Demo" />
  </a>
  <a href="https://github.com/LeoneMarcos/blackjack/actions/workflows/ci.yml">
    <img src="https://github.com/LeoneMarcos/blackjack/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI" />
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/License-Apache%202.0-green?style=flat-square" alt="Apache 2.0 License" />
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-149eca?style=flat-square&logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178c6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript 5.9" />
  <img src="https://img.shields.io/badge/Vite-7-646cff?style=flat-square&logo=vite&logoColor=white" alt="Vite 7" />
  <img src="https://img.shields.io/badge/Vitest-3-6e9f18?style=flat-square&logo=vitest&logoColor=white" alt="Vitest 3" />
</p>

<p align="center">
  <a href="#overview">Overview</a> ·
  <a href="#showcase">Showcase</a> ·
  <a href="#features">Features</a> ·
  <a href="#tech-stack">Tech Stack</a> ·
  <a href="#quick-start">Quick Start</a>
</p>

---

## Overview

**Blackjack** is a lightweight 21 card game designed around a focused casino-style interface. Players can compete locally in a two-player mode or enable the BOT for an automated opponent, with the active game mode tracked through its own scoreboard.

The interface uses a continuous charcoal card table, ivory playing cards, restrained typography, Lucide icons, responsive layouts, and inline round feedback that keeps the game visible.

### Highlights

- **Two game modes** — Switch between local Player 1 vs Player 2 and Player 1 vs BOT matches.
- **Mode-specific scoreboards** — Local and BOT victories are tracked independently.
- **Responsive casino-style UI** — Neutral charcoal surfaces, ivory controls, animated cards, and responsive behavior.
- **Clear game feedback** — A subtle, temporary notification communicates wins, ties, and busts without blocking the table.

---

## Showcase

Watch the real browser flow in the showcase video:

https://github.com/user-attachments/assets/76db2df1-9f5c-43e2-996c-249609628757

---

## Features

- Full 52-card deck with suits, face cards, and shuffled dealing.
- 21-point scoring with flexible Ace values of 1 or 11.
- Local two-player mode with separate card controls.
- Optional BOT opponent with score-aware decision logic.
- Independent scoreboards for Player 2 and BOT matches.
- 30-second round timer with automatic round resolution.
- Temporary win, tie, and bust notifications.
- Game rules dialog with keyboard support through `Escape`.
- Keyboard controls: `1` for Player 1, `2` for Player 2 when the BOT is off, and `R` to reset scores.
- Responsive layout with a Blackjack favicon and Lucide interface icons.

## Tech Stack

| Area | Technologies |
| --- | --- |
| Frontend | React 19, TypeScript 5.9 |
| Tooling | Vite |
| Styling | Tailwind CSS 4 |
| Icons | Lucide React |
| Typography | Google Fonts: Inter and Space Grotesk |
| Testing | Vitest, Playwright |
| Quality | ESLint, Prettier, TypeScript strict mode |
| CI | GitHub Actions |
| Validation | Production build validation with Vite |

## Quick Start

### Prerequisites

- Node.js and npm

### 1. Clone the repository

```bash
git clone https://github.com/LeoneMarcos/blackjack.git
cd blackjack
```

### 2. Install dependencies

```bash
npm install
```

### 3. Run locally

```bash
npm run dev
```

The application will be available at the local URL printed by Vite.

## Testing

```bash
npm test -- --run
npm run lint
npm run typecheck
npm run format:check
npm run build
npm run test:e2e
```

The browser suite runs the critical BOT and local-player flows. To record the approved showcase flow, run `npm run showcase:prepare`; it starts Vite when needed, keeps the raw WebM, and produces a GitHub-compatible H.264 MP4. After reviewing the result, `npm run showcase:publish` uploads the attachment through GitHub CLI, verifies it, and updates the Showcase video link.

## License

This project is licensed under the **Apache License 2.0**. See [`LICENSE`](LICENSE) for details.
