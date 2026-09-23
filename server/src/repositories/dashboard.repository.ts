import { Prisma } from "@prisma/client";
import { prisma, scopedQueryRaw } from "../lib/prisma";

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

export interface UnshortlistedPairing {
  jobOrderId: string;
  candidateId: string;
  matchCount: number;
}

export interface WeeklySubmissionCount {
  weekStart: string;
  count: number;
}

// All of these are raw SQL on purpose (like the matching query): they group and
// join across tables in the database instead of looping in Node. They lean on
// the skillId indexes on candidate_skills / job_order_required_skills. They go
// through scopedQueryRaw so row-level security applies to them like any query.
export const dashboardRepository = {
  /** Skills that open roles need, scarcest first (fewest candidates per open role). */
  skillGaps(tenantId: string, limit = 8): Promise<SkillGap[]> {
    return scopedQueryRaw<SkillGap[]>(Prisma.sql`
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
    `);
  },

  /** Open roles with the fewest candidates who share any required skill. */
  rolesNeedingAttention(tenantId: string, limit = 5): Promise<RoleNeedingAttention[]> {
    return scopedQueryRaw<RoleNeedingAttention[]>(Prisma.sql`
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
    `);
  },

  /**
   * The single best candidate/job-order pairing that hasn't been shortlisted yet
   * (highest exact skill-match count, tenant-scoped, open roles only) — same
   * exact-match rule as jobOrder.repository.findMatchCounts, just dashboard-wide
   * instead of scoped to one job order. Feeds the "Recommended next shortlist" card.
   */
  async topUnshortlistedPairing(tenantId: string): Promise<UnshortlistedPairing | null> {
    const rows = await scopedQueryRaw<UnshortlistedPairing[]>(Prisma.sql`
      SELECT jo.id AS "jobOrderId", c.id AS "candidateId", COUNT(DISTINCT r."skillId")::int AS "matchCount"
      FROM job_orders jo
      JOIN job_order_required_skills r ON r."jobOrderId" = jo.id
      JOIN candidate_skills cs ON cs."skillId" = r."skillId"
      JOIN candidates c ON c.id = cs."candidateId" AND c."tenantId" = jo."tenantId"
      WHERE jo."tenantId" = ${tenantId}::uuid AND jo.status = 'OPEN'
        AND NOT EXISTS (
          SELECT 1 FROM submissions s WHERE s."candidateId" = c.id AND s."jobOrderId" = jo.id
        )
      GROUP BY jo.id, c.id, c."experienceYears"
      ORDER BY "matchCount" DESC, c."experienceYears" DESC
      LIMIT 1
    `);
    return rows[0] ?? null;
  },

  /** New submissions per week for the last `weeks` weeks (including weeks with zero). Feeds the dashboard's trend chart. */
  submissionsTrend(tenantId: string, weeks = 8): Promise<WeeklySubmissionCount[]> {
    return scopedQueryRaw<WeeklySubmissionCount[]>(Prisma.sql`
      WITH weeks AS (
        SELECT (date_trunc('week', now()) - (n || ' weeks')::interval)::date AS week_start
        FROM generate_series(${weeks - 1}, 0, -1) AS n
      )
      SELECT w.week_start::text AS "weekStart", COUNT(s.id)::int AS count
      FROM weeks w
      LEFT JOIN submissions s
        ON s."tenantId" = ${tenantId}::uuid
       AND date_trunc('week', s."createdAt")::date = w.week_start
      GROUP BY w.week_start
      ORDER BY w.week_start
    `);
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
