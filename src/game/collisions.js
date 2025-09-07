// Collision setup helpers for GameScene

export function setupBaseCollisions(scene) {
  scene.physics.add.overlap(
    scene.bullets,
    scene.enemies,
    scene.onHit,
    null,
    scene,
  )
  // Symmetric overlap to be extra robust with pooled objects
  scene.physics.add.overlap(
    scene.enemies,
    scene.bullets,
    scene.onHit,
    null,
    scene,
  )
  scene.physics.add.overlap(
    scene.enemies,
    scene.player,
    scene.onPlayerCollide,
    null,
    scene,
  )
  scene.physics.add.overlap(
    scene.eBullets,
    scene.player,
    scene.onPlayerHitByBullet,
    null,
    scene,
  )
}

export function setupBossColliders(scene) {
  scene.emBossCollider = scene.physics.add.overlap(
    scene.bullets,
    scene.emBoss,
    scene.onBossHit,
    null,
    scene,
  )
  scene.emBossCollider2 = scene.physics.add.overlap(
    scene.emBoss,
    scene.bullets,
    scene.onBossHit,
    null,
    scene,
  )
  scene.emBossPlayerCollider = scene.physics.add.collider(
    scene.player,
    scene.emBoss,
    scene.onBossTouch,
    null,
    scene,
  )
}

export function teardownBossColliders(scene) {
  try {
    scene.emBossCollider &&
      scene.physics.world.removeCollider(scene.emBossCollider)
  } catch {}
  try {
    scene.emBossCollider2 &&
      scene.physics.world.removeCollider(scene.emBossCollider2)
  } catch {}
  try {
    scene.emBossPlayerCollider &&
      scene.physics.world.removeCollider(scene.emBossPlayerCollider)
  } catch {}
}
