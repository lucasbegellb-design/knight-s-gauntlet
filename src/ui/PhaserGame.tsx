import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { CombatScene } from '../scenes/CombatScene';

export function PhaserGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (gameRef.current) return; // guard against React StrictMode's double-invoke
    if (!containerRef.current) return;

    gameRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      width: 800,
      height: 450,
      parent: containerRef.current,
      backgroundColor: '#1d1d1d',
      scene: [CombatScene],
    });

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return <div ref={containerRef} data-testid="phaser-container" />;
}
