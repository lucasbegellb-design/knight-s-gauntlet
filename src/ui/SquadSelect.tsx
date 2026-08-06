import { allCompanions } from '../data/companions';
import { classRegistry } from '../data/classes';
import { useMetaStore } from '../store/metaStore';
import { MAX_ACTIVE_COMPANIONS } from '../engine/WaveManager';
import { ELEMENT_META, counteredBy, counters, type Element } from '../engine/elements';
import { GeneratedPortrait } from './RarityIcon';
import { ElementBadge } from './ElementBadge';
import type { CompanionDefinition } from '../data/companion.types';
import type { RelicModifier } from '../data/relic.types';

const ROLE_ICON: Record<string, string> = {
  tank: '🛡',
  dps: '⚔',
  healer: '✚',
  support: '⚑',
  summoner: '✧',
};

/** Human-readable one-liner for a leader skill's modifier list, so the card explains itself. */
const MODIFIER_LABEL: Record<string, string> = {
  damageMultiplier: 'DMG',
  flatDamageBonus: 'flat DMG',
  critChance: 'crit',
  critDamageMultiplier: 'crit DMG',
  burnChance: 'burn',
  burnDamageMultiplier: 'burn DMG',
  critBurnBonusMultiplier: 'crit-burn',
  lifestealPercent: 'lifesteal',
  executeThreshold: 'execute',
  reflectDamagePercent: 'reflect',
  attackSpeedMultiplier: 'speed',
  maxHpBonusPercent: 'HP',
  goldMultiplier: 'gold',
  xpMultiplier: 'XP',
  regenPerWave: 'regen',
};

function formatModifiers(modifiers: RelicModifier[]): string {
  return modifiers.map((m) => `+${Math.round(m.value * 100)}% ${MODIFIER_LABEL[m.kind] ?? m.kind}`).join(' · ');
}

function CompanionCard({
  def,
  index,
  onToggle,
  onPromote,
}: {
  def: CompanionDefinition;
  index: number;
  onToggle: () => void;
  onPromote: () => void;
}) {
  const selected = index >= 0;
  const isLeader = index === 0;
  const meta = ELEMENT_META[def.element];

  return (
    <div
      className={`squad-card ${selected ? 'squad-card-selected' : ''} ${isLeader ? 'squad-card-leader' : ''}`}
      style={{ '--squad-accent': meta.color } as React.CSSProperties}
    >
      <button type="button" className="squad-card-body" onClick={onToggle}>
        {isLeader && <span className="squad-leader-crown">★ LEADER</span>}
        {selected && !isLeader && <span className="squad-slot-index">{index + 1}</span>}

        <GeneratedPortrait category="companions_illustration" id={def.id} size={84} />

        <div className="squad-card-name">
          {ROLE_ICON[def.role] ?? '•'} {def.name}
        </div>
        <div className="squad-card-meta">
          <span className={`rarity-${def.rarity}`}>{def.rarity}</span>
          <ElementBadge element={def.element} compact />
        </div>
        <div className="squad-card-stats">
          {def.maxHp} HP · {def.attack} ATK · {(def.attackIntervalMs / 1000).toFixed(1)}s
        </div>

        {def.leaderSkill && (
          <div className={`squad-leader-skill ${isLeader ? 'squad-leader-skill-active' : ''}`}>
            <div className="squad-leader-skill-name">★ {def.leaderSkill.name}</div>
            <div className="squad-leader-skill-values">{formatModifiers(def.leaderSkill.modifiers)}</div>
            <div className="squad-leader-skill-flavor">{def.leaderSkill.description}</div>
          </div>
        )}
      </button>

      {selected && !isLeader && def.leaderSkill && (
        <button type="button" className="squad-promote-button" onClick={onPromote}>
          Make leader
        </button>
      )}
    </div>
  );
}

/**
 * The one piece of elemental advice worth giving, at the squad level rather than per card.
 *
 * An earlier version warned on each companion whose element was merely *neutral* against the
 * hero's, which is the overwhelmingly common case — so it fired on almost every card and told the
 * player nothing. What actually matters is a single question: the element that counters your class
 * will show up in the zones, so does anyone in this squad answer it?
 */
