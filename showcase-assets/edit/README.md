# Blackjack showcase edit notes

Source: `../raw/blackjack-showcase-raw.webm`

The approved capture script is `../capture-script.md`. The raw recording uses a 1440x900 viewport, 25 fps, VP8 video, and no audio.

| Take name | Source interval | Local duration | Content |
| --- | --- | --- | --- |
| `take-01-bot-rules.mp4` | 00:03.00–00:05.00 | 00:02.00 | Only the Game rules modal interval requested by the user. |
| `take-02-bot-response.mp4` | 00:08.50–00:15.50 | 00:07.00 | BOT gameplay take with its first 2 seconds removed, preserving the start of second 2. |
| `take-03-local-mode.mp4` | 00:16.50–00:25.44 | 00:09.00 | Local Player 1 vs Player 2 take with the first second removed and one second removed from the end. |

## Edit decision list

| Source interval | Decision | Reason |
| --- | --- | --- |
| 00:03.00–00:05.00 | Keep | User-requested Game rules interval. |
| 00:08.50–00:15.50 | Keep | User-requested BOT take after removing its first 2 seconds. |
| 00:16.50–00:25.44 | Keep | User-requested local-mode take after removing one second from the beginning and one second from the end. |
| Take 1 → Take 2 | Crossfade 250 ms | Add a restrained fade transition between the rules segment and BOT gameplay. |
| Take 2 → Take 3 | Crossfade 250 ms | Add a restrained fade transition to make the mode change more fluid without hiding the gameplay result. |
| — | Transcode and concatenate | Join the three approved cuts into one H.264 MP4 while preserving 1440x900 framing and 25 fps. |
