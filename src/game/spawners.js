// Spawner helpers and pool warmup for GameScene

export function prewarmBulletPools(scene, playerCount = 24, enemyCount = 32) {
  try {
    for (let i = 0; i < playerCount; i++) {
      const b = scene.bullets.get(-100, -100, 'dot')
      if (!b) break
      if (!b.body) scene.physics.world.enable(b)
      b.setActive(false).setVisible(false)
      b.body.enable = false
    }
    for (let i = 0; i < enemyCount; i++) {
      const eb = scene.eBullets.get(-100, -100, 'dot')
      if (!eb) break
      if (!eb.body) scene.physics.world.enable(eb)
      eb.setActive(false).setVisible(false)
      eb.body.enable = false
    }
  } catch {}
}
