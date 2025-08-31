import Phaser from 'phaser'

// Optional high-res ship asset discovered at build time via Vite
let SHIP256_URL
try {
  const matches = import.meta.glob('../assets/ship-vim@256.png', { eager: true, query: '?url', import: 'default' })
  SHIP256_URL = Object.values(matches)[0]
} catch {}

export default class GameScene extends Phaser.Scene {
  init() {
    this.awaitChar = false; this.target = null
    this._vxImpulse = 0; this._vyImpulse = 0
    this.score = 0; this.gameOver = false; this.timeLeft = 60
    this.maxSpeed = 140
    this.lastAngle = 0; this.lastShot = 0; this.fireCd = 200
    this.thrust = { f:false, b:false, l:false, r:false }
  }

  preload() {
    if (SHIP256_URL) this.load.image('ship256', SHIP256_URL)
  }

  // Vector-drawn fallback ship texture
  createShipTexture() {
    const w = 96, h = 64
    const g = this.make.graphics({ x: 0, y: 0, add: false })
    const pts = [ {x: 6, y: 8}, {x: 30, y: 8}, {x: 44, y: 36}, {x: 60, y: 8}, {x: 90, y: 8}, {x: 64, y: 58}, {x: 36, y: 58} ]
    g.lineStyle(8, 0x0b2a2a, 1); g.strokePoints(pts, true)
    g.fillStyle(0x22c55e, 1); g.fillPoints(pts, true)
    g.fillStyle(0x7dd3fc, 1); g.fillRoundedRect(28, 16, 20, 14, 4); g.fillRoundedRect(54, 16, 20, 14, 4)
    g.fillStyle(0x16a34a, 1); g.fillRect(18, 28, 18, 6); g.fillRect(64, 36, 16, 6)
    g.fillStyle(0x22c55e, 0.12); g.fillCircle(48, 32, 30)
    g.generateTexture('ship', w, h); g.destroy()
  }

