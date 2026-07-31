export interface Identifiable {
  id: string;
}

export class Registry<T extends Identifiable> {
  private readonly entries = new Map<string, T>();

  register(def: T): void {
    if (this.entries.has(def.id)) {
      throw new Error(`Duplicate registry id: ${def.id}`);
    }
    this.entries.set(def.id, def);
  }

  registerAll(defs: T[]): void {
    defs.forEach((def) => this.register(def));
  }

  get(id: string): T {
    const found = this.entries.get(id);
    if (!found) {
      throw new Error(`Unknown id: ${id}`);
    }
    return found;
  }

  tryGet(id: string): T | undefined {
    return this.entries.get(id);
  }

  all(): T[] {
    return [...this.entries.values()];
  }
}
