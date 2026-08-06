import { useMetaStore, MAX_ECHO_LADDER_ENTRIES } from '../store/metaStore';
import { ELEMENT_META } from '../engine/elements';
import { GeneratedPortrait } from './RarityIcon';
import { ElementBadge } from './ElementBadge';
import type { EchoRecord } from '../engine/WaveManager';

/** Reads a recorded build's shape off its ratios, so a row says what the build *was*, not just when. */
function describeBuild(record: EchoRecord): string {
  const traits: string[] = [];
  if (record.attackRatio >= 1.35) traits.push('heavy hitter');
  else if (record.attackRatio <= 0.8) traits.push('low damage');
  if (record.hpRatio >= 1.25) traits.push('very durable');
  else if (record.hpRatio <= 0.8) traits.push('fragile');
  if (record.critChance >= 0.25) traits.push('crit-built');
  if (record.lifestealPercent >= 0.12) traits.push('sustained by lifesteal');
  if (record.attackIntervalMs <= 700) traits.push('fast');

  // A build with no standout ratio is genuinely unremarkable, and saying so is more useful than
  // padding the row with numbers the player already sees above it.
  return traits.length > 0 ? traits.join(' · ') : 'nothing unusual — it just held on';
}

function EchoRow({ record, rank }: { record: EchoRecord; rank: number }) {
  const accent = record.element ? ELEMENT_META[record.element].color : '#b39dff';

  return (
    <div className="echo-row" style={{ borderLeftColor: accent }}>
      <span className="echo-rank">#{rank}</span>
      <GeneratedPortrait category="hero" id={record.classId} size={40} />
      <div className="echo-row-body">
        <div className="hub-item-name">
          {record.className} <ElementBadge element={record.element} compact />
          <span className="echo-wave">wave {record.wave}</span>
        </div>
        <div className="hub-item-description">
          Level {record.level} · ATK ×{record.attackRatio.toFixed(2)} · HP ×{record.hpRatio.toFixed(2)}
        </div>
        <div className="hub-item-flavor">{describeBuild(record)}</div>
      </div>
    </div>
  );
}

/**
 * The Hall of Echoes.
 *
 * The ladder was persisted and fully wired into combat, but nothing ever showed it to the player —
 * a system whose entire payoff is recognising a past run of your own is worthless if you can never
 * look at the list. This is that list: every build that has beaten an Echo, newest first, each one
 * eligible to come back as an opponent past wave 30.
 *
 * Deliberately read-only. There is no reason to let the player curate which of their own ghosts
 * they face; being unable to delete the embarrassing ones is most of the point.
 */
export function EchoesTab() {
  const echoLadder = useMetaStore((s) => s.echoLadder);

  return (
    <div className="hub-panel-grid hub-panel-grid-single">
      <div className="hub-card">
        <div className="hub-card-title">Hall of Echoes</div>
        <div className="hub-item-description">
          Every fifteen waves the Gauntlet fights you with yourself. Beat that fight and the build that won it is
          filed here — and past wave 30 it can come back as the Echo instead of your current build. The Gauntlet
          keeps everything that walks through it. Nobody ever switched the archive off.
        </div>

        {echoLadder.length === 0 ? (
          <div className="echo-empty">
            No Echoes recorded yet. Survive a wave-15 mirror match and the build that did it lands here.
          </div>
        ) : (
          <>
            <div className="hub-item-description echo-count">
              {echoLadder.length}/{MAX_ECHO_LADDER_ENTRIES} recorded — the oldest is dropped when a new one lands.
            </div>
            {echoLadder.map((record, index) => (
              <EchoRow key={`${record.classId}-${record.wave}-${index}`} record={record} rank={index + 1} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
