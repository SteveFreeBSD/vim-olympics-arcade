# Vim Olympics Arcade & Tutor 🕹️📗

## Preview
![Screenshot of Vim Olympics Arcade](docs/screenshot.png)

An **interactive Vim learning app** with two personalities:
- **Tutor**: a clean, focused practice environment (playground, commands, quizzes).
- **Arcade**: a Defender‑style mini‑game controlled with Vim‑like keys.

Built with **React + Vite + TailwindCSS** for UI and **Phaser 3** for the arcade panel.

---

## 📦 What’s in the app

### 1) Motion Playground (src/components/Playground.jsx)
A text buffer you can move around with Vim motions. Great for habit‑building.
- Keys: `h j k l`, `0`, `$`, `w`, `b`, `e`, `ge`, `gg`, `G`, `x`, `u`
- Goals panel & sample buffers
- Copy‑to‑clipboard and reset helpers

### 2) Lessons & Command Cards (CommandCard / CommandModal / CommandPalette)
Self‑contained cards that teach a motion or command with examples.
- “Load in Playground” pipes example text into the Playground
- Palette lets you search by motion (e.g., type `dw`, `cw`, `gg`)
- Modal shows description, examples, and tips

### 3) Quiz (src/components/Quiz.jsx)
Small, focused checks to reinforce a concept.
- Multiple‑choice or “type the command” formats
- Pulls examples from the same lesson data

### 4) Arcade Panel (Phaser) (ArcadePanel + GameScene)
A small canvas embedded in the app for game‑feel practice.
- Vim‑shaped starship, dual‑gun firepoints
- Enemies spawn, drift, and collide; score + timer HUD
- Keys: `h/l` strafe, `j` thrust, `k` brake, `x` fire, `f<char>` lock (planned), `w/b` dash (planned)

### 5) Glue & Safety (ErrorBoundary / DebugBanner)
- ErrorBoundary keeps one bad component from crashing the page
- DebugBanner helps toggle dev/test flags

---

## 🗂️ Project structure (high‑level)

```
src/
  components/
    ArcadePanel.jsx        # Phaser mount + scene bootstrap
    CommandCard.jsx        # Lesson card UI
    CommandModal.jsx       # Lesson detail + “Load in Playground”
    CommandPalette.jsx     # Quick find by command
    Playground.jsx         # Text buffer + motions
    Quiz.jsx               # Lightweight quiz engine
    Header.jsx, Stars.jsx  # UI chrome
    CopyButton.jsx, Pill.jsx, Toggle.jsx  # small UI atoms
  App.jsx
  main.jsx
index.html
tailwind.config.cjs
postcss.config.cjs
vite.config.js
```

---

## 🛠️ Getting started

```bash
npm install
npm run dev
```

Build for production:
```bash
npm run build
```

If you prefer Docker or a different Node version, note that Vite is happiest on Node 18+.

---

## 🎮 Default controls

**Playground**
- `h j k l` move • `0` / `$` line start/end
- `w b e ge` word motions • `gg` / `G` buffer start/end
- `x` delete char • `u` undo

**Arcade**
- `h/l` strafe • `j` thrust • `k` brake
- `x` fire (dual guns)
- `f<char>` lock (planned) • `w/b` dash (planned)

Click the arcade panel once to focus its keys.

---

## 🎨 Styling & tech notes

- **TailwindCSS** for utility‑first styling (`index.css`, `tailwind.config.cjs`)
- **Phaser 3** for arcade physics & particles
- **Prettier + ESLint** recommended for formatting; run Prettier on save if possible

---

## 🤝 Contributing (or just organizing your own work)

1. Create a branch: `git switch -c feat/<short-name>`
2. Keep changes small; run `npm run build` before pushing
3. Open a PR with a short description and a checkbox list of what changed

Suggested labels: `feature`, `bug`, `docs`, `ui`, `gameplay`.

---

## 🧭 Roadmap (next slices)

- Insert mode toggle in Playground (`i` / `Esc`)
- More motions: text objects, `d/y/c` operators
- Lesson progress & badges (Stars)
- Arcade: lock‑on with `f<char>`, dash on `w/b`, SFX & music
- Export lessons as a printable cheat sheet

---

## 🆘 Troubleshooting

- **Keys don’t work in Arcade** → click the arcade panel to focus; ensure dev server isn’t trapping keys in another tab.
- **Build errors** → check the exact file:line Vite prints; run `npx prettier . --write` to fix formatting.
- **Push fails** → ensure SSH agent is loaded:
  ```bash
  eval "$(ssh-agent -s)" && ssh-add ~/.ssh/id_ed25519
  ```

---

## 📄 License

MIT © 2025 Steven Robinson
