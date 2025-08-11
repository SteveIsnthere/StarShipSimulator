import { Sprite } from '@pixi/react';
import { Assets, Texture } from 'pixi.js';
import { useEffect, useState } from 'react';
import { useGameStore } from '../store/useGameStore';

export const StarShip = () => {
  const [texture, setTexture] = useState<Texture | null>(null);
  const { altitude, downRangeDistance, pitch } = useGameStore();

  useEffect(() => {
    const loadTexture = async () => {
      const loadedTexture = await Assets.load('assets/images/Starship.webp');
      setTexture(loadedTexture);
    };
    loadTexture();
  }, []);

  if (!texture) {
    return null;
  }

  // Basic coordinate mapping for now. This will need to be improved later
  // with a proper camera system.
  const x = window.innerWidth / 2;
  const y = window.innerHeight / 2;

  return (
    <Sprite
      texture={texture}
      anchor={0.5}
      x={x}
      y={y}
      rotation={pitch}
    />
  );
};
