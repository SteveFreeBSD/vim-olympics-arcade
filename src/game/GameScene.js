import Phaser from 'phaser'
import { thresholdForWave, isBossWave } from './waves'
import {
  PLAYER_BOUNCE,
  PLAYER_BULLET_SIZE,
  ENEMY_BULLET_SIZE,
  DT_CLAMP,
  BOSS,
} from './constants'
import { createPlayerHpHUD, createBossHpHUD, destroyBossHpHUD } from './hud'
import { prewarmBulletPools } from './spawners'
import { setupBaseCollisions, setupBossColliders } from './collisions'
import { setupAudio, bindSfx } from './audio'
import { createBaseHUD, updateAnchors, setupPauseOnBlur } from './ui'

// GameScene — Phaser 3 scene for the Arcade panel.
//
// Highlights:
// - Lightweight rendering (640x360) with HiDPI resolution for crisp sprites
// - Letters-only enemies with progressive aggression and a boss on wave 5
// - Reliable collisions via pooled bullets (re-enabled bodies) and overlap safety
// - Reduced motion support and pause-on-blur

// Optional high-res ship asset discovered at build time via Vite
let SHIP256_URL
try {
  const matches = import.meta.glob('../assets/ship-vim@256.png', {
    eager: true,
    query: '?url',
    import: 'default',
  })
  SHIP256_URL = Object.values(matches)[0]
} catch {}
// Wave thresholds and boss gating are defined in waves.js; gameplay tunables in ./constants
// Emacs boss texture (purple)
let EMACS_URL
try {
  const boss = import.meta.glob('../assets/emacs-boss@256.png', {
    eager: true,
    query: '?url',
    import: 'default',
  })
  EMACS_URL = Object.values(boss)[0]
} catch {}

export default class GameScene extends Phaser.Scene {
  init() {
    this.awaitChar = false
    this.target = null
    this._vxImpulse = 0
    this._vyImpulse = 0
    this.score = 0
    this.gameOver = false
    this.timeLeft = 60
    this.maxSpeed = 140
    this.lastAngle = 0
    this.lastShot = 0
    this.fireCd = 200
    this.thrust = { f: false, b: false, l: false, r: false }
    // dash timing (double-tap window for 'w')
    this._lastW = 0
    this._dashGap = 250
    // audio
    this.muted = false
    this._ctx = null
    this.masterGain = null
    this.noiseBuffer = null
    this.audioUnlockedAt = 0
    this.lastSfx = { fire: 0, hit: 0, dash: 0, lock: 0 }
    // scores
    this.highScores = [] // [{name, score, ts}]
    this.highScore = 0
    this.enteringHS = false
    this.hsInitials = ''
    this.minHighScore = 100 // require at least this to enter high scores
    // player hp and waves
    this.hpMax = 10
    this.hp = 10
    this.invulnUntil = 0
    this.wave = 1
    this.waveLen = 25000
    this.waveElapsed = 0
    this.waveGrace = 3000 // ms of grace at wave start (no spawns/shots)
    this.waveGraceUntil = 0
    this.lastEnemyShot = 0
    this.lettersDestroyed = 0
    this.reducedMotion = false
    this.spawnBurst = 1
    this.shootAggro = 0
  }

  preload() {
    // Ensure hi-res ship is ready for a crisp look
    if (SHIP256_URL) this.load.image('ship256', SHIP256_URL)
  }

  // Vector-drawn fallback ship texture
  createShipTexture() {
    const w = 96,
      h = 64
    const g = this.make.graphics({ x: 0, y: 0, add: false })
    const pts = [
      { x: 6, y: 8 },
      { x: 30, y: 8 },
      { x: 44, y: 36 },
      { x: 60, y: 8 },
      { x: 90, y: 8 },
      { x: 64, y: 58 },
      { x: 36, y: 58 },
    ]
    g.lineStyle(8, 0x0b2a2a, 1)
    g.strokePoints(pts, true)
    g.fillStyle(0x22c55e, 1)
    g.fillPoints(pts, true)
    g.fillStyle(0x7dd3fc, 1)
    g.fillRoundedRect(28, 16, 20, 14, 4)
    g.fillRoundedRect(54, 16, 20, 14, 4)
    g.fillStyle(0x16a34a, 1)
    g.fillRect(18, 28, 18, 6)
    g.fillRect(64, 36, 16, 6)
    g.fillStyle(0x22c55e, 0.12)
    g.fillCircle(48, 32, 30)
    g.generateTexture('ship', w, h)
    g.destroy()
  }

