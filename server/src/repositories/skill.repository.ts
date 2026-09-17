import { prisma } from "../lib/prisma";

function normalize(name: string): string {
  return name.trim().toLowerCase();
}

export const skillRepository = {
  /**
   * Skills are shared, case-insensitive, global entities. Given a list of
   * raw skill names, returns the Skill rows for them, creating any that
   * don't exist yet. Duplicate/blank input names collapse to one skill.
   */
  async findOrCreateMany(names: string[]) {
    const unique = Array.from(new Set(names.map(normalize).filter(Boolean)));
    if (unique.length === 0) return [];

    const existing = await prisma.skill.findMany({
      where: { name: { in: unique } },
    });
    const existingNames = new Set(existing.map((s) => s.name));
    const toCreate = unique.filter((name) => !existingNames.has(name));

    if (toCreate.length > 0) {
      await prisma.skill.createMany({
        data: toCreate.map((name) => ({ name })),
        skipDuplicates: true,
      });
    }

    return prisma.skill.findMany({ where: { name: { in: unique } } });
  },

  async findAllNames(): Promise<string[]> {
    const skills = await prisma.skill.findMany({ select: { name: true } });
    return skills.map((s) => s.name);
  },
};
