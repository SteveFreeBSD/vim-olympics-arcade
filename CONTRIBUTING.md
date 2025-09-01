Contributing Guide

Thanks for your interest in improving Vim Olympics — Arcade! This guide helps you get set up and contribute effectively.

Getting Started
- Prereqs: Node 18+ and npm 9+
- Install: `npm install`
- Dev server: `npm run dev`
- Build: `npm run build`
- Tests: `npm test` (watch: `npm run test:watch`)

Project Style
- UI: React + TailwindCSS; avoid adding other CSS frameworks.
- Code style: Prettier + ESLint (use defaults in repo).
- Naming: clear, descriptive component and file names.
- Keep PRs focused: one feature/fix per PR.

Testing
- Framework: Vitest + Testing Library (JSDOM).
- Add tests for new UI behavior (buttons, dialogs, progress).
- For components, test behavior and accessibility (keyboard, focus, ARIA).

Accessibility
- Ensure keyboard access (Tab/Shift+Tab) and proper ARIA roles.
- Modals should trap focus and close with Escape.

Security
- Treat imported JSON as untrusted. We validate lesson imports (`sanitizeLesson`).
- Avoid `dangerouslySetInnerHTML`. React’s default escaping is preferred.

Submitting Changes
1) Create a branch: `git switch -c feat/<name>` or `fix/<name>`
2) Run build and tests locally: `npm run build && npm test`
3) Open a PR with a clear title, summary, and checklist

Scope Ideas
- More motions and tutorials; real‑world practice buffers
- Achievement milestones; export / printable cheat sheet
- A11y audits; performance profiling and memoization

Thanks for contributing!
