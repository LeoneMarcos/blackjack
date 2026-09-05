# STACK.md

> Technical stack specification and implementation contract for Blackjack.

**Status:** Active
**Version:** 1.0
**Last updated:** 2026-09-04
**Project type:** Browser-based Web App / Static SPA

---

# 0. Stack Contract

This document is the single source of truth for Blackjack's technology choices, technical boundaries, dependencies, infrastructure, and implementation conventions.

## Rules

1. Read this document before implementing or modifying the project architecture.
2. Fill all relevant sections before major implementation begins.
3. Do not introduce a new framework, runtime, database, service, library category, or infrastructure dependency without documenting it here.
4. Prefer the existing stack before introducing additional technologies.
5. Avoid duplicate technologies that solve the same problem unless there is a documented reason.
6. Keep the stack as small as reasonably possible.
7. If implementation intentionally differs from this document, update the relevant section and record the decision in **Technical Decisions**.
8. After major implementation changes, perform a **Stack Conformance Audit**.
9. The source code, infrastructure, dependencies, and this document must not silently diverge.

---

# 1. Project Context

## Project

**Name:** Blackjack

**Type:** Browser-based static web application / single-page game

**Primary purpose:** Provide timed Blackjack rounds that can be played locally by two people or by one person against an automated BOT.

**Primary users:** People who want to play a quick Blackjack game directly in a browser.

## Technical Requirements

The system must support:

* A browser-rendered Blackjack game with a 52-card deck and Ace scoring.
* Local two-player mode and an automated opponent mode.
* Client-side round state, a 30-second timer, round outcomes, and independent scoreboards.
* Keyboard-accessible controls and responsive behavior.
* Repeatable local quality checks and production builds.

The system does not currently require authentication, persistent user data, payments, real-time networking, file uploads, server-side processing, or AI integration.

---

# 2. Technical Principles

Technical decisions should prioritize:

1. **Simplicity** — keep the game client-only while no server capability is required.
2. **Maintainability** — keep pure game rules separate from React state and presentation.
3. **Consistency** — use one language, package manager, styling approach, and icon library.
4. **Reliability** — use mature tooling and deterministic tests for the game rules.
5. **Security** — avoid secrets and privileged operations entirely in the static client.
6. **Performance** — keep the shipped application small and avoid unnecessary runtime work.
7. **Portability** — the built output should be deployable to a static web host.
8. **Cost efficiency** — do not add backend or infrastructure layers for local game state.
9. **Observability** — make failures diagnosable through CI and local checks.
10. **Minimal dependency surface** — every dependency must justify its existence.

## Project-specific principles

* The game must work without an account or network API.
* Domain rules belong in pure TypeScript functions that can be tested independently.
* UI state belongs in the React hook and must not require a global state library.

---

# 3. Stack Summary

| Layer          | Technology | Version | Purpose |
| -------------- | ---------- | ------- | ------- |
| Language       | TypeScript | `~5.9.3` declared; `5.9.3` installed | Typed application and game logic |
| Frontend       | React | `^19.2.0` declared; `19.2.8` installed | Browser UI |
| Styling        | Tailwind CSS plus project CSS | `^4.3.3` declared; `4.3.3` installed | Utility integration and design tokens/components |
| Backend        | None | N/A | Client-only application |
| Database       | None | N/A | No persistent game data |
| Authentication | None | N/A | No accounts or protected resources |
| Validation     | TypeScript compiler and game tests | TypeScript `5.9.3`, Vitest `3.2.7` installed | Compile-time and behavior validation |
| Testing        | Vitest; Playwright available for browser validation | Vitest `^3.2.4`, Playwright `^1.62.1` | Unit tests and runtime checks |
| Hosting        | Static web host; provider not declared in repository | N/A | Serve Vite build output |
| CI/CD          | GitHub Actions | Actions `checkout@v4`, `setup-node@v4` | Automated quality gates |
| Monitoring     | None declared | N/A | No runtime monitoring integration |

---

# 4. Runtime and Languages

## Primary Language

**Language:** TypeScript

**Version:** `~5.9.3` in `package.json`; lockfile resolves `5.9.3`.

**Role:** Frontend application, pure game logic, tests, and build configuration.

## Secondary Languages

| Language | Purpose | Allowed scope |
| -------- | ------- | ------------- |
| CSS | Runtime styling, design tokens, responsive rules, and animations | `src/index.css` and imported CSS |
| HTML | Vite document shell and metadata | `index.html` |

