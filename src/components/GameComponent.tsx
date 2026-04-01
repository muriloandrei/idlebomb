import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { gameConfig } from '../game/config';
import { useGameStore } from '../store/useGameStore';

export function GameComponent() {
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!gameRef.current) {
      gameRef.current = new Phaser.Game(gameConfig);
    }

    // Escutador da ponte Phaser -> React
    const handleGoldEarned = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && typeof customEvent.detail.value === 'number') {
        useGameStore.getState().addGold(customEvent.detail.value);
      }
    };

    window.addEventListener('gold-earned', handleGoldEarned);

    return () => {
      window.removeEventListener('gold-earned', handleGoldEarned);

      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div className="w-full flex items-center justify-center p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm shadow-[0_0_40px_rgba(163,230,53,0.15)] transition-all hover:shadow-[0_0_60px_rgba(163,230,53,0.25)]">
      <div id="game-container" className="rounded-xl overflow-hidden shadow-black shadow-2xl"></div>
    </div>
  );
}
