// HUD helpers for GameScene (player and boss HP bars)

export function createPlayerHpHUD(scene) {
  const makeBar = () => {
    const hp = Math.max(0, scene.hp || 0)
    const max = Math.max(1, scene.hpMax || 10)
    const filled = Math.round((hp / max) * 10)
    return `vim:  [${'■'.repeat(filled)}${' '.repeat(10 - filled)}] ${hp}/${max}`
  }
  scene.ui.playerHp = scene.add
    .text(10, 12, makeBar(), { fontSize: '12px', color: '#22c55e' })
    .setDepth(10)
  scene.updatePlayerHpUI = () => {
    try {
      scene.ui.playerHp?.setText(makeBar())
    } catch {}
  }
}

export function createBossHpHUD(scene) {
  const makeBar = () => {
    const hp = Math.max(0, scene.emBossHP || 0)
    const max = Math.max(1, scene.bossHpMax || scene.emBossHP || 1)
    const filled = Math.round((hp / max) * 10)
    return `boss: [${'■'.repeat(filled)}${' '.repeat(10 - filled)}] ${hp}/${max}`
  }
  if (scene.ui.bossHp) scene.ui.bossHp.destroy()
  scene.ui.bossHp = scene.add
    .text(scene.scale.width / 2, 44, makeBar(), {
      fontSize: '12px',
      color: '#a78bfa',
    })
    .setOrigin(0.5, 0)
    .setDepth(15)
  scene.updateBossHpUI = () => {
    try {
      scene.ui.bossHp?.setText(makeBar())
    } catch {}
  }
}

export function destroyBossHpHUD(scene) {
  try {
    scene.ui.bossHp?.destroy()
  } catch {}
  scene.ui.bossHp = null
  scene.updateBossHpUI = null
}