Do not introduce an additional programming language for application logic without technical justification.

## Runtime

**Runtime:** Browser at runtime; Node.js for development, build, lint, formatting, and tests.

**Version:** CI uses Node.js `22.x`. Vite and Playwright dependencies require a modern Node version; Node.js 22 is the supported project runtime for tooling.

**Version management:** GitHub Actions pins `22.x`; a local version file is not currently present.

---

# 5. Package Management

**Package manager:** npm

**Lockfile:** `package-lock.json`

## Rules

* Use npm throughout the repository.
* Commit `package-lock.json`.
* Do not manually edit the lockfile; use npm commands for dependency changes.
* Avoid global installations when a project-local dependency is sufficient.
* Remove unused dependencies after verifying they are not needed by scripts or showcase tooling.
* Do not introduce multiple libraries for the same responsibility without documenting the reason.

---

# 6. Frontend

**Frontend required:** Yes

## Framework

**Framework:** React

**Version:** `^19.2.0` declared; `19.2.8` installed in the lockfile.

**Rendering strategy:** Client-only SPA rendered into `#root` with `createRoot`.

## Build Tool

**Tool:** Vite

**Version:** `^7.2.4` declared; `7.3.6` installed in the lockfile.

## Routing

**Router:** None. The application has one game screen and no client-side routes.

## State Management

**Strategy:** Local React `useReducer` state inside `useBlackjackGame`; local `useState` for component-level UI state.

### Rules

* Use local state when possible.
* Do not introduce global state for the current single-screen game.
* Keep pure scoring, winner, deck, and BOT decision logic in `src/lib`.
* Do not duplicate game state into browser storage or a server without a product requirement.

## Server State / Data Fetching

**Technology:** None. The game has no server data; the only external browser request is the Google Fonts stylesheet declared in `index.html`.

## Forms

**Technology:** None. The current product has no form workflow.

## Validation

**Technology:** TypeScript strict compilation plus Vitest behavior tests. No schema-validation library is required.

---

# 7. Styling and UI

## Styling

**Primary technology:** Tailwind CSS integration with project-specific CSS component classes and semantic tokens.

**Version:** Tailwind CSS `^4.3.3` declared; `4.3.3` installed. `@tailwindcss/vite` is `^4.3.3` declared.

## Component System

**Strategy:** Local React components and CSS component classes. Current reusable UI components are `PlayingCard`, `PlayerPanel`, and `RulesModal`.

## Icons

**Library:** Lucide React `^0.562.0` declared; `0.562.0` installed.

## Rules

* Follow `DESIGN.md`.
* Do not introduce another styling system without documenting the reason.
* Do not mix multiple UI component ecosystems unnecessarily.
* Design tokens have one canonical implementation source in `src/index.css`.
* Keep game rules independent from styling and icon imports.

---

# 8. Backend

**Backend required:** No

**Backend strategy:** Client-only static application.

## Runtime

**Technology:** None at runtime. Node.js is used only by project tooling.

## Framework

**Framework:** None

## API Style

**Primary:** None

## API Contract

**Validation:** Not applicable; there is no API boundary.

**Serialization:** Not applicable; game state is in memory.

**Versioning strategy:** Not applicable.

## Rules

* Do not add a backend unless a concrete requirement such as accounts, persistence, multiplayer, or trusted server logic appears.
* If a backend is introduced, document the runtime, API contract, trust boundaries, deployment, secrets, and validation before implementation.

---

# 9. Database

**Persistent database required:** No

## Database

**Technology:** None

**Provider:** None

## ORM / Query Layer

**Technology:** None

## Schema Management

**Strategy:** Not applicable. Scores and rounds exist only in browser memory and reset with the application state.

## Rules

* Do not add a database for transient local game state.
* If persistence becomes a requirement, document schema ownership, migrations, constraints, indexes, and authorization before adding a provider.

---

# 10. Authentication and Authorization

**Authentication required:** No

## Authentication

**Provider:** None

**Methods:** None

## Authorization

**Strategy:** None. There are no accounts, private resources, or privileged actions.

## Rules

* Do not add authentication until the product has protected resources or user identity requirements.
* If authentication is introduced, keep authorization separate and enforce sensitive checks in a trusted environment.

---

# 11. Storage

**File storage required:** No

**Technology:** None

## Stored Content

* Static public assets only: `public/blackjack-icon.webp`, `public/robots.txt`, `public/sitemap.xml`, `public/llms.txt`, and `public/_headers`.
* Showcase media is repository documentation, not user storage.