function CoverageNote({ heroElement, squad }: { heroElement: Element; squad: Element[] }) {
  const threat = counteredBy(heroElement);
  const covered = squad.some((element) => counters(element) === threat);
  const threatMeta = ELEMENT_META[threat];

  return (
    <div className={`squad-coverage ${covered ? 'squad-coverage-ok' : 'squad-coverage-warn'}`}>
      <span style={{ color: threatMeta.color }}>
        {threatMeta.symbol} {threatMeta.label}
      </span>{' '}
      enemies counter your class.{' '}
      {covered ? 'Your squad has an answer to them.' : 'Nobody in this squad answers them — you will take that matchup alone.'}
    </div>
  );
}

/**
 * Squad selection — the Brave Frontier lesson applied: the collection only matters if composing
 * it is the decision the run is built around. Picking fewer than the maximum is a real choice,
 * not a mistake: empty roster slots keep companion loot options in rotation, trading guaranteed
 * synergy for mid-run discovery.
 */
export function SquadSelect() {
  const selectedClassId = useMetaStore((s) => s.selectedClassId);
  const unlockedCompanionIds = useMetaStore((s) => s.unlockedCompanionIds);
  const selectedCompanionIds = useMetaStore((s) => s.selectedCompanionIds);
  const toggleSquadCompanion = useMetaStore((s) => s.toggleSquadCompanion);
  const promoteSquadLeader = useMetaStore((s) => s.promoteSquadLeader);
  const confirmSquad = useMetaStore((s) => s.confirmSquad);
  const setScreen = useMetaStore((s) => s.setScreen);

  const classDef = classRegistry.tryGet(selectedClassId ?? '');
  const unlocked = new Set(unlockedCompanionIds);
  const roster = allCompanions.filter((c) => unlocked.has(c.id));
  const squadDefs = selectedCompanionIds.map((id) => allCompanions.find((c) => c.id === id)).filter((c): c is CompanionDefinition => !!c);
  const leaderDef = squadDefs[0];

  return (
    <div className="hub">
      <div className="hud-row">
        <h2 className="hub-title">Assemble Your Squad</h2>
        <button type="button" className="restart-button restart-button-ghost" onClick={() => setScreen('classSelect')}>
          ← Change class
        </button>
      </div>

      <p className="class-select-intro">
        Up to {MAX_ACTIVE_COMPANIONS} companions. The first one you pick <strong>leads</strong> — its Leader Skill
        applies to the whole party for as long as it stays standing. Leave slots empty to keep finding companions as
        loot instead.
      </p>

      <div className="squad-summary">
        <span>
          Class: <strong>{classDef?.name ?? '—'}</strong>
        </span>
        <ElementBadge element={classDef?.element} />
        <span className="squad-summary-divider" />
        <span>
          Squad: <strong>{selectedCompanionIds.length}</strong>/{MAX_ACTIVE_COMPANIONS}
        </span>
        {leaderDef?.leaderSkill ? (
          <span className="squad-summary-leader">
            ★ {leaderDef.leaderSkill.name} — {formatModifiers(leaderDef.leaderSkill.modifiers)}
          </span>
        ) : (
          <span className="squad-summary-leader squad-summary-leader-empty">No leader — no Leader Skill this run</span>
        )}
      </div>

      {classDef && <CoverageNote heroElement={classDef.element} squad={squadDefs.map((def) => def.element)} />}

      <div className="squad-grid">
        {roster.map((def) => (
          <CompanionCard
            key={def.id}
            def={def}
            index={selectedCompanionIds.indexOf(def.id)}
            onToggle={() => toggleSquadCompanion(def.id)}
            onPromote={() => promoteSquadLeader(def.id)}
          />
        ))}
      </div>

      <div className="squad-actions">
        <button type="button" className="restart-button" onClick={confirmSquad}>
          {selectedCompanionIds.length === 0 ? 'Enter the Gauntlet alone →' : `Enter the Gauntlet (${selectedCompanionIds.length}) →`}
        </button>
      </div>
    </div>
  );
}
