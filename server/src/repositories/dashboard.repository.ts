import { prisma } from "../lib/prisma";

export interface SkillGap {
  skill: string;
  /** Open job orders that require the skill. */
  demand: number;
  /** Candidates in the tenant who have it. */
  supply: number;
}

export interface RoleNeedingAttention {
  id: string;
  title: string;
  openings: number;
  /** Candidates sharing at least one required skill with the role. */
  candidates: number;
  shortlisted: number;
}

// All of these are raw SQL on purpose (like the matching query): they group and
// join across tables in the database instead of looping in Node. They lean on
// the skillId indexes on candidate_skills / job_order_required_skills.
export const dashboardRepository = {
  /** Skills that open roles need, scarcest first (fewest candidates per open role). */
  skillGaps(tenantId: string, limit = 8): Promise<SkillGap[]> {
    return prisma.$queryRaw<SkillGap[]>`
      WITH demand AS (
        SELECT r."skillId", COUNT(DISTINCT jo.id) AS demand
        FROM job_order_required_skills r
        JOIN job_orders jo ON jo.id = r."jobOrderId"
        WHERE jo."tenantId" = ${tenantId}::uuid AND jo.status = 'OPEN'
        GROUP BY r."skillId"
      ),
      supply AS (
        SELECT cs."skillId", COUNT(DISTINCT cs."candidateId") AS supply
        FROM candidate_skills cs
        JOIN candidates c ON c.id = cs."candidateId"
        WHERE c."tenantId" = ${tenantId}::uuid
        GROUP BY cs."skillId"
      )
      SELECT s.name AS skill, d.demand::int AS demand, COALESCE(sp.supply, 0)::int AS supply
      FROM demand d
      JOIN skills s ON s.id = d."skillId"
      LEFT JOIN supply sp ON sp."skillId" = d."skillId"
      ORDER BY COALESCE(sp.supply, 0)::float / d.demand ASC, d.demand DESC, s.name
      LIMIT ${limit}
    `;
  },

  /** Open roles with the fewest candidates who share any required skill. */
  rolesNeedingAttention(tenantId: string, limit = 5): Promise<RoleNeedingAttention[]> {
    return prisma.$queryRaw<RoleNeedingAttention[]>`
      SELECT jo.id, jo.title, jo."numberOfOpenings"::int AS openings,
             COUNT(DISTINCT c.id)::int AS candidates,
             (SELECT COUNT(*) FROM submissions sub WHERE sub."jobOrderId" = jo.id)::int AS shortlisted
      FROM job_orders jo
      LEFT JOIN job_order_required_skills r ON r."jobOrderId" = jo.id
      LEFT JOIN candidate_skills cs ON cs."skillId" = r."skillId"
      LEFT JOIN candidates c ON c.id = cs."candidateId" AND c."tenantId" = jo."tenantId"
      WHERE jo."tenantId" = ${tenantId}::uuid AND jo.status = 'OPEN'
      GROUP BY jo.id
      ORDER BY candidates ASC, jo.title
      LIMIT ${limit}
    `;
  },

  async submissionsByStatus(tenantId: string) {
    const rows = await prisma.submission.groupBy({ by: ["status"], where: { tenantId }, _count: { _all: true } });
    return rows.map((r) => ({ status: r.status, count: r._count._all }));
  },

  async openOpenings(tenantId: string): Promise<number> {
    const result = await prisma.jobOrder.aggregate({
      where: { tenantId, status: "OPEN" },
      _sum: { numberOfOpenings: true },
    });
    return result._sum.numberOfOpenings ?? 0;
  },
};
