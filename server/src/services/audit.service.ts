import { auditRepository, AuditEntry } from "../repositories/audit.repository";
import { logError } from "../lib/safeLog";
import type { PageParams } from "../repositories/pagination";

// A path with the ids replaced by :id is the action key, so the same kind of
// action is always recorded the same way whichever record it touched.
const UUID = /\b[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\b/gi;
export const normalizePath = (path: string) => path.split("?")[0]!.replace(UUID, ":id");
export const extractEntityId = (path: string) => path.match(UUID)?.[0];

const LABELS: [RegExp, string][] = [
  [/^POST \/api\/auth\/login$/, "Signed in"],
  [/^POST \/api\/candidates$/, "Added a candidate"],
  [/^POST \/api\/candidates\/parse-cv$/, "Read a CV"],
  [/^PATCH \/api\/candidates\/:id$/, "Edited a candidate"],
  [/^DELETE \/api\/candidates\/:id$/, "Deleted a candidate"],
  [/^POST \/api\/job-orders$/, "Created a job order"],
  [/^PATCH \/api\/job-orders\/:id$/, "Edited a job order"],
  [/^DELETE \/api\/job-orders\/:id$/, "Deleted a job order"],
  [/^POST \/api\/job-orders\/:id\/shortlist$/, "Shortlisted a candidate"],
  [/^POST \/api\/job-orders\/:id\/insight$/, "Generated an AI insight"],
  [/^POST \/api\/tenants$/, "Created a tenant"],
  [/^POST \/api\/ai\//, "Used an AI assistant"],
];

/** "POST /api/candidates" -> "Added a candidate"; anything unrecognised is shown as-is. */
export function describeAction(action: string): string {
  return LABELS.find(([pattern]) => pattern.test(action))?.[1] ?? action;
}

export const auditService = {
  /**
   * Best-effort by design: an audit-write failure is logged but never turns a
   * request that already succeeded into an error.
   */
  async record(entry: AuditEntry): Promise<void> {
    try {
      await auditRepository.create(entry);
    } catch (err) {
      logError("audit-write", err);
    }
  },

  async list(tenantId: string, params: PageParams) {
    const page = await auditRepository.findMany(tenantId, params);
    return {
      ...page,
      items: page.items.map((row) => ({
        id: row.id,
        createdAt: row.createdAt,
        user: row.user ? { name: row.user.name, email: row.user.email } : null,
        description: describeAction(row.action),
        action: row.action,
        entityId: row.entityId,
      })),
    };
  },
};
