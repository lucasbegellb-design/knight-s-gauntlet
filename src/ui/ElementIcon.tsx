import type { Element } from '../engine/elements';

/**
 * Inline SVG glyphs for the six elements.
 *
 * These replace the emoji the badges shipped with. Emoji were the fast option and they were wrong
 * for the job: they render from whatever font the platform happens to substitute, so the same badge
 * looked different on every machine — and the two non-pictographic ones (✦ Light, ☾ Dark) fell back
 * to unrelated glyphs entirely on a stock Linux Chromium, which is how the bug was spotted.
 *
 * Hand-drawn paths are the right tool at this size. AI-generated art would be strictly worse for a
 * 16px monochrome mark, and these cost nothing to ship: they inherit `currentColor`, so the same
 * component tints itself for a HUD badge, a loot card or a Grimoire row without any variants.
 */
const PATHS: Record<Element, string> = {
  // A flame with an inner curl.
  fire: 'M12 2c1.5 3.2.4 5-1.2 6.7C9 10.6 7 12.3 7 15a5 5 0 0 0 10 0c0-1.6-.6-3-1.6-4.3.1 1.5-.5 2.6-1.6 3 .8-2.3.2-4.6-1.8-6.4C13.6 5.6 13.4 3.8 12 2Z',
  // A droplet.
  water: 'M12 2.5c3.4 4 6.5 7.4 6.5 11a6.5 6.5 0 0 1-13 0c0-3.6 3.1-7 6.5-11Z',
  // A sprouting leaf pair over a stem.
  earth: 'M12 21v-7m0 0c0-3.6-2.7-6.5-6.5-7 0 3.9 2.6 6.6 6.5 7Zm0 0c0-4.4 2.9-7.6 6.9-8.2.2 4.6-2.8 7.8-6.9 8.2Z',
  // A lightning bolt.
  thunder: 'M13.5 2 5 13.2h5.4L9.8 22l8.7-11.6h-5.6L13.5 2Z',
  // A four-point star with long axes — reads as a spark rather than a generic asterisk.
  light: 'M12 1.5c.9 5.2 3.4 7.7 8.5 8.5-5.1.9-7.6 3.4-8.5 8.5-.9-5.1-3.4-7.6-8.5-8.5 5.1-.8 7.6-3.3 8.5-8.5Z',
  // A crescent, opening away from the light glyph so the pair reads as opposites.
  dark: 'M17.4 15.6A8 8 0 0 1 8.4 4.2a8.5 8.5 0 1 0 9 11.4Z',
};

/** Paths that read better stroked than filled. */
const STROKED: Partial<Record<Element, boolean>> = { earth: true };

export function ElementIcon({ element, size = 14 }: { element: Element; size?: number }) {
  const stroked = STROKED[element];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <path
        d={PATHS[element]}
        fill={stroked ? 'none' : 'currentColor'}
        stroke={stroked ? 'currentColor' : 'none'}
        strokeWidth={stroked ? 1.8 : 0}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
