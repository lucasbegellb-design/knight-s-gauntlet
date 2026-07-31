export interface Combatant {
  id: string;
  name: string;
  maxHp: number;
  hp: number;
  attack: number;
  attackIntervalMs: number;
  nextAttackAt: number;
}

export type CombatEvent =
  | { type: 'attack'; attackerId: string; targetId: string; damage: number; targetHpAfter: number }
  | { type: 'death'; combatantId: string }
  | { type: 'combatEnd'; winnerId: string | null };

export interface CombatState {
  hero: Combatant;
  monster: Combatant;
  elapsedMs: number;
  isOver: boolean;
  winnerId: string | null;
}
