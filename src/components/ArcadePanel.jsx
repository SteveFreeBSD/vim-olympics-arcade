import React, { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import GameScene from '../game/GameScene'

export default function ArcadePanel() {
  const hostRef = useRef(null)
  const containerRef = useRef(null)
  useEffect(() => {
    if (!hostRef.current) return
    containerRef.current?.focus()
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: hostRef.current,
      width: 640,
      height: 360,
      backgroundColor: '#0b1220',
      pixelArt: false,
      render: { antialias: true },
      physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
      scene: GameScene,
    })
    return () => game?.destroy(true)
  }, [])
  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onPointerDown={() => containerRef.current?.focus()}
      className='rounded-3xl border border-slate-700/70 bg-slate-900/70 p-2 neo-card focus:outline-none focus:ring-2 focus:ring-cyan-500/30'>
      <div ref={hostRef} />
    </div>
  )
}

