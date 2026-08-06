import { useEffect, useRef, useState } from 'react';

/**
 * Phaser is by far the largest dependency in the bundle — large enough that Vite warns about the
 * chunk — and none of it is needed to render the Camp, class select, squad select or the gacha
 * screens, which is where a session starts and where a lot of it is spent. Importing it (and the
 * scene that pulls in every data registry behind it) only when a run actually mounts keeps the
 * initial load to the React shell, and the import is cached for every later run in the session.
 */
export function PhaserGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<{ destroy: (removeCanvas: boolean) => void } | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (gameRef.current) return; // guard against React StrictMode's double-invoke
    if (!containerRef.current) return;

    let cancelled = false;
    const container = containerRef.current;

    void (async () => {
      try {
        const [{ default: Phaser }, { CombatScene }] = await Promise.all([
          import('phaser'),
          import('../scenes/CombatScene'),
        ]);
        // The effect can be torn down while the dynamic import is in flight; without this the
        // game would be constructed into a container React has already unmounted.
        if (cancelled) return;

        gameRef.current = new Phaser.Game({
          type: Phaser.AUTO,
          width: 800,
          height: 450,
          parent: container,
          backgroundColor: '#1d1d1d',
          scene: [CombatScene],
        });
      } catch {
        if (!cancelled) setLoadFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div ref={containerRef} data-testid="phaser-container" className="phaser-container">
      {loadFailed && <div className="phaser-load-error">Could not load the combat renderer. Reload the page to try again.</div>}
    </div>
  );
}
