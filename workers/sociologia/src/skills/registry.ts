import type { Env } from "../types";
import type { DocumentoRecuperado } from "../types";

export interface SkillInput {
  query: string;
  context?: DocumentoRecuperado[];
  depth?: "shallow" | "standard" | "deep";
  outputFormat?: "prose" | "structured";
  frameworks?: string[];
}

export interface SkillEntities {
  theorists: string[];
  institutions: string[];
  concepts: string[];
}

export interface SkillOutput {
  analysis: string;
  frameworks_identified: string[];
  key_concepts: string[];
  citations: string[];
  entities: SkillEntities;
  confidence: number;
  grounding_ratio: number;
  uncertainty_flags: string[];
}

export interface Skill {
  readonly name: string;
  execute(input: SkillInput, env: Env): Promise<SkillOutput>;
}

export class SkillRegistry {
  private skills = new Map<string, Skill>();

  register(skill: Skill): void {
    this.skills.set(skill.name, skill);
  }

  async execute(name: string, input: SkillInput, env: Env): Promise<SkillOutput> {
    const skill = this.skills.get(name);
    if (!skill) {
      throw new Error(
        `Skill '${name}' no encontrada. Disponibles: ${[...this.skills.keys()].join(", ")}`
      );
    }
    return skill.execute(input, env);
  }

  has(name: string): boolean {
    return this.skills.has(name);
  }

  list(): string[] {
    return [...this.skills.keys()];
  }
}
