# Release review

Reviewed 2026-09-09. Source: the code and media in the release commit containing this record; checks ran against that working tree before commit.

| Area | Result | Evidence |
| --- | --- | --- |
| Game logic | Verified | 19 unit tests; build, lint and typecheck passed |
| Browser flows | Verified | Existing 3-test Playwright suite passed; independent production-preview checks at 1440px and 390px covered keyboard dealing, rules Escape/focus recovery, overflow and page errors |
| Showcase | Verified | Real 18.4s H.264 recording, 1440×900; playback advanced without media errors; desktop/mobile captures and sampled video frames visually reviewed |
| README | Reviewed | Architecture paths and local media links checked against the release files |

The [current CI checks](https://github.com/LeoneMarcos/blackjack/actions) track automated validation. Hosting status belongs to the Cloudflare check on the deployed commit; this record describes local release validation.

If game UI or flows change, review the affected documentation and recapture the showcase during the next release. Source changes after this review require reassessing dependent evidence.
