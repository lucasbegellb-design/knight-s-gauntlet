import { useEffect, useState } from 'react';
import { useMetaStore } from '../store/metaStore';
import { pendingIdleEssence, IDLE_ESSENCE_PER_HOUR, IDLE_ESSENCE_CAP, IDLE_ESSENCE_CAP_HOURS } from '../engine/idleEssence';

/** Live-ticking display of essence accrued passively since the last visit — the actual deposit only happens on collect, this just re-renders the preview every second. */
export function IdleEssenceBanner() {
  const lastEssenceCollectionAt = useMetaStore((s) => s.lastEssenceCollectionAt);
  const collectIdleEssence = useMetaStore((s) => s.collectIdleEssence);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const pending = pendingIdleEssence(lastEssenceCollectionAt, now);
  const atCap = pending >= IDLE_ESSENCE_CAP;

  return (
    <div className="hud-row idle-essence-banner">
      <span className="idle-essence-icon">⏳</span>
      <div className="idle-essence-info">
        <div className="idle-essence-amount">
          {pending > 0 ? `🪙 ${pending} essence waiting` : 'Idle essence accrues while you camp'}
        </div>
        <div className="idle-essence-rate">
          +{IDLE_ESSENCE_PER_HOUR}/hour · caps at {IDLE_ESSENCE_CAP} ({IDLE_ESSENCE_CAP_HOURS}h)
          {atCap && ' — full!'}
        </div>
      </div>
      <button type="button" className="hub-buy-button idle-essence-collect" disabled={pending <= 0} onClick={() => collectIdleEssence()}>
        Collect
      </button>
    </div>
  );
}
