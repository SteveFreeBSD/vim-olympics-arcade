# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

- TBD

## [1.1.0] - 2025-09-04

### Added

- Emacs boss encounter in the Arcade (wave 5), with fan‑pattern bullets and tuned difficulty.
- Lock‑on targeting with `f<char>` and dash with `w/b`.
- Synthesised audio SFX (WebAudio) with mute toggle `m` and debug overlay in dev.
- Wave progression rules: wave 1→4 require 3/4/5/6 letter kills respectively.
- High scores with initials entry and scoreboard overlay.
- ESLint (flat) config and `npm run lint` / `npm run format` scripts.
- Node engine and `.nvmrc` (LTS 20) for consistent builds.

### Fixed

- Enemy bullet pooling: re‑enable physics bodies on reuse so bullets fly and collide.
- Several minor UI and JSX polish items; escaped quotes in Playground text.

### Changed

- Boss balance: reduced fire rate and bullet speed; smaller fan to ease first encounter.
- CI now runs lint and Prettier check in addition to tests and build.
- Wave logic: boss now only appears on wave 5; wave 6+ are letters‑only with higher aggression.

## [1.0.0] - 2025-08-31

- Initial public release.

[1.1.0]: https://github.com/SteveFreeBSD/vim-olympics-arcade/compare/v1.0.0...v1.1.0