  create() {
    // 1px dot texture used for particles/bullets
    const g = this.add.graphics(); g.fillStyle(0xffffff, 1).fillCircle(2, 2, 2)
    g.generateTexture('dot', 4, 4); g.destroy()

    // Starfield
    this.add.particles(0, 0, 'dot', {
      x: { min: 0, max: 640 }, y: 0, lifespan: 4000, speedY: 35,
      scale: { start: 0.3, end: 0 }, quantity: 2, blendMode: 'ADD'
    }).setDepth(0)

    // Ensure a vector fallback exists
    if (!this.textures.exists('ship')) this.createShipTexture()

    // Player: prefer high-res texture if loaded
    const W = this.scale.width, H = this.scale.height
    const shipKey = this.textures.exists('ship256') ? 'ship256' : 'ship'
    this.player = this.physics.add.image(W*0.25, H*0.5, shipKey)
      .setDepth(3)
      .setOrigin(0.5)
      .setCollideWorldBounds(false)
    // Downscale for panel size; keep aspect
    this.player.displayWidth = 56
    this.player.scaleY = this.player.scaleX
    this.player.body?.setSize?.(40, 28)

    // Optional external ship override (kept for dev convenience)
    try {
      const img = new Image(); img.decoding = 'async'; img.crossOrigin = 'anonymous'
      img.onload = () => { try {
        const key = 'ship-ext'; if (this.textures.exists(key)) this.textures.remove(key)
        this.textures.addImage(key, img)
        const desiredW = 64; const w = img.naturalWidth || img.width || desiredW
        const sc = Math.min(1, desiredW / w)
        this.player.setTexture(key).setScale(sc); this.player.body?.setSize?.(40, 28)
      } catch {} }
      img.onerror = () => {}; img.src = '/ship.png'
    } catch {}

    // Groups
    this.enemies = this.physics.add.group({ maxSize: 48 })
    this.bullets = this.physics.add.group({ maxSize: 24 })
    this.physics.add.overlap(this.bullets, this.enemies, this.onHit, null, this)

    // Visuals/UI
    this.lockG = this.add.graphics({ lineStyle: { width: 1, color: 0x22d3ee, alpha: 0.7 } }).setDepth(10)
    this.ui = {}
    this.ui.controls = this.add.text(this.scale.width/2, 4,
      'ws thrust • ad strafe • hjkl move • x/space fire',
      { fontSize: '14px', color: '#cbd5e1' }).setOrigin(0.5, 0).setDepth(10)
    this.ui.score = this.add.text(10, 30, 'score: 0', { fontSize: '14px', color: '#cbd5e1' }).setDepth(10)
    this.helpOpen = false
    this.ui.help = this.add.rectangle(0,0,this.scale.width,this.scale.height,0x000000,0.65).setOrigin(0).setDepth(20).setVisible(false)
    this.ui.helpText = this.add.text(this.scale.width/2, this.scale.height/2,
      'CONTROLS\n\nhjkl : move\nx    : fire\nw/e/b : dash (soon)\nf<char> : lock (soon)\n\nPress ? to close',
      { fontSize: '16px', color: '#e2e8f0', align: 'center' }).setOrigin(0.5).setDepth(21).setVisible(false)

    // FX
    this.hitFx = this.add.particles(0, 0, 'dot', { on: false, lifespan: 220, speed: { min: 120, max: 260 }, angle: { min: 0, max: 360 }, scale: { start: 0.45, end: 0 }, gravityY: 0, quantity: 20, blendMode: 'ADD' })
    this.muzzleFx = this.add.particles(0, 0, 'dot', { on: false, lifespan: 160, speed: { min: 60, max: 140 }, scale: { start: 0.35, end: 0 }, blendMode: 'ADD', quantity: 10 })
    this.exhaustFx = this.add.particles(0, 0, 'dot', { on: false, lifespan: 260, speed: { min: 25, max: 70 }, scale: { start: 0.5, end: 0 }, blendMode: 'ADD' })
    this.timerText = this.add.text(634, 4, String(this.timeLeft), { fontSize: '10px', color: '#fca5a5' }).setOrigin(1,0).setDepth(10)
    this.glow = this.add.particles(this.player.x, this.player.y, 'dot', { lifespan: 250, speed: {min:10,max:25}, quantity: 2, scale: { start: 0.8, end: 0 }, blendMode: 'ADD' })

    // Spawners and AI
    const MARGIN = 32
    // W,H already defined above
    const letters = ['h','j','k','l','w','e','b','f']
    const spawnEnemy = () => {
      const x = Phaser.Math.Between(MARGIN, W - MARGIN)
      const y = Phaser.Math.Between(MARGIN, H - MARGIN)
      const ch = Phaser.Utils.Array.GetRandom(letters)
      const e = this.physics.add.image(x, y, 'alien-' + ch).setData('label', ch)
      e.setBounce(1, 1).setCollideWorldBounds(true)
      e.setVelocity(Phaser.Math.Between(-100, 100), Phaser.Math.Between(-100, 100))
      e.setDepth(1); this.enemies.add(e)
    }
    // Build letter-only textures once
    letters.forEach(ch => {
      const key = 'alien-' + ch; if (this.textures.exists(key)) return
      const tmp = this.make.text({ x: 0, y: 0, text: ch.toUpperCase(), style: { fontFamily: 'monospace', fontSize: '32px', fontStyle: '900', color: '#ef4444', stroke: '#7f1d1d', strokeThickness: 6, shadow: { offsetX: 0, offsetY: 2, color: '#991b1b', blur: 8, fill: true, stroke: true } }, add: false })
      const pad = 8; const w = Math.ceil(tmp.width + pad * 2); const h = Math.ceil(tmp.height + pad * 2)
      const rt = this.make.renderTexture({ width: w, height: h, add: false })
      rt.draw(tmp, pad, pad); tmp.destroy()
      const g = this.make.graphics({ x: 0, y: 0, add: false }); g.fillStyle(0xef4444, 0.12)
      g.fillEllipse(w/2, h/2, Math.min(w,h)*0.9, Math.min(w,h)*0.9); rt.draw(g); g.destroy()
      rt.saveTexture(key); rt.destroy()
    })
    this.desiredCount = 8
    this.spawnEvt = this.time.addEvent({ delay: 1200, loop: true, callback: () => {
      if (this.gameOver) return; if (this.enemies.countActive(true) < this.desiredCount) spawnEnemy()
    }})
    this.timerEvt = this.time.addEvent({ delay: 1000, loop: true, callback: () => {
      if (this.gameOver) return; this.timeLeft--; this.timerText.setText(String(Math.max(0,this.timeLeft))); if (this.timeLeft <= 0) this.endGame()
    }})
    this.rampEvt = this.time.addEvent({ delay: 15000, loop: true, callback: () => {
      if (this.gameOver) return; this.desiredCount += 2; this.maxSpeed += 20
    }})
    this.seekEvt = this.time.addEvent({ delay: 300, loop: true, callback: () => {
      const list = this.enemies.getChildren().filter(e=>e && e.active)
      for(let i=0;i<list.length;i++){
        for(let j=i+1;j<list.length;j++){
          const a=list[i], b=list[j]; const dx=b.x-a.x, dy=b.y-a.y; const d=Math.hypot(dx,dy)||1
          if(d<28){ const nx=dx/d, ny=dy/d, k=(28-d); const imp=12+k*0.5
            a.setVelocity(a.body.velocity.x-nx*imp, a.body.velocity.y-ny*imp)
            b.setVelocity(b.body.velocity.x+nx*imp, b.body.velocity.y+ny*imp) }
        }
      }
      for(const e of list){ const dx=this.player.x-e.x, dy=this.player.y-e.y; const d=Math.hypot(dx,dy)||1
        const nx=dx/d, ny=dy/d; let vx=e.body.velocity.x+nx*40, vy=e.body.velocity.y+ny*40
        const s=Math.hypot(vx,vy); if(s>this.maxSpeed){ const r=this.maxSpeed/s; vx*=r; vy*=r; } e.setVelocity(vx,vy) }
    }})

    // Input
    this.input.keyboard.enabled = true
    this.input.keyboard.addCapture(['H','J','K','L','W','A','S','D','X','F','SPACE'])
    this._onKeyDown = e => {
      const code = e.code || ''; let k = (e.key || '').toLowerCase()
      if (code==='ArrowLeft') k='h'; else if (code==='ArrowRight') k='l'; else if (code==='ArrowUp') k='k'; else if (code==='ArrowDown') k='j'
      if (k==='?') { this.helpOpen=!this.helpOpen; this.ui.help.setVisible(this.helpOpen); this.ui.helpText.setVisible(this.helpOpen); return }
      if (this.gameOver) return
      if (this.awaitChar) { this.awaitChar = false; const t = this.findNearestByLabel(k); if (t){ this.target = t; t.setTint(0xffffff) } return }
      if (k==='w'||k==='j') this.thrust.f = true
      else if (k==='s'||k==='k') this.thrust.b = true
      else if (k==='a'||k==='h') this.thrust.l = true
      else if (k==='d'||k==='l') this.thrust.r = true
      else if (k==='f') this.awaitChar = true
      else if (k==='x' || code==='Space') this.tryFire()
    }
    this._onKeyUp = e => {
      const code = e.code || ''; let k = (e.key || '').toLowerCase()
      if (code==='ArrowLeft') k='h'; else if (code==='ArrowRight') k='l'; else if (code==='ArrowUp') k='k'; else if (code==='ArrowDown') k='j'
      if (k==='w'||k==='j') this.thrust.f = false
      else if (k==='s'||k==='k') this.thrust.b = false
      else if (k==='a'||k==='h') this.thrust.l = false
      else if (k==='d'||k==='l') this.thrust.r = false
    }
    this.input.keyboard.on('keydown', this._onKeyDown)
    this.input.keyboard.on('keyup', this._onKeyUp)

    // Cleanup bindings on shutdown
    this.events.once('shutdown', this.onShutdown, this)
  }