## Rules

* Do not introduce upload or storage infrastructure for the current game.
* If uploads are added, validate type and size and document private/public access behavior.

---

# 12. External Services

| Service | Purpose | Required | Client / Server |
| ------- | ------- | -------- | --------------- |
| Google Fonts | Load Inter and Space Grotesk fonts referenced by the document shell | Optional for runtime presentation | Client |

No API, payment, analytics, map, email, database, or AI service is configured in the repository.

Every future external service must have a documented purpose, data flow, failure behavior, and owner before integration.

---

# 13. AI / LLM Integration

**AI required:** No

## Provider

**Provider:** None

## Model

**Model:** None

## Execution

**Location:** Not applicable

## Rules

* Do not add AI to the core Blackjack flow without a concrete product requirement.
* If AI is introduced, keep credentials server-side, validate structured output, define fallback behavior, and document data handling.

---

# 14. Hosting and Infrastructure

## Frontend Hosting

**Provider:** A static web host is required, but the provider is not declared in the repository. The documented production URL is `https://blackjack.leonemarcos.com/`.

## Backend Hosting

**Provider:** None

## Database Hosting

**Provider:** None

## DNS

**Provider:** Not declared in the repository. The production hostname is documented but its DNS provider is not verifiable from local project files.

## Environments

Supported environments:

* Local development through Vite.
* Production static build through `npm run build` and the externally configured host.

Preview/staging deployment is not declared in the repository.

Avoid adding a backend, container, or staging environment without a concrete deployment requirement.

---

# 15. Environment Variables

No environment variables are currently referenced by source code, configuration, CI, or documentation.

| Variable | Required | Scope | Secret | Purpose |
| -------- | -------- | ----- | ------ | ------- |
| None | No | N/A | N/A | The application has no environment-specific runtime configuration. |

## Rules

* If environment variables are introduced, document them here and add/update `.env.example`.
* Never commit production secrets.
* Clearly distinguish public client configuration from server-only secrets.
* Do not create an `.env` file for values that can remain static and non-sensitive.

---

# 16. Security

## Security Model

Important trust boundaries:

* Browser → static host: the browser receives public HTML, JavaScript, CSS, and assets.
* Browser → Google Fonts: the browser may request the configured font stylesheet from the external provider.
* Game state: all round state is local and is not treated as trusted server data.

There is no API, database, authentication, upload, webhook, or privileged server boundary.

## Required Controls

* Keep the repository free of secrets.
* Keep the production site on HTTPS when deployed.
* Keep dependencies and lockfile updated through npm.
* Use React rendering and TypeScript checks to reduce injection and type errors.
* Review third-party runtime requests before adding services.
* Do not add client-side secrets or claims of server-side authorization.

## Sensitive Data

**Sensitive data handled:** No

No user identity, credentials, personal data, payment data, or persistent game history is collected or stored.

---

# 17. Testing

## Unit Testing

**Technology:** Vitest `^3.2.4` declared; `3.2.7` installed.

**Required:** Yes

## Component Testing

**Technology:** None currently configured. Component behavior is validated through browser checks and TypeScript/lint checks.

**Required:** No, unless component interaction complexity grows.

## End-to-End Testing

**Technology:** Playwright `^1.62.1` declared; `1.62.1` installed and used by showcase/browser validation scripts.

**Required:** Yes for the critical browser flows. `npm run test:e2e` runs the versioned Chromium suite; the dedicated visual flow is available through `npm run test:e2e:visual-flow`. A CI E2E job remains deferred.

## Minimum Critical Coverage

Critical flows that must be tested:

* Blackjack hand scoring, including flexible Ace values.
* Bust and winner resolution, including ties.
* BOT decision behavior.
* Scoreboard independence and reset behavior.
* Browser smoke flow for drawing cards, changing mode, opening rules, keyboard controls, and responsive layout.

## Rules

Tests should prioritize game behavior and critical browser flows rather than arbitrary coverage percentages.

---

# 18. Code Quality

## Linting

**Technology:** ESLint 9 with `typescript-eslint`, React Hooks, and React Refresh plugins.

## Formatting

**Technology:** Prettier 3

## Type Checking

**Technology:** TypeScript compiler

**Strict mode:** Enabled through `tsconfig.json`.

## Rules

