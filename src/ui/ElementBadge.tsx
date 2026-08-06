import { ELEMENT_META, affinityBetween, type Element } from '../engine/elements';
import { ElementIcon } from './ElementIcon';

/** A single element chip — symbol + label, tinted by the element's own color. */
export function ElementBadge({ element, compact = false }: { element?: Element; compact?: boolean }) {
  if (!element) return null;
  const meta = ELEMENT_META[element];
  return (
    <span
      className="element-badge"
      style={{ color: meta.color, borderColor: `${meta.color}55`, background: `${meta.color}14` }}
      title={meta.label}
    >
      <ElementIcon element={element} size={compact ? 12 : 14} />
      {!compact && <span>{meta.label}</span>}
    </span>
  );
}

/**
 * Reads out the live matchup between the hero and the current monster. This is the one place
 * the elemental wheel is explained to the player during a fight, so it names the consequence
 * ("you hit harder") rather than the rule.
 */
export function AffinityCallout({ attacker, defender }: { attacker?: Element; defender?: Element }) {
  const affinity = affinityBetween(attacker, defender);
  if (affinity === 'neutral') return null;
  const strong = affinity === 'strong';
  return (
    <span className={`affinity-callout ${strong ? 'affinity-strong' : 'affinity-weak'}`}>
      {strong ? '▲ Advantage' : '▼ Resisted'}
    </span>
  );
}
