# Release status

Finalized 2026-09-12 from the implementation merged through PR #11 and the canonical showcase refresh that followed it.

| Area | Result | Evidence |
| --- | --- | --- |
| Product rules | Verified | Classic Dealer hole card; Dealer hits below 17 and stands on 17+; sequential Player 1 → Player 2 → Dealer flow |
| Scoring | Verified | Binary per-player outcomes against Dealer; Dealer scores in Two Players mode only when defeating both players; mode scoreboards isolated |
| Edge cases | Verified | Natural Blackjack turn completion, soft-Ace Dealer progression, early Dealer status, focused-control keyboard behavior |
| Unit/component tests | Passed | 47 tests |
| Browser flows | Passed | 5 Playwright specs |
| CI | Passed | GitHub Actions CI run #51 on the final PR head |
| Showcase | Refreshed | Canonical H.264 MP4, raw WebM, GIF and screenshots regenerated from the final sequential flow |
| README/docs | Synchronized | Product, architecture, design, validation and release status aligned with the merged implementation |

## Final implementation state

PR #11 merged the canonical game behavior into `main` on 2026-09-11. PR #14 supplied the final state-aware showcase capture and refreshed media before that merge. A subsequent GitHub Actions commit refreshed the canonical showcase assets on `main`.

The implementation is considered complete. Future work should be treated as a new product change rather than an unfinished item from this release.
