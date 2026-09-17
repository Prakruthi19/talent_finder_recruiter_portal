import { z } from "zod";
import { paginationQuerySchema } from "./common.schema";

export const tenantListQuerySchema = paginationQuerySchema;

export const createTenantSchema = z.object({
  name: z.string().trim().min(1, "Tenant name is required").max(120),
});