* CI must reject formatting, lint, type, test, and build failures.
* Do not suppress warnings without understanding their cause.
* Avoid widespread `any`, ignored type checks, or broad lint-disable directives.
* Keep formatting commands and checks aligned with `package.json` scripts.

---

# 19. CI/CD

**Provider:** GitHub Actions

## Required Checks

* [x] Install dependencies with `npm ci`
* [x] Formatting check
* [x] Lint
* [x] Type check
* [x] Unit tests
* [x] Production build
* [ ] Dedicated E2E tests in CI
* [ ] Deployment from this workflow

## Deployment Strategy

**Trigger:** CI validation on pushes and pull requests targeting `main`.

**Preview deployments:** Not declared.

The workflow at `.github/workflows/ci.yml` validates the repository but does not deploy it.

---

# 20. Observability

## Error Tracking

**Technology:** None

## Logging

**Strategy:** No application logging service; local/build failures are surfaced by the browser, Vite, and CI output.

## Analytics

**Technology:** None declared

## Rules

* Do not add analytics or error tracking without documenting privacy impact and purpose.
* Do not log secrets or user data.
* If production monitoring is added, define ownership, retention, and failure diagnosis workflow.

---

# 21. Performance

## Performance Priorities

* Fast initial load of the static SPA.
* Immediate card and control interaction.
* Small production JavaScript and CSS bundles.
* Efficient rendering of the current hand and timer.
* Avoid unnecessary external requests.

## Rules

* Avoid unnecessary client-side libraries and server infrastructure.
* Keep game logic pure and local.
* Optimize large media assets used only for showcase documentation separately from the runtime bundle.
* Avoid performance changes without a measured bottleneck.

---

# 22. Repository Structure

Actual structure:

```text
/
├── src/
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   ├── hooks/
│   │   └── useBlackjackGame.ts
│   └── lib/
│       ├── deck.ts
│       └── game-logic.ts
├── public/
├── tests/
│   └── game-logic.test.ts
├── showcase-assets/
├── .github/workflows/ci.yml
├── DESIGN.md
├── STACK.md
├── README.md
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
└── vite.config.ts
```

This structure is appropriate for the current small SPA and should evolve by responsibility or domain rather than by arbitrary directory depth.

## Rules

* Keep pure rules and deck construction in `src/lib`.
* Keep React game orchestration in `src/hooks`.
* Keep presentation in local React components and CSS tokens.
* Keep tests close to the behavior they validate without duplicating production logic.
* Showcase capture/edit files remain documentation tooling and must not become runtime dependencies.

---

# 23. Dependency Policy

Before adding a dependency, determine:

1. Is the functionality already provided by the existing stack?
2. Can it be implemented simply without another dependency?
3. Is the library actively maintained?
4. Does its size justify its functionality?
5. Does it introduce security or infrastructure risks?
6. Does another dependency already solve the same problem?
7. Will this dependency become foundational or remain isolated?

## Dependency Classification

### Core

Dependencies fundamental to the application architecture:

* `react`
* `react-dom`
* `lucide-react`

### Supporting

Libraries used for styling or build integration:

* `tailwindcss`
* `@tailwindcss/vite`
* `@vitejs/plugin-react`
* `vite`

### Development Only

* `typescript`
* `vitest`
* `playwright`
* `eslint`
* `@eslint/js`
* `typescript-eslint`
* `eslint-plugin-react-hooks`
* `eslint-plugin-react-refresh`
* `prettier`
* React and Node type packages

---

# 24. Forbidden Technologies and Patterns

Technologies or patterns that must not be introduced without explicit architectural review:

* A backend, database, or authentication provider without a concrete product requirement.
* Multiple state-management libraries.
* Multiple CSS frameworks or UI component ecosystems.
* Client-side secrets or privileged authorization logic.
* Persistent storage for transient game state without a user-facing requirement.
* GraphQL, Redis, Docker, microservices, or event-driven infrastructure without a demonstrated need.
* Duplicate test, validation, or formatting tools that solve the same responsibility.
* Business logic duplicated between `src/lib`, the React hook, and UI components.

---

# 25. Architectural Boundaries

## UI Layer

Responsible for:

* Rendering the game table, cards, controls, statuses, and dialog.
* Handling user interaction and presentation state.
* Exposing accessible labels, keyboard shortcuts, and responsive behavior.

Must not contain:

* Secrets or privileged authorization logic.
* Duplicated card scoring or winner rules.

## Application / Business Layer

Responsible for:

