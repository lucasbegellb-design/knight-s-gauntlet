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
  | { type: 'combatEnd'; winnerId: string | null }
  | { type: 'critHit'; targetId: string }
  | { type: 'statusProc'; kind: 'burn'; targetId: string; damage: number }
  | { type: 'lifesteal'; healerId: string; amount: number }
  | { type: 'execute'; targetId: string }
  | { type: 'reflect'; damagedId: string; damage: number };

export interface CombatState {
  hero: Combatant;
  monster: Combatant;
  elapsedMs: number;
  isOver: boolean;
  winnerId: string | null;
}
