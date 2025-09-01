Live Demo Script

Audience: CTO/CEO (5–7 minutes)

1) Overview (20s)
- One-liner: Interactive Vim learning app with an embedded arcade to make practice fun.
- Tech: React + Vite + Tailwind; Phaser for the arcade.

2) Search & Discover (45s)
- Hit `/`, search for “delete to )”. Show natural-language suggestions and fuzzy results.
- Open a card. Show Details and Examples.

3) Tutorial → Playground (60s)
- Click “Load in Playground”.
- Demonstrate motions: `w`, `b`, `gg`, `G`, `f<char>`, `*`.
- Show insert variants: `i`, `a/A/I/o/O`, `Enter` newline, `Esc`.
- Macro: `qa` ... `q`, then `@a` replay.

4) Quiz (45s)
- Run through 1–2 quick questions. Highlight immediate feedback.

5) Arcade (60s)
- Click canvas to focus. Show `h/j/k/l` movement, `x` fire.
- Lock-on: `f<char>`, then fire — bullets track target.
- Dash: double-tap `w`, tap `b`.
- SFX and mute toggle `m`.

6) Progress & Palette (40s)
- Mark a few lessons done; header counter updates.
- Palette (Ctrl+K): run “Mark Visible Done”.
- Milestone toast at 10 completes (if reached).

7) Wrap (30s)
- Reliability: tests (Vitest), CI (GitHub Actions), sanitized lesson imports.
- Extensible: add lessons, achievements, printable cheat sheet.