* Coordinating round state, timers, mode changes, scoreboards, and BOT timing in `useBlackjackGame`.
* Dispatching domain operations to the pure game logic.

## Data Layer

Responsible for:

* Pure in-memory deck construction and game calculations in `src/lib`.

There is no persistence or external data layer.

## Infrastructure Layer

Responsible for:

* Vite development/build configuration.
* GitHub Actions validation.
* Static hosting configuration outside this repository.

---

# 26. Technical Decisions

| Date       | Decision | Alternatives | Reason | Impact |
| ---------- | -------- | ------------ | ------ | ------ |
| 2026-09-03 | Keep the application client-only. | Add a Node.js API or database. | Current requirements are local rounds and in-memory scores; no trusted server capability is needed. | Minimal deployment and dependency surface. |
| 2026-09-03 | Use React local state with `useReducer`. | Redux, Zustand, or a global store. | State is scoped to one screen and has reducer-shaped transitions. | Keeps architecture small and testable. |
| 2026-09-03 | Use TypeScript pure functions for game rules. | Put calculations inside React components or use a game library. | Scoring and winner behavior are deterministic and independently testable. | `src/lib/game-logic.ts` and unit tests remain framework-independent. |
| 2026-09-03 | Use Vite for the SPA build. | Next.js or another full-stack framework. | The product has one client-rendered screen and no SSR/API requirement. | Fast local development and static output. |
| 2026-09-03 | Use npm with the committed lockfile. | pnpm or yarn. | The repository already has npm scripts, CI cache, and `package-lock.json`. | One reproducible dependency workflow. |
| 2026-09-03 | Keep Playwright as a development/browser-validation dependency. | Add a full E2E framework and CI suite immediately. | Browser validation and showcase capture are useful, but current critical domain coverage is supplied by Vitest. | Enables runtime checks without adding CI complexity prematurely. |
| 2026-09-05 | Add `@playwright/test` and a focused browser suite plus a dedicated visual-flow capture command. | Keep only ad hoc browser scripts. | The refreshed UI needs repeatable BOT/local interaction coverage and a reproducible README showcase artifact. | `test:e2e` and `showcase:prepare` are now first-class local commands; CI integration remains a later decision. |

---

# 27. Technology Change Protocol

A stack change is considered significant when it introduces or replaces:

* Framework
* Runtime
* Database
* Authentication provider
* Hosting provider
* State management
* Styling system
* API architecture
* ORM
* Major infrastructure service

Before making a significant change:

1. Identify the problem.
2. Determine whether the current stack can solve it.
3. Document the proposed technology.
4. Explain the measurable benefit.
5. Identify migration cost.
6. Identify additional operational complexity.
7. Identify security implications.
8. Compare alternatives.
9. Record the final decision in **Technical Decisions**.
10. Update this document before or alongside implementation.

Do not change foundational technology solely because another option is newer or more fashionable.

---

# 28. Stack Conformance Audit

Audit performed on 2026-09-04 against the repository, package manifests, source, CI configuration, and available browser validation.

## Runtime

* [x] Primary runtime matches the specification.
* [x] Language versions are documented.
* [x] Package manager matches the specification.
* [x] Only one lockfile exists.

## Dependencies

* [x] Core dependencies are documented.
* [x] No unnecessary duplicate libraries were found.
* [x] No unused major dependency was identified in this audit.
* [x] Dependencies have documented responsibilities.
* [x] No abandoned critical dependency was identified from repository inspection.

## Frontend

* [x] Framework matches the specification.
* [x] Styling follows the declared system and `DESIGN.md`.
* [x] State management matches the documented local strategy.
* [x] Validation matches the documented compiler/test strategy.
* [x] UI implementation follows `DESIGN.md`.

## Backend

* [x] No backend exists because it is not required.
* [x] No undocumented API architecture exists.
* [x] No sensitive operation is incorrectly placed in a server layer.

## Data

* [x] No database exists because persistence is not required.
* [x] No schema migration is needed.
* [x] No privileged database credential is exposed.

## Security

* [x] No secrets are committed or referenced.
* [x] No environment variables are required by the current source.
* [x] No API trust boundary exists; game logic remains local.
* [x] No authorization claim is made by the client.

## Testing

* [x] Critical game rules are covered by Vitest.
* [x] Test framework matches the specification.
* [x] Unit tests pass: 19 tests passed.
* [x] Type check and production build pass.
* [x] Browser smoke validation passed for draw, rules dialog, keyboard Escape, mobile overflow, and crawler-file responses.

