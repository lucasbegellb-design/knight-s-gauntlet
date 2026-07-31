import type { Rarity } from '../data/rarity';

/** Renders the generated rarity gem icon; silently hides itself if the asset hasn't been generated yet. */
export function RarityIcon({ rarity, size = 18 }: { rarity: Rarity; size?: number }) {
  return (
    <img
      src={`/game-assets/icons/rarity_${rarity}.png`}
      width={size}
      height={size}
      alt=""
      className="rarity-icon"
      onError={(e) => {
        e.currentTarget.style.display = 'none';
      }}
    />
  );
}

/** Renders a generated portrait (monster/hero); silently hides itself if the asset hasn't been generated yet. */
export function GeneratedPortrait({ category, id, size = 40 }: { category: string; id: string; size?: number }) {
  return (
    <img
      src={`/game-assets/${category}/${id}.png`}
      width={size}
      height={size}
      alt=""
      className="generated-portrait"
      onError={(e) => {
        e.currentTarget.style.display = 'none';
      }}
    />
  );
}