  burst(axis, dir){
    const speed = 220, dur = 120
    this.tweens.addCounter({ from: 1, to: 0, duration: dur, ease: 'Sine.easeOut', onUpdate: tw => {
      const t = tw.getValue(); if (axis==='x'){ this._vxImpulse = dir*speed*t } else { this._vyImpulse = dir*speed*t }
      this.player.setVelocity(this._vxImpulse, this._vyImpulse)
    }})
  }
  dash(dx, dy){
    const d = 64, nx = Phaser.Math.Clamp(this.player.x + dx*d, 8, 632), ny = Phaser.Math.Clamp(this.player.y + dy*d, 8, 352)
    this.tweens.add({ targets: this.player, x: nx, y: ny, duration: 120, ease: 'Quad.easeOut' })
  }

  findNearestByLabel(ch){
    let best = null, bd = Infinity
    this.enemies.children.iterate(e => {
      if (!e || !e.active) return
      if ((e.getData('label') || '').toLowerCase() !== String(ch).toLowerCase()) return
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y)
      if (d < bd) { bd = d; best = e }
    })
    return best
  }

  nose(){
    const a = Phaser.Math.DegToRad(this.player.angle || 0)
    const dl = (this.player.displayWidth || 32) * 0.45
    return { x: this.player.x + Math.cos(a) * dl, y: this.player.y + Math.sin(a) * dl }
  }

  tryFire(){
    const now = this.time.now || performance.now(); if (now < (this.lastShot||0)+(this.fireCd||200)) return
    this.lastShot = now
    const rot = this.player.rotation
    const dir = new Phaser.Math.Vector2(Math.cos(rot), Math.sin(rot))
    const side = new Phaser.Math.Vector2(-Math.sin(rot), Math.cos(rot))
    const forwardOffset = 10, sideOffset = 8
    const base = new Phaser.Math.Vector2(this.player.x, this.player.y).add(dir.clone().scale(forwardOffset))
    const leftPos  = base.clone().add(side.clone().scale(+sideOffset))
    const rightPos = base.clone().add(side.clone().scale(-sideOffset))
    const speed = 320
    ;[leftPos, rightPos].forEach(p => {
      const b = this.bullets.get(p.x, p.y, 'dot'); if (!b) return
      b.setActive(true).setVisible(true).setScale(1.5).setTint(0xfcd34d); this.physics.world.enable(b)
      b.body.reset(p.x, p.y); b.setDepth(3)
      b.body.velocity.set(dir.x * speed, dir.y * speed)
      this.time.delayedCall(1200, () => { if (b.active) { this.bullets.killAndHide(b); b.body.enable = false } })
      this.muzzleFx?.explode(Phaser.Math.Between(8,10), p.x, p.y)
    })
  }

  onHit(b,e){
    if(!e || !e.active) { if(b){ this.bullets.killAndHide(b); b.body && (b.body.enable=false); } return }
    if (e.getData('dead')) { if(b){ this.bullets.killAndHide(b); b.body && (b.body.enable=false); } return }
    e.setData('dead', true)
    e.label?.destroy(); if(b){ this.bullets.killAndHide(b); b.body && (b.body.enable=false); }
    if(this.target===e) this.target=null
    this.hitFx.explode(20, e.x, e.y); this.cameras.main.shake(90, 0.008)
    e.disableBody(true, true)
    this.score = (this.score || 0) + 10
    this.ui?.score?.setText('score: ' + this.score)
  }

  endGame(){
    if (this.gameOver) return; this.gameOver = true; this.timerText.setText('0')
    this.spawnEvt?.remove(); this.timerEvt?.remove(); this.player.setVelocity(0,0)
    const bg = this.add.rectangle(320, 180, 640, 360, 0x000000, 0.6).setDepth(20)
    const t1 = this.add.text(320, 176, 'Game Over — Score: ' + this.score, { fontSize: '18px', color: '#fca5a5' }).setOrigin(0.5).setDepth(21)
    this.gameOverUI = [bg,t1]
  }

  update(){
    // Keep facing right; apply thrust + drag and screen wrap
    this.player.setAngle(0); this.lastAngle = 0
    const body = this.player.body, dt = (this.game.loop.delta||16)/1000
    const ax = (this.thrust.f?1:0) - (this.thrust.b?1:0)
    const ay = (this.thrust.r?1:0) - (this.thrust.l?1:0)
    const ACC = 220
    body.velocity.x += ACC * ax * dt; body.velocity.y += ACC * ay * dt
    body.velocity.x *= 0.96; body.velocity.y *= 0.96
    const w=this.scale.width, h=this.scale.height
    if (this.player.x < 0) this.player.setX(w); else if (this.player.x > w) this.player.setX(0)
    if (this.player.y < 0) this.player.setY(h); else if (this.player.y > h) this.player.setY(0)
    const anyThrust = this.thrust.f||this.thrust.b||this.thrust.l||this.thrust.r
    if (anyThrust) this.exhaustFx?.start(); else this.exhaustFx?.stop()

    this.enemies.children.iterate(e => {
      if (!e) return
      if (e.label) { e.label.x = e.x; e.label.y = e.y - 10 }
      const m = 32, w = this.scale.width, h = this.scale.height
      if (e.x < m) e.setVelocityX(80 + Phaser.Math.Between(0, 40))
      else if (e.x > w - m) e.setVelocityX(-80 - Phaser.Math.Between(0, 40))
      if (e.y < m) e.setVelocityY(80 + Phaser.Math.Between(0, 40))
      else if (e.y > h - m) e.setVelocityY(-80 - Phaser.Math.Between(0, 40))
    })
    this.bullets.children.iterate(b => { if (b && b.x > 660) b.destroy() })
    this.lockG.clear(); if (this.target && this.target.active) this.lockG.lineBetween(this.player.x, this.player.y, this.target.x, this.target.y)
    if (this.glow) { this.glow.x = this.player.x; this.glow.y = this.player.y }
    const a = Phaser.Math.DegToRad(this.player.angle || 0)
    const tail = { x: this.player.x - Math.cos(a) * (this.player.displayWidth * 0.35), y: this.player.y - Math.sin(a) * (this.player.displayWidth * 0.35) }
    if (this.exhaustFx && this.exhaustFx.on) this.exhaustFx.setPosition(tail.x, tail.y)
    if (this.glow && Math.random() < 0.9) this.glow.emitParticleAt(tail.x, tail.y, 1)
  }

  onShutdown(){
    this.input?.keyboard?.off('keydown', this._onKeyDown)
    this.input?.keyboard?.off('keyup', this._onKeyUp)
    this.spawnEvt?.remove(); this.timerEvt?.remove(); this.rampEvt?.remove(); this.seekEvt?.remove()
    this.glow?.destroy(); this.hitFx?.destroy(); this.muzzleFx?.destroy(); this.exhaustFx?.destroy()
  }
}
