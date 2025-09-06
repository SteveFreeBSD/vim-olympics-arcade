// Audio setup and helpers (synthesised SFX via WebAudio)

export function setupAudio(scene) {
  try {
    if (scene.sound && scene.sound.context) {
      scene._ctx = scene.sound.context
      scene.masterGain = scene._ctx.createGain()
      try {
        const saved = parseFloat(localStorage.getItem('prefs.volume') || '0.2')
        scene.masterGain.gain.value = Math.max(
          0,
          Math.min(1, isNaN(saved) ? 0.2 : saved),
        )
      } catch {
        scene.masterGain.gain.value = 0.2
      }
      scene.masterGain.connect(scene._ctx.destination)
      // Lightweight noise buffer for hit/dash sfx
      scene.noiseBuffer = _makeNoiseBuffer(scene._ctx)
      const tryUnlock = () => {
        try {
          scene._ctx.resume().then(() => {
            scene.audioUnlockedAt = performance.now()
            if (scene.audioDebug) console.info('[Arcade] AudioContext resumed')
          })
        } catch {}
        try {
          scene.sound.unlock?.()
          if (scene.audioDebug)
            console.info('[Arcade] Phaser sound.unlock() called')
        } catch {}
      }
      scene.input.once('pointerdown', tryUnlock)
      scene.input.keyboard?.once('keydown', tryUnlock)
      scene.sound.on?.('unlocked', () => {
        scene.audioUnlockedAt = performance.now()
        if (scene.audioDebug) console.info('[Arcade] Phaser sound unlocked')
      })
      const audioRunning = () => scene._ctx && scene._ctx.state === 'running'
      if (!scene.audioDebug) {
        scene.ui.audioHint = scene.add
          .text(
            scene.scale.width - 6,
            scene.scale.height - 6,
            'click to enable audio',
            { fontSize: '10px', color: '#94a3b8' },
          )
          .setOrigin(1, 1)
          .setDepth(10)
        const hideHint = () => {
          if (audioRunning()) {
            scene.ui.audioHint?.destroy()
            scene.ui.audioHint = null
          }
        }
        scene.time.addEvent({ delay: 250, loop: true, callback: hideHint })
      } else {
        try {
          window.addEventListener('pointerdown', tryUnlock, { once: true })
          window.addEventListener('keydown', tryUnlock, { once: true })
        } catch {}
        scene.ui.audioBtn?.on('pointerdown', () => tryUnlock())
      }
    }
  } catch (e) {
    if (scene.audioDebug) console.warn('[Arcade] Audio init failed', e)
  }
}

function _makeNoiseBuffer(ctx) {
  try {
    const len = Math.floor(ctx.sampleRate * 0.25)
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    return buf
  } catch {
    return null
  }
}

function _playBeep(scene, freqA, freqB, dur, vol, type = 'square') {
  if (!scene._ctx || !scene.masterGain || scene.muted) return
  const ctx = scene._ctx
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = type
  const fA = (freqA || 440) * (1 + (Math.random() * 0.06 - 0.03))
  const fB = (freqB || fA) * (1 + (Math.random() * 0.04 - 0.02))
  o.frequency.setValueAtTime(Math.max(40, fA), ctx.currentTime)
  if (freqB && freqB !== freqA)
    o.frequency.exponentialRampToValueAtTime(
      Math.max(40, fB),
      ctx.currentTime + dur,
    )
  g.gain.setValueAtTime(0.0001, ctx.currentTime)
  g.gain.linearRampToValueAtTime(
    Math.max(0.0001, vol || 0.05),
    ctx.currentTime + 0.01,
  )
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur)
  o.connect(g)
  g.connect(scene.masterGain)
  o.start()
  o.stop(ctx.currentTime + dur + 0.02)
}

function _playNoise(scene, dur, vol, lpFreq) {
  if (!scene._ctx || !scene.masterGain || scene.muted || !scene.noiseBuffer)
    return
  const ctx = scene._ctx
  const src = ctx.createBufferSource()
  src.buffer = scene.noiseBuffer
  src.loop = true
  const f = ctx.createBiquadFilter()
  f.type = 'lowpass'
  f.frequency.setValueAtTime(Math.max(100, lpFreq || 1200), ctx.currentTime)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, ctx.currentTime)
  g.gain.linearRampToValueAtTime(
    Math.max(0.0001, vol || 0.06),
    ctx.currentTime + 0.01,
  )
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur)
  src.connect(f)
  f.connect(g)
  g.connect(scene.masterGain)
  src.start()
  src.stop(ctx.currentTime + dur + 0.05)
}

export function bindSfx(scene) {
  scene.playFireSfx = () => {
    scene.lastSfx.fire = performance.now()
    _playBeep(scene, 880, 520, 0.08, 0.12, 'square')
  }
  scene.playHitSfx = () => {
    scene.lastSfx.hit = performance.now()
    _playNoise(scene, 0.18, 0.12, 1400)
    _playBeep(scene, 220, 110, 0.12, 0.08, 'sawtooth')
  }
  scene.playDashSfx = () => {
    scene.lastSfx.dash = performance.now()
    _playNoise(scene, 0.12, 0.1, 800)
  }
  scene.playLockSfx = () => {
    scene.lastSfx.lock = performance.now()
    _playBeep(scene, 660, 660, 0.06, 0.08, 'triangle')
  }
}
