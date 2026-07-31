export interface MonsterDefinition {
  id: string;
  name: string;
  maxHp: number;
  attack: number;
  attackIntervalMs: number;
  spriteKey?: string;
}
