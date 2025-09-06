// UI and overlay helpers for GameScene

export function createBaseHUD(scene) {
  scene.ui = scene.ui || {}
  // Lock-on line graphics
  scene.lockG = scene.add
    .graphics({ lineStyle: { width: 1, color: 0x22d3ee, alpha: 0.7 } })
    .setDepth(10)
  // Controls (bottom-center)
  scene.ui.controls = scene.add
    .text(
      scene.scale.width / 2,
      scene.scale.height - 4,
      'ws thrust • ad/hjkl move • x/Space fire • w/b dash • f<char> lock',
      { fontSize: '14px', color: '#cbd5e1' },
    )
    .setOrigin(0.5, 1)
    .setDepth(10)
  // Score (top-left)
  scene.ui.score = scene.add
    .text(10, 30, 'score: 0', { fontSize: '14px', color: '#cbd5e1' })
    .setDepth(10)
  // Wave label (top-center)
  scene.ui.wave = scene.add
    .text(scene.scale.width / 2, 20, 'wave: 1', {
      fontSize: '12px',
      color: '#a7f3d0',
    })
    .setOrigin(0.5, 0)
    .setDepth(10)
  // Mute icon (top-right)
  scene.ui.mute = scene.add
    .text(scene.scale.width - 8, 4, scene.muted ? '🔇' : '🔊', {
      fontSize: '14px',
      color: '#cbd5e1',
    })
    .setOrigin(1, 0)
    .setDepth(10)
    .setInteractive({ useHandCursor: true })
  scene.ui.mute.on('pointerdown', () => scene.toggleMute())
  // Help overlay (hidden by default)
  scene.helpOpen = false
  scene.ui.help = scene.add
    .rectangle(0, 0, scene.scale.width, scene.scale.height, 0x000000, 0.65)
    .setOrigin(0)
    .setDepth(20)
    .setVisible(false)
  scene.ui.helpText = scene.add
    .text(
      scene.scale.width / 2,
      scene.scale.height / 2,
      'CONTROLS\n\nhjkl : move\nx or Space : fire\nw/b : dash\nf<char> : lock-on\nm : mute\n\nPress ? to close',
      { fontSize: '16px', color: '#e2e8f0', align: 'center' },
    )
    .setOrigin(0.5)
    .setDepth(21)
    .setVisible(false)
}

export function updateAnchors(scene) {
  scene.ui?.mute?.setPosition(scene.scale.width - 8, 4)
  scene.ui?.controls?.setPosition(scene.scale.width / 2, scene.scale.height - 4)
}

export function setupPauseOnBlur(scene) {
  const onVis = () => {
    const hidden = document.hidden
    try {
      if (hidden) scene.physics.world.pause()
      else scene.physics.world.resume()
    } catch {}
    if (hidden) {
      scene._pausedUI = scene._pausedUI || [
        scene.add.rectangle(320, 180, 640, 360, 0x000000, 0.5).setDepth(50),
        scene.add
          .text(320, 180, 'Paused', { fontSize: '18px', color: '#e2e8f0' })
          .setDepth(51)
          .setOrigin(0.5),
      ]
    } else {
      ;(scene._pausedUI || []).forEach(n => n?.destroy())
      scene._pausedUI = null
    }
  }
  try {
    document.addEventListener('visibilitychange', onVis)
  } catch {}
  scene.events.once('shutdown', () => {
    try {
      document.removeEventListener('visibilitychange', onVis)
    } catch {}
  })
}

// Optional audio debug HUD elements (dev mode only)
export function createAudioDebugHUD(scene) {
  scene.ui.audio = scene.add
    .text(scene.scale.width - 6, scene.scale.height - 6, 'audio: init', {
      fontSize: '10px',
      color: '#67e8f9',
    })
    .setOrigin(1, 1)
    .setDepth(10)
  scene.ui.audioBtn = scene.add
    .text(scene.scale.width - 6, scene.scale.height - 22, 'Enable Audio', {
      fontSize: '10px',
      color: '#0b1220',
      backgroundColor: '#67e8f9',
      padding: { x: 6, y: 3 },
    })
    .setOrigin(1, 1)
    .setDepth(10)
    .setInteractive({ useHandCursor: true })
}