  create() {
    try {
      this.reducedMotion =
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
    } catch {}
    // Ensure physics is running in case we came from a paused state
    try {
      this.physics.world.resume()
    } catch {}
    // 1px dot texture used for particles/bullets
    const g = this.add.graphics()
    g.fillStyle(0xffffff, 1).fillCircle(2, 2, 2)
    g.generateTexture('dot', 4, 4)
    g.destroy()
    // Safe 2x2 pixel texture fallback for bullets
    if (!this.textures.exists('px')) {
      const pg = this.make.graphics({ x: 0, y: 0, add: false })
      pg.fillStyle(0xffffff, 1).fillRect(0, 0, 2, 2)
      pg.generateTexture('px', 2, 2)
      pg.destroy()
    }
    // Boss scale will be computed at spawn time when the texture is available
    this.bossScale = 0.4

    // Starfield
    const starQty = this.reducedMotion ? 0 : 2
    if (starQty) {
      this.add
        .particles(0, 0, 'dot', {
          x: { min: 0, max: 640 },
          y: 0,
          lifespan: 4000,
          speedY: 35,
          scale: { start: 0.3, end: 0 },
          quantity: starQty,
          blendMode: 'ADD',
        })
        .setDepth(0)
    }

    // Ensure a vector fallback exists
    if (!this.textures.exists('ship')) this.createShipTexture()

    // Player: prefer hi-res ship when available
    const W = this.scale.width,
      H = this.scale.height
    const shipKey = this.textures.exists('ship256') ? 'ship256' : 'ship'
    this.player = this.physics.add
      .image(W * 0.25, H * 0.5, shipKey)
      .setDepth(3)
      .setOrigin(0.5)
      .setCollideWorldBounds(false)
      .setBounce(PLAYER_BOUNCE)
    // Downscale for panel size; keep aspect
    this.player.displayWidth = 56
    this.player.scaleY = this.player.scaleX
    this.player.body?.setSize?.(40, 28)

    // External ship override removed for clarity; rely on bundled asset + vector fallback

    // Hi-res already preloaded above; no runtime swap needed

    // Groups
    this.enemies = this.physics.add.group({ maxSize: 64 })
    this.bullets = this.physics.add.group({ maxSize: 24 })
    this.eBullets = this.physics.add.group({ maxSize: 64 })
    setupBaseCollisions(this)
    // Pre-warm bullet pools
    prewarmBulletPools(this)
    // Pre-warm bullet pools to avoid first-use hitches
    try {
      for (let i = 0; i < 24; i++) {
        const b = this.bullets.get(-100, -100, 'dot')
        if (!b) break
        if (!b.body) this.physics.world.enable(b)
        b.setActive(false).setVisible(false)
        b.body.enable = false
      }
      for (let i = 0; i < 32; i++) {
        const eb = this.eBullets.get(-100, -100, 'dot')
        if (!eb) break
        if (!eb.body) this.physics.world.enable(eb)
        eb.setActive(false).setVisible(false)
        eb.body.enable = false
      }
    } catch {}

    // HUD
    createBaseHUD(this)
    createPlayerHpHUD(this)
    // Settings
    try {
      this.muted = localStorage.getItem('prefs.arcadeMuted') === '1'
    } catch {}
    this.audioDebug = !!(
      import.meta?.env &&
      import.meta.env.DEV &&
      (/\bdebug=audio\b/.test(window.location.search || '') ||
        localStorage.getItem('dev.audioDebug') === '1')
    )
    // Optional audio debug HUD
    if (this.audioDebug) {
      this.ui.audio = this.add
        .text(this.scale.width - 6, this.scale.height - 6, 'audio: init', {
          fontSize: '10px',
          color: '#67e8f9',
        })
        .setOrigin(1, 1)
        .setDepth(10)
      this.ui.audioBtn = this.add
        .text(this.scale.width - 6, this.scale.height - 22, 'Enable Audio', {
          fontSize: '10px',
          color: '#0b1220',
          backgroundColor: '#67e8f9',
          padding: { x: 6, y: 3 },
        })
        .setOrigin(1, 1)
        .setDepth(10)
        .setInteractive({ useHandCursor: true })
    }

    // FX
    const fxScale = this.reducedMotion ? 0.6 : 1
    this.hitFx = this.add.particles(0, 0, 'dot', {
      on: false,
      lifespan: 220,
      speed: { min: 120 * fxScale, max: 260 * fxScale },
      angle: { min: 0, max: 360 },
      scale: { start: 0.45 * fxScale, end: 0 },
      gravityY: 0,
      quantity: this.reducedMotion ? 10 : 20,
      blendMode: 'ADD',
    })
    this.muzzleFx = this.add.particles(0, 0, 'dot', {
      on: false,
      lifespan: 160,
      speed: { min: 60 * fxScale, max: 140 * fxScale },
      scale: { start: 0.35 * fxScale, end: 0 },
      blendMode: 'ADD',
      quantity: this.reducedMotion ? 6 : 10,
    })
    this.exhaustFx = this.add.particles(0, 0, 'dot', {
      on: false,
      lifespan: 260,
      speed: { min: 25 * fxScale, max: 70 * fxScale },
      scale: { start: 0.5 * fxScale, end: 0 },
      blendMode: 'ADD',
    })
    // (Timer UI removed; waves are kill-based — keep internal counters only)
    this.glow = this.add.particles(this.player.x, this.player.y, 'dot', {
      lifespan: 250,
      speed: { min: 10, max: 25 },
      quantity: 2,
      scale: { start: 0.8, end: 0 },
      blendMode: 'ADD',
    })

    // Audio setup (synthesised SFX; no external assets) + bind SFX
    setupAudio(this)
    bindSfx(this)

    // Load high scores, init UI, and begin Wave 1
    this.loadHighScores()
    this.updateHpUI()
    this.beginWave(1)

    // Spawners and AI
    const MARGIN = 32
    // W,H already defined above
    const letters = ['h', 'j', 'k', 'l', 'w', 'e', 'b', 'f']
    const spawnEnemy = (etype = 'chaser') => {
      const x = Phaser.Math.Between(MARGIN, W - MARGIN)
      const y = Phaser.Math.Between(MARGIN, H - MARGIN)
      const ch = Phaser.Utils.Array.GetRandom(letters)
      const e = this.physics.add.image(x, y, 'alien-' + ch).setData('label', ch)
      e.setBounce(1, 1).setCollideWorldBounds(true)
      e.setVelocity(
        Phaser.Math.Between(-100, 100),
        Phaser.Math.Between(-100, 100),
      )
      e.setDepth(1)
      this.enemies.add(e)
      e.setData('type', etype)
      e.setData('hp', etype === 'boss' ? 40 : etype === 'strafer' ? 2 : 1)
      if (etype === 'boss') {
        e.setScale(1.3)
        e.body?.setCircle?.(Math.max(20, e.width * 0.45))
      }
    }
    // Build letter-only textures once
    letters.forEach(ch => {
      const key = 'alien-' + ch
      if (this.textures.exists(key)) return
      const tmp = this.make.text({
        x: 0,
        y: 0,
        text: ch.toUpperCase(),
        style: {
          fontFamily: 'monospace',
          fontSize: '32px',
          fontStyle: '900',
          color: '#ef4444',
          stroke: '#7f1d1d',
          strokeThickness: 6,
          shadow: {
            offsetX: 0,
            offsetY: 2,
            color: '#991b1b',
            blur: 8,
            fill: true,
            stroke: true,
          },
        },
        add: false,
      })
      const pad = 8
      const w = Math.ceil(tmp.width + pad * 2)
      const h = Math.ceil(tmp.height + pad * 2)
      const rt = this.make.renderTexture({ width: w, height: h, add: false })
      rt.draw(tmp, pad, pad)
      tmp.destroy()
      const g = this.make.graphics({ x: 0, y: 0, add: false })
      g.fillStyle(0xef4444, 0.12)
      g.fillEllipse(w / 2, h / 2, Math.min(w, h) * 0.9, Math.min(w, h) * 0.9)
      rt.draw(g)
      g.destroy()
      rt.saveTexture(key)
      rt.destroy()
    })
    // Start gently; ramp as waves progress
    this.desiredCount = 2
    this.spawningPaused = false
    this.spawnEvt = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (this.gameOver) return
        const now = this.time.now || performance.now()
        if (now < this.waveGraceUntil) return
        if (this.spawningPaused) return
        const active = this.enemies.countActive(true)
        if (active < this.desiredCount) {
          const toSpawn = Math.min(
            this.desiredCount - active,
            Math.max(1, this.spawnBurst || 1),
          )
          for (let i = 0; i < toSpawn; i++)
            spawnEnemy(Math.random() < 0.35 ? 'strafer' : 'chaser')
        }
      },
    })
    this.timerEvt = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (this.gameOver) return
        this.timeLeft--
        if (this.timeLeft < 0) this.timeLeft = 0
        this.waveElapsed += 1000
      },
    })
    this.rampEvt = this.time.addEvent({
      delay: 15000,
      loop: true,
      callback: () => {
        if (this.gameOver) return
        this.maxSpeed += 15
      },
    })
    // Kill-based progression replaces the old time-based waveEvt
    this.shootEvt = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (this.gameOver) return
        const now = this.time.now || performance.now()
        if (now < this.waveGraceUntil) return
        const list = this.enemies.getChildren().filter(e => e && e.active)
        for (const e of list) {
          if (e.getData('type') === 'boss') {
            this.enemyFire(e)
            continue
          }
          const base = e.getData('type') === 'strafer' ? 0.05 : 0.03
          let p =
            base + Math.max(0, this.wave - 1) * 0.05 + (this.shootAggro || 0)
          const cap = this.wave >= 6 ? 0.65 : 0.45
          p = Math.min(p, cap)
          // In wave 1, enforce a global cooldown so you aren't spammed
          if (this.wave === 1 && now < (this.lastEnemyShot || 0) + 1200)
            continue
          if (Math.random() < p) {
            this.enemyFire(e)
            this.lastEnemyShot = now
          }
        }
      },
    })
    this.seekEvt = this.time.addEvent({
      delay: 300,
      loop: true,
      callback: () => {
        const list = this.enemies.getChildren().filter(e => e && e.active)
        for (let i = 0; i < list.length; i++) {
          for (let j = i + 1; j < list.length; j++) {
            const a = list[i],
              b = list[j]
            const dx = b.x - a.x,
              dy = b.y - a.y
            const d = Math.hypot(dx, dy) || 1
            if (d < 28) {
              const nx = dx / d,
                ny = dy / d,
                k = 28 - d
              const imp = 12 + k * 0.5
              a.setVelocity(
                a.body.velocity.x - nx * imp,
                a.body.velocity.y - ny * imp,
              )
              b.setVelocity(
                b.body.velocity.x + nx * imp,
                b.body.velocity.y + ny * imp,
              )
            }
          }
        }
        for (const e of list) {
          const dx = this.player.x - e.x,
            dy = this.player.y - e.y
          const d = Math.hypot(dx, dy) || 1
          const nx = dx / d,
            ny = dy / d
          let vx = e.body.velocity.x + nx * 40,
            vy = e.body.velocity.y + ny * 40
          const s = Math.hypot(vx, vy)
          if (s > this.maxSpeed) {
            const r = this.maxSpeed / s
            vx *= r
            vy *= r
          }
          e.setVelocity(vx, vy)
        }
      },
    })

    // Input
    this.input.keyboard.enabled = true
    this.input.keyboard.addCapture([
      'H',
      'J',
      'K',
      'L',
      'W',
      'A',
      'S',
      'D',
      'X',
      'F',
      'SPACE',
      '[',
      ']',
    ])
    this._onKeyDown = e => {
      const code = e.code || ''
      let k = (e.key || '').toLowerCase()
      if (code === 'ArrowLeft') k = 'h'
      else if (code === 'ArrowRight') k = 'l'
      else if (code === 'ArrowUp') k = 'k'
      else if (code === 'ArrowDown') k = 'j'
      if (k === '?') {
        this.helpOpen = !this.helpOpen
        this.ui.help.setVisible(this.helpOpen)
        this.ui.helpText.setVisible(this.helpOpen)
        return
      }
      if (this.gameOver) {
        // High-score initials entry
        if (this.enteringHS) {
          if (k === 'backspace') {
            this.hsInitials = this.hsInitials.slice(0, -1)
            this.renderHSInput()
            return
          }
          if (k === 'enter') {
            this.commitHighScore()
            return
          }
          if (/^[a-z0-9]$/.test(k) && this.hsInitials.length < 3) {
            this.hsInitials += k.toUpperCase()
            this.renderHSInput()
            return
          }
          return
        }
        if (k === 'r' || k === ' ') {
          this.scene.restart()
          return
        }
        if (k === 's') {
          this.toggleScoreboard()
          return
        }
        return
      }
      if (this.awaitChar) {
        this.awaitChar = false
        const t = this.findNearestByLabel(k)
        if (t) {
          this.target = t
          t.setTint(0xffffff)
          this.playLockSfx?.()
        }
        return
      }
      // Dash: double-tap 'w' to dash forward; press 'b' to dash back
      if (k === 'w') {
        const now = this.time.now || performance.now()
        if (now - (this._lastW || 0) <= this._dashGap) {
          this.dash(+1, 0)
        }
        this._lastW = now
      } else if (k === 'b') {
        this.dash(-1, 0)
      }
      if (k === '[' || k === ']') {
        try {
          const step = k === ']' ? +0.05 : -0.05
          const g = Math.max(
            0,
            Math.min(1, (this.masterGain?.gain?.value || 0.2) + step),
          )
          this.masterGain.gain.value = g
          localStorage.setItem('prefs.volume', String(g))
        } catch {}
        return
      }
      if (k === 'w' || k === 'j') this.thrust.f = true
      else if (k === 's' || k === 'k') this.thrust.b = true
      else if (k === 'a' || k === 'h') this.thrust.l = true
      else if (k === 'd' || k === 'l') this.thrust.r = true
      else if (k === 'f') this.awaitChar = true
      else if (k === 'x' || code === 'Space') this.tryFire()
      else if (k === 'm') {
        this.toggleMute()
        return
      } else if (k === 't' && this.audioDebug) {
        this.playFireSfx?.()
        console.info('[Arcade] Test beep fired')
      }
    }
    this._onKeyUp = e => {
      const code = e.code || ''
      let k = (e.key || '').toLowerCase()
      if (code === 'ArrowLeft') k = 'h'
      else if (code === 'ArrowRight') k = 'l'
      else if (code === 'ArrowUp') k = 'k'
      else if (code === 'ArrowDown') k = 'j'
      if (k === 'w' || k === 'j') this.thrust.f = false
      else if (k === 's' || k === 'k') this.thrust.b = false
      else if (k === 'a' || k === 'h') this.thrust.l = false
      else if (k === 'd' || k === 'l') this.thrust.r = false
    }
    this.input.keyboard.on('keydown', this._onKeyDown)
    this.input.keyboard.on('keyup', this._onKeyUp)

    // Cleanup bindings on shutdown
    this.events.once('shutdown', this.onShutdown, this)

    // Pause on tab blur / resume on focus
    setupPauseOnBlur(this)
  }

  // --- Wave progression (kill-based) ---
  beginWave(n) {
    try {
      const now = this.time?.now || performance.now()
      this.wave = Math.max(1, Math.floor(n || 1))
      this.waveElapsed = 0
      this.lettersDestroyed = 0
      // small grace period at each wave start
      this.waveGraceUntil = now + Math.max(0, this.waveGrace || 0)
      // increase desired concurrent enemies a bit per wave (cap to keep it readable)
      this.desiredCount = Math.min(6, 2 + (this.wave - 1))
      // Aggression tuning: wave 6+ letters-only but more intense
      if (this.wave >= 6) {
        this.desiredCount = 8
        this.spawnBurst = 2
        this.shootAggro = 0.15
        this.maxSpeed = Math.max(this.maxSpeed || 140, 200)
      } else {
        this.spawnBurst = 1
        this.shootAggro = 0
      }
      this.spawningPaused = false
      // update HUD + banner
      this.ui?.wave?.setText('wave: ' + this.wave)
      this.showWaveBanner(this.wave)

      // Boss waves: bring out the boss after grace, pause normal spawns
      if (isBossWave(this.wave)) {
        this.spawningPaused = true
        const delay = Math.max(0, this.waveGrace || 0)
        this.time.delayedCall(delay, () => {
          if (this.gameOver) return
          if (!isBossWave(this.wave)) return
          if (this.emBoss && this.emBoss.active) return
          this.spawnEmacsBoss()
        })
      }
    } catch {}
  }

  checkWaveProgress() {
    // Advance waves 1–4 by kill thresholds; wave 5 spawns boss from beginWave
    try {
      if (this.gameOver) return
      const now = this.time?.now || performance.now()
      // do not spawn/advance during grace
      if (now < (this.waveGraceUntil || 0)) return
      // For waves 1-4, once enough letters are destroyed, advance to next wave
      if ((this.wave || 1) <= 4) {
        const needed = thresholdForWave(this.wave)
        if ((this.lettersDestroyed || 0) >= needed) {
          this.beginWave((this.wave || 1) + 1)
        }
        return
      }
      // For wave >= 5, boss is handled in beginWave and explodeBoss()
    } catch {}
  }

  burst(axis, dir) {
    const speed = 220,
      dur = 120
    this.tweens.addCounter({
      from: 1,
      to: 0,
      duration: dur,
      ease: 'Sine.easeOut',
      onUpdate: tw => {
        const t = tw.getValue()
        if (axis === 'x') {
          this._vxImpulse = dir * speed * t
        } else {
          this._vyImpulse = dir * speed * t
        }
        this.player.setVelocity(this._vxImpulse, this._vyImpulse)
      },
    })
  }
  dash(dx, dy) {
    const d = 64,
      nx = Phaser.Math.Clamp(this.player.x + dx * d, 8, 632),
      ny = Phaser.Math.Clamp(this.player.y + dy * d, 8, 352)
    this.tweens.add({
      targets: this.player,
      x: nx,
      y: ny,
      duration: 120,
      ease: 'Quad.easeOut',
    })
    this.playDashSfx?.()
  }

  findNearestByLabel(ch) {
    let best = null,
      bd = Infinity
    this.enemies.children.iterate(e => {
      if (!e || !e.active) return
      if ((e.getData('label') || '').toLowerCase() !== String(ch).toLowerCase())
        return
      const d = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        e.x,
        e.y,
      )
      if (d < bd) {
        bd = d
        best = e
      }
    })
    return best
  }

  // nose() was used by the old single-gun firing; no longer needed

  tryFire() {
    const now = this.time.now || performance.now()
    if (now < (this.lastShot || 0) + (this.fireCd || 200)) return
    this.lastShot = now
    // Aim forward, or towards locked target if present
    let dir
    if (this.target && this.target.active) {
      dir = new Phaser.Math.Vector2(
        this.target.x - this.player.x,
        this.target.y - this.player.y,
      )
      if (dir.lengthSq() > 0.0001) dir.normalize()
      else dir = new Phaser.Math.Vector2(1, 0)
    } else {
      const rot = this.player.rotation
      dir = new Phaser.Math.Vector2(Math.cos(rot), Math.sin(rot))
    }
    const side = new Phaser.Math.Vector2(-dir.y, dir.x)
    const forwardOffset = 10,
      sideOffset = 8
    const base = new Phaser.Math.Vector2(this.player.x, this.player.y).add(
      dir.clone().scale(forwardOffset),
    )
    const leftPos = base.clone().add(side.clone().scale(+sideOffset))
    const rightPos = base.clone().add(side.clone().scale(-sideOffset))
    const speed = 320
    ;[leftPos, rightPos].forEach(p => {
      const b = this.bullets.get(p.x, p.y, 'dot')
      if (!b) return
      b.setActive(true).setVisible(true).setScale(1.5).setTint(0xfcd34d)
      if (!b.body) this.physics.world.enable(b)
      else b.body.enable = true
      b.body.reset(p.x, p.y)
      b.setDepth(3)
      try {
        b.body.setSize(PLAYER_BULLET_SIZE, PLAYER_BULLET_SIZE, true)
      } catch {}
      b.body.velocity.set(dir.x * speed, dir.y * speed)
      this.time.delayedCall(1200, () => {
        if (b.active) {
          this.bullets.killAndHide(b)
          b.body.enable = false
        }
      })
      this.muzzleFx?.explode(Phaser.Math.Between(8, 10), p.x, p.y)
    })
    this.playFireSfx?.()
  }

  onHit(b, e) {
    if (!e || !e.active) {
      if (b) {
        this.bullets.killAndHide(b)
        b.body && (b.body.enable = false)
      }
      return
    }
    const hp = Math.max(0, (e.getData('hp') || 1) - 1)
    e.setData('hp', hp)
    if (b) {
      this.bullets.killAndHide(b)
      b.body && (b.body.enable = false)
    }
    if (hp <= 0) {
      e.setData('dead', true)
      e.label?.destroy()
      if (this.target === e) this.target = null
      this.hitFx.explode(24, e.x, e.y)
      this.cameras.main.shake(90, 0.008)
      e.disableBody(true, true)
      this.score = (this.score || 0) + (e.getData('type') === 'boss' ? 200 : 10)
      this.ui?.score?.setText('score: ' + this.score)
      this.playHitSfx?.()
      // count letter kills (non-boss) towards wave progression
      if ((e.getData('type') || '') !== 'boss') {
        this.lettersDestroyed = (this.lettersDestroyed || 0) + 1
        this.checkWaveProgress()
      }
    } else {
      this.hitFx.explode(12, e.x, e.y)
    }
  }

  enemyFire(e) {
    if (!e || !e.active) return
    // Limit bullet spam on early waves
    if ((this.wave || 1) === 1 && this.eBullets?.countActive?.(true) >= 1)
      return
    const dx = this.player.x - e.x,
      dy = this.player.y - e.y
    const d = Math.hypot(dx, dy) || 1
    const dir = { x: dx / d, y: dy / d }
    const b = this.eBullets.get(e.x, e.y, 'dot')
    if (!b) return
    if (!b.body) this.physics.world.enable(b)
    else b.body.enable = true
    b.setActive(true).setVisible(true).setScale(1.2).setTint(0xf87171)
    b.body.reset(e.x, e.y)
    b.setDepth(2)
    // Make the collision body a bit larger to avoid tunneling through the player
    try {
      b.body.setSize(ENEMY_BULLET_SIZE, ENEMY_BULLET_SIZE, true)
    } catch {}
    const speed = 140 + Math.min(100, (this.wave || 1) * 10)
    b.body.velocity.x = dir.x * speed
    b.body.velocity.y = dir.y * speed
    this.time.delayedCall(2200, () => {
      if (b.active) {
        this.eBullets.killAndHide(b)
        b.body.enable = false
      }
    })
  }

  // --- Emacs Boss ---
  spawnEmacsBoss() {
    const doSpawn = () => {
      const W = this.scale.width
      const key = this.textures.exists('emacsBoss')
        ? 'emacsBoss'
        : this.textures.exists('px')
          ? 'px'
          : 'dot'
      const yStart = -60
      this.emBoss = this.physics.add.image(W / 2, yStart, key).setDepth(12)
      if (key === 'emacsBoss') {
        try {
          const emTex = this.textures.get('emacsBoss')?.getSourceImage?.()
          const baseW = emTex && emTex.width ? emTex.width : 256
          const s = Phaser.Math.Clamp(BOSS.TARGET_PX / baseW, 0.12, 1.0)
          this.emBoss.setScale(s)
        } catch {
          this.emBoss.setScale(this.bossScale || 0.4)
        }
      } else {
        this.emBoss.setScale(24) // fallback visible if no asset
      }
      this.emBoss.setOrigin(0.5)
      try {
        const bw = Math.max(8, this.emBoss.width * 0.6)
        const bh = Math.max(8, this.emBoss.height * 0.6)
        this.emBoss.body.setSize(bw, bh, true) // center the body
        this.emBoss.body.setImmovable(true)
        this.emBoss.setPushable(false)
        this.emBoss.body.enable = true
      } catch {}
      this.emBossHP = BOSS.HP
      this.bossHpMax = BOSS.HP
      // Boss HP UI
      createBossHpHUD(this)
      // Rotate continuously
      this.emBossSpin = this.tweens.add({
        targets: this.emBoss,
        angle: 360,
        duration: 3000,
        repeat: -1,
        ease: 'Linear',
      })
      // Move in from top
      this.emBossArrive = this.tweens.add({
        targets: this.emBoss,
        y: BOSS.ENTRY_Y,
        duration: 900,
        ease: 'Sine.easeOut',
      })
      // Overlap with player bullets (both orders) and collide with player body
      setupBossColliders(this)
      // Firing loop
      this.emBossFireEvt = this.time.addEvent({
        delay: BOSS.FIRE_DELAY,
        loop: true,
        callback: () => this.bossFire(),
      })
    }
    // Ensure boss texture is loaded, otherwise load it on the fly
    if (!this.textures.exists('emacsBoss') && EMACS_URL) {
      this.load.image('emacsBoss', EMACS_URL)
      this.load.once('complete', doSpawn)
      this.load.start()
    } else {
      doSpawn()
    }
  }

  bossFire() {
    if (!this.emBoss || !this.emBoss.active) return
    const px = this.player.x,
      py = this.player.y
    const bx = this.emBoss.x,
      by = this.emBoss.y
    const baseAng = Math.atan2(py - by, px - bx)
    const bulletKey = this.textures.exists('dot') ? 'dot' : 'px'
    const fan = BOSS.FAN,
      spread = Phaser.Math.DegToRad(BOSS.SPREAD_DEG)
    const step = spread / (fan - 1)
    for (let i = 0; i < fan; i++) {
      const a = baseAng - spread / 2 + i * step
      const dir = { x: Math.cos(a), y: Math.sin(a) }
      const b = this.eBullets.get(bx, by, bulletKey)
      if (!b) continue
      b.setActive(true).setVisible(true).setDepth(11)
      if (bulletKey === 'dot') b.setScale(1.2).setTint(0xa78bfa) // purple tint
      if (!b.body) this.physics.world.enable(b)
      else b.body.enable = true
      b.body.reset(bx, by)
      try {
        b.body.setSize(12, 12, true)
      } catch {}
      const speed = BOSS.BULLET_SPEED
      b.body.velocity.x = dir.x * speed
      b.body.velocity.y = dir.y * speed
      this.time.delayedCall(2200, () => {
        if (b.active) {
          this.eBullets.killAndHide(b)
          b.body.enable = false
        }
      })
    }
  }

  onBossHit(a, b) {
    // Robustly determine which arg is the bullet and which is the boss
    const isBullet = x => !!x && !!this.bullets?.contains?.(x)
    const bullet = isBullet(a) ? a : isBullet(b) ? b : null
    const boss = this.emBoss
    if (!boss || !boss.active) return
    if (!bullet || !bullet.active) return
    // remove player bullet
    try {
      this.bullets.killAndHide(bullet)
      bullet.body && (bullet.body.enable = false)
    } catch {}
    this.emBossHP = Math.max(0, (this.emBossHP || 0) - 1)
    // flash boss
    try {
      boss.setTint(0xffffff)
      this.time.delayedCall(90, () => boss?.clearTint?.())
    } catch {}
    // hit FX + SFX
    this.hitFx?.explode(24, boss.x, boss.y)
    this.playHitSfx?.()
    this.updateBossHpUI?.()
    if (this.emBossHP <= 0) {
      this.explodeBoss()
    }
  }

  explodeBoss() {
    if (!this.emBoss) return
    if (!this.reducedMotion) this.cameras.main.shake(220, 0.012)
    this.hitFx?.explode(60, this.emBoss.x, this.emBoss.y)
    try {
      this.emBossSpin?.stop()
      this.emBossArrive?.stop()
    } catch {}
    try {
      this.emBossFireEvt?.remove(false)
    } catch {}
    try {
      this.emBossCollider &&
        this.physics.world.removeCollider(this.emBossCollider)
    } catch {}
    try {
      this.emBossCollider2 &&
        this.physics.world.removeCollider(this.emBossCollider2)
    } catch {}
    try {
      this.emBossPlayerCollider &&
        this.physics.world.removeCollider(this.emBossPlayerCollider)
    } catch {}
    this.emBoss.disableBody(true, true)
    this.emBoss.destroy()
    this.emBoss = null
    destroyBossHpHUD(this)
    // Resume normal spawns and push wave forward with grace
    this.spawningPaused = false
    this.lettersDestroyed = 0
    this.beginWave((this.wave || 5) + 1)
  }

  onPlayerCollide(a, b) {
    // On contact, just bounce; damage only from bullets
    const enemy = a === this.player ? b : a
    if (!enemy || enemy === this.player || !enemy.active) return
    const dx = this.player.x - enemy.x,
      dy = this.player.y - enemy.y
    const d = Math.hypot(dx, dy) || 1
    const nx = dx / d,
      ny = dy / d
    const bounce = 140
    if (this.player.body) {
      this.player.body.velocity.x += nx * bounce
      this.player.body.velocity.y += ny * bounce
    }
    if (enemy.body) {
      enemy.body.velocity.x -= nx * bounce
      enemy.body.velocity.y -= ny * bounce
    }
    if (!this.reducedMotion) this.cameras.main.shake(80, 0.004)
  }
  onBossTouch(a, b) {
    // Support either param order
    const player = a === this.player ? a : b === this.player ? b : null
    const boss = a === this.emBoss ? a : b === this.emBoss ? b : null
    if (!player || !boss) return
    // Knockback + damage
    const dx = player.x - boss.x,
      dy = player.y - boss.y
    const d = Math.hypot(dx, dy) || 1
    const nx = dx / d,
      ny = dy / d
    const bounce = 160
    if (player.body) {
      player.body.velocity.x += nx * bounce
      player.body.velocity.y += ny * bounce
    }
    if (!this.reducedMotion) this.cameras.main.shake(100, 0.006)
    this.damagePlayer(1)
  }
  onPlayerHitByBullet(a, b) {
    // Support either param order from overlap
    const bullet = a === this.player ? b : a
    if (!bullet || bullet === this.player || !bullet.active) return
    const now = this.time.now || performance.now()
    // Always remove the bullet, but only apply damage if out of i-frames
    this.eBullets.killAndHide(bullet)
    bullet.body && (bullet.body.enable = false)
    // Small impact burst even if invulnerable, for feedback
    this.hitFx?.explode(10, this.player.x, this.player.y)
    if (now < (this.invulnUntil || 0)) return
    this.damagePlayer(1)
  }

  damagePlayer(d) {
    const now = this.time.now || performance.now()
    if (now < this.invulnUntil) return
    this.hp = Math.max(0, (this.hp || 1) - Math.max(1, d))
    this.invulnUntil = now + 1000
    // Flicker
    if (!this.reducedMotion)
      this.tweens.add({
        targets: this.player,
        alpha: 0.3,
        yoyo: true,
        repeat: 5,
        duration: 80,
      })
    if (!this.reducedMotion) this.cameras.main.shake(160, 0.012)
    if (!this.reducedMotion) this.cameras.main.flash(80, 255, 60, 60)
    this.playHitSfx?.()
    this.updateHpUI()
    if (this.hp <= 0) {
      // small delay so the last hit feedback is visible
      this.time.delayedCall(220, () => this.endGame())
    }
  }
  updateHpUI() {
    this.updatePlayerHpUI?.()
  }

  endGame() {
    if (this.gameOver) return
    this.gameOver = true
    this.spawnEvt?.remove()
    this.timerEvt?.remove()
    this.rampEvt?.remove()
    this.seekEvt?.remove()
    this.waveEvt?.remove()
    this.shootEvt?.remove()
    // Stop movement and physics
    this.thrust = { f: false, b: false, l: false, r: false }
    this.player.setVelocity(0, 0)
    // Freeze enemies and bullets
    this.enemies?.children?.iterate?.(e => {
      if (e?.body) {
        e.body.setVelocity(0, 0)
      }
    })
    this.bullets?.children?.iterate?.(b => {
      if (b) {
        this.bullets.killAndHide(b)
        b.body && (b.body.enable = false)
      }
    })
    this.eBullets?.children?.iterate?.(b => {
      if (b) {
        this.eBullets.killAndHide(b)
        b.body && (b.body.enable = false)
      }
    })
    try {
      this.physics.world.pause()
    } catch {}
    const bg = this.add
      .rectangle(320, 180, 640, 360, 0x000000, 0.6)
      .setDepth(20)
    const t1 = this.add
      .text(320, 156, 'Game Over — Score: ' + this.score, {
        fontSize: '18px',
        color: '#fca5a5',
      })
      .setOrigin(0.5)
      .setDepth(21)
    const t2 = this.add
      .text(320, 192, 'R: Retry • S: Scores', {
        fontSize: '12px',
        color: '#e2e8f0',
      })
      .setOrigin(0.5)
      .setDepth(21)
    this.gameOverUI = [bg, t1, t2]
    // If qualifies, prompt for initials
    if (this.qualifiesHighScore(this.score)) {
      this.enterHighScore()
    } else {
      // Auto-show scoreboard like a classic arcade
      this.time.delayedCall(800, () => this.showScoreboard(true))
    }
  }

  update() {
    // Keep facing right; apply thrust + drag and screen wrap
    this.player.setAngle(0)
    this.lastAngle = 0
    const body = this.player.body,
      dt = Math.min((this.game.loop.delta || 16) / 1000, DT_CLAMP)
    const ax = (this.thrust.f ? 1 : 0) - (this.thrust.b ? 1 : 0)
    const ay = (this.thrust.r ? 1 : 0) - (this.thrust.l ? 1 : 0)
    const ACC = 220
    body.velocity.x += ACC * ax * dt
    body.velocity.y += ACC * ay * dt
    body.velocity.x *= 0.96
    body.velocity.y *= 0.96
    const w = this.scale.width,
      h = this.scale.height
    if (this.player.x < 0) this.player.setX(w)
    else if (this.player.x > w) this.player.setX(0)
    if (this.player.y < 0) this.player.setY(h)
    else if (this.player.y > h) this.player.setY(0)
    const anyThrust =
      this.thrust.f || this.thrust.b || this.thrust.l || this.thrust.r
    if (anyThrust) this.exhaustFx?.start()
    else this.exhaustFx?.stop()

    this.enemies.children.iterate(e => {
      if (!e) return
      if (e.label) {
        e.label.x = e.x
        e.label.y = e.y - 10
      }
      const m = 32,
        w = this.scale.width,
        h = this.scale.height
      if (e.x < m) e.setVelocityX(80 + Phaser.Math.Between(0, 40))
      else if (e.x > w - m) e.setVelocityX(-80 - Phaser.Math.Between(0, 40))
      if (e.y < m) e.setVelocityY(80 + Phaser.Math.Between(0, 40))
      else if (e.y > h - m) e.setVelocityY(-80 - Phaser.Math.Between(0, 40))
    })
    this.bullets.children.iterate(b => {
      if (b && (b.x > 660 || b.x < -20 || b.y < -20 || b.y > 380)) {
        this.bullets.killAndHide(b)
        if (b.body) b.body.enable = false
      }
    })
    this.eBullets?.children?.iterate?.(b => {
      if (b && (b.x > 660 || b.x < -20 || b.y < -20 || b.y > 380)) {
        this.eBullets.killAndHide(b)
        if (b.body) b.body.enable = false
      }
    })
    this.lockG.clear()
    if (this.target && this.target.active)
      this.lockG.lineBetween(
        this.player.x,
        this.player.y,
        this.target.x,
        this.target.y,
      )
    if (this.glow) {
      this.glow.x = this.player.x
      this.glow.y = this.player.y
    }
    const a = Phaser.Math.DegToRad(this.player.angle || 0)
    const tail = {
      x: this.player.x - Math.cos(a) * (this.player.displayWidth * 0.35),
      y: this.player.y - Math.sin(a) * (this.player.displayWidth * 0.35),
    }
    if (this.exhaustFx && this.exhaustFx.on)
      this.exhaustFx.setPosition(tail.x, tail.y)
    if (this.glow && Math.random() < 0.9)
      this.glow.emitParticleAt(tail.x, tail.y, 1)

    // Extra safety: manual overlap checks this frame
    // Pooled objects can occasionally miss group colliders; run explicit overlaps.
    // Player bullets vs enemies
    try {
      this.physics.overlap(this.bullets, this.enemies, this.onHit, null, this)
    } catch {}
    if (this.emBoss && this.emBoss.active) {
      try {
        this.physics.overlap(
          this.bullets,
          this.emBoss,
          this.onBossHit,
          null,
          this,
        )
      } catch {}
    }

    // Audio HUD (debug only)
    if (this.audioDebug && this.ui?.audio) {
      const state = this._ctx?.state || 'n/a'
      const m = this.muted ? 'muted' : 'on'
      const unlocked = this.audioUnlockedAt ? 'unlocked' : 'locked'
      this.ui.audio.setText(`audio: ${state} • ${unlocked} • ${m}`)
      // keep bottom-right anchored (in case of resize in future)
      this.ui.audio.setPosition(this.scale.width - 6, this.scale.height - 6)
      this.ui.audioBtn?.setPosition(
        this.scale.width - 6,
        this.scale.height - 22,
      )
      const isRunning = this._ctx && this._ctx.state === 'running'
      this.ui.audioBtn?.setVisible(!isRunning)
    }
    // Keep anchors aligned
    updateAnchors(this)
  }

  onShutdown() {
    this.input?.keyboard?.off('keydown', this._onKeyDown)
    this.input?.keyboard?.off('keyup', this._onKeyUp)
    this.spawnEvt?.remove()
    this.timerEvt?.remove()
    this.rampEvt?.remove()
    this.seekEvt?.remove()
    /* waveEvt removed */ this.shootEvt?.remove()
    this.glow?.destroy()
    this.hitFx?.destroy()
    this.muzzleFx?.destroy()
    this.exhaustFx?.destroy()
    this.emBossFireEvt?.remove(false)
    this.emBossSpin?.stop()
    this.emBossArrive?.stop()
    try {
      this.emBossCollider &&
        this.physics.world.removeCollider(this.emBossCollider)
    } catch {}
    try {
      this.emBossCollider2 &&
        this.physics.world.removeCollider(this.emBossCollider2)
    } catch {}
    try {
      this.emBossPlayerCollider &&
        this.physics.world.removeCollider(this.emBossPlayerCollider)
    } catch {}
    if (this.emBoss?.destroy)
      try {
        this.emBoss.destroy()
      } catch {}
  }
  // --- High score handling ---
  loadHighScores() {
    try {
      const raw = localStorage.getItem('arcade.highscores')
      const arr = raw ? JSON.parse(raw) : []
      if (Array.isArray(arr)) this.highScores = arr
    } catch {}
    this.highScores = (this.highScores || [])
      .filter(x => x && typeof x.score === 'number' && x.name)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
    this.highScore = this.highScores[0]?.score || 0
  }
  saveHighScores() {
    try {
      localStorage.setItem(
        'arcade.highscores',
        JSON.stringify(this.highScores.slice(0, 10)),
      )
    } catch {}
  }
  qualifiesHighScore(score) {
    if (!score || score < (this.minHighScore || 0)) return false
    const list = this.highScores || []
    if (list.length < 10) return true
    const low = list[list.length - 1]?.score || 0
    return score > low
  }
  enterHighScore() {
    this.enteringHS = true
    this.hsInitials = ''
    this.hsBg = this.add
      .rectangle(320, 240, 340, 90, 0x000000, 0.7)
      .setDepth(22)
    this.hsText = this.add
      .text(320, 220, 'New High Score! Enter initials:', {
        fontSize: '14px',
        color: '#a7f3d0',
      })
      .setOrigin(0.5)
      .setDepth(23)
    this.hsInput = this.add
      .text(320, 246, '___', { fontSize: '18px', color: '#f0fdf4' })
      .setOrigin(0.5)
      .setDepth(23)
    this.renderHSInput()
  }
  renderHSInput() {
    if (!this.hsInput) return
    const s = this.hsInitials.padEnd(3, '_')
    this.hsInput.setText(s)
  }
  commitHighScore() {
    if (!this.qualifiesHighScore(this.score || 0)) {
      this.clearHSUI()
      this.showScoreboard(true)
      return
    }
    const name = (this.hsInitials || '???').slice(0, 3)
    this.highScores.push({ name, score: this.score || 0, ts: Date.now() })
    this.highScores.sort((a, b) => b.score - a.score).splice(10)
    this.highScore = this.highScores[0]?.score || 0
    this.saveHighScores()
    this.clearHSUI()
    this.showScoreboard(true)
  }
  clearHSUI() {
    this.enteringHS = false
    this.hsBg?.destroy()
    this.hsText?.destroy()
    this.hsInput?.destroy()
    this.hsBg = this.hsText = this.hsInput = null
  }
  showScoreboard(autoClose = false) {
    if (this.scoresOpen) return
    this.scoresOpen = true
    const w = 420,
      h = 220
    this.scBg = this.add
      .rectangle(320, 180, w, h, 0x0b1220, 0.92)
      .setStrokeStyle(1, 0x334155)
      .setDepth(24)
    const title = this.add
      .text(320, 90, 'High Scores', { fontSize: '16px', color: '#67e8f9' })
      .setOrigin(0.5)
      .setDepth(25)
    const lines = this.highScores.map(
      (s, i) =>
        `${String(i + 1).padStart(2, ' ')}  ${s.name.padEnd(3, ' ')}   ${String(s.score).padStart(6, ' ')}`,
    )
    const body = this.add
      .text(320, 120, lines.join('\n') || 'No scores yet', {
        fontSize: '14px',
        color: '#e2e8f0',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5, 0)
      .setDepth(25)
    const hint = this.add
      .text(
        320,
        120 + h - 34,
        autoClose ? 'Press any key' : 'R to Retry • any key to close',
        { fontSize: '12px', color: '#94a3b8' },
      )
      .setOrigin(0.5)
      .setDepth(25)
    this.scUI = [this.scBg, title, body, hint]
    const closer = () => {
      if (!this.scoresOpen) return
      this.hideScoreboard()
      this.input.keyboard.off('keydown', closer)
    }
    this.input.keyboard.on('keydown', closer)
  }
  hideScoreboard() {
    this.scoresOpen = false
    ;(this.scUI || []).forEach(x => x?.destroy())
    this.scUI = null
  }
  toggleScoreboard() {
    if (this.scoresOpen) this.hideScoreboard()
    else this.showScoreboard()
  }
  toggleMute() {
    this.muted = !this.muted
    try {
      localStorage.setItem('prefs.arcadeMuted', this.muted ? '1' : '0')
    } catch {}
    if (this.ui?.mute) this.ui.mute.setText(this.muted ? '🔇' : '🔊')
  }
  showWaveBanner(n) {
    try {
      const t = this.add
        .text(this.scale.width / 2, this.scale.height / 2, `Wave ${n}`, {
          fontSize: '22px',
          color: '#e2e8f0',
        })
        .setOrigin(0.5)
        .setDepth(30)
      this.tweens.add({
        targets: t,
        alpha: 0,
        duration: 900,
        delay: 350,
        onComplete: () => t.destroy(),
      })
      // subtle beep to signal start
      this.playLockSfx?.()
    } catch {}
  }

  // SFX methods are bound via audio.bindSfx(this)
}