## Infrastructure

* [ ] Hosting provider is explicitly documented.
* [x] CI validation flow matches the specification.
* [x] CI checks include format, lint, typecheck, test, and build.
* [x] No environment variables require deployment documentation.

## Architecture

* [x] No undocumented foundational technology exists.
* [x] No unnecessary infrastructure layer exists.
* [x] No duplicated technical solution exists without justification.
* [x] Architectural boundaries remain understandable.
* [x] `STACK.md` represents the actual repository.

---

# 29. Audit Result

**Audit date:** 2026-09-04

**Overall status:** PASS WITH WARNINGS

## Deviations

| Area | Specification | Implementation | Severity | Action |
| ---- | ------------- | -------------- | -------- | ------ |
| Hosting | A production static host should be declared. | The repository documents `https://blackjack.leonemarcos.com/`, but not the hosting provider or deployment configuration. | Low | Document the provider and deployment trigger when that information is available. |
| End-to-end CI | Critical browser flows should be repeatable. | Playwright suite and npm E2E commands exist; CI does not yet install browsers or run the suite. | Low | Add a focused CI job if browser regression risk justifies the maintenance cost. |
| Monitoring | Production errors should be diagnosable. | No monitoring or error-tracking service is declared for this static game. | Low | Reassess if the product gains meaningful production traffic or persistent user workflows. |

## Unnecessary Complexity

* No unnecessary backend, database, authentication, or infrastructure layer was found.
* No duplicate state, styling, validation, or test ecosystem was found.

## Missing Documentation

* Static hosting provider and deployment configuration are not present in the repository.
* Browser smoke validation is not yet a first-class CI gate.

## Technical Debt

* The project does not pin a local Node.js version file; CI provides the authoritative tooling version.
* Browser smoke validation is not yet a first-class CI gate.

## Conclusion

The repository conforms to its declared client-only React/Vite stack. Build, lint, formatting, type checking, unit tests, and browser smoke validation passed. The remaining low-severity warnings concern external hosting ownership, optional browser regression automation, and production monitoring that are not required for the current local game architecture.

---

# AI Workflow

## Phase 1 — Stack Definition

Before implementing the project:

1. Inspect the product requirements.
2. Determine which technical capabilities are actually required.
3. Complete all relevant sections of `STACK.md`.
4. Prefer the smallest stack capable of satisfying the requirements.
5. Identify unnecessary infrastructure.
6. Explain significant technology choices.
7. Only then begin implementation.

---

## Phase 2 — Stack Review

A separate AI agent may review the specification using:

> Review this `STACK.md` as a technical architecture specification. Identify unnecessary technologies, missing infrastructure decisions, duplicated responsibilities, incompatible choices, security risks, deployment gaps, undocumented dependencies, unnecessary backend layers, unnecessary vendor complexity, and areas where an implementation agent would still need to guess. Prefer simplification when functionality can be preserved.

---

## Phase 3 — Implementation

During implementation:

1. Read `STACK.md`.
2. Treat it as the technical contract.
3. Use the documented technologies and versions.
4. Reuse existing dependencies before adding new ones.
5. Avoid undocumented architectural changes.
6. Record significant decisions.
7. Keep `STACK.md` synchronized with implementation.

---

## Phase 4 — Implementation Audit

After implementation:

> Audit the repository against `STACK.md`. Inspect dependencies, configuration, source code, infrastructure, environment variables, CI/CD, hosting assumptions, database integration, authentication, testing, and architecture. Identify concrete divergences between specification and implementation. Classify each deviation as low, medium, or high severity. Remove unjustified complexity where safe. Do not introduce new technologies merely to satisfy personal preference. If the implementation reveals that `STACK.md` is incomplete, report the missing specification explicitly.

---

# Definition of Done

The technical architecture is considered complete when:

* `STACK.md` accurately represents the actual project.
* Every major technology has a documented purpose.
* No foundational technology exists only because an agent introduced it opportunistically.
* The stack contains no unnecessary duplicate solutions.
* Infrastructure complexity is justified by product requirements.
* Sensitive credentials remain outside the repository.
* Critical trust boundaries are documented.
* Build, lint, type checking, and required tests pass.
* Hosting and deployment strategy are documented, or missing external ownership is explicitly recorded.
* A new AI agent can understand the project's technical architecture without reverse-engineering the entire repository.
* A conformance audit reports no unexplained high-severity divergence.
