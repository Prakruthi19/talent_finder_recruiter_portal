import { tenantRepository, TenantListParams } from "../repositories/tenant.repository";
import { ConflictError, NotFoundError } from "../lib/errors";

export const tenantService = {
  list(params: TenantListParams) {
    return tenantRepository.findMany(params);
  },

  async getById(id: string) {
    const tenant = await tenantRepository.findById(id);
    if (!tenant) throw new NotFoundError("Tenant");
    return tenant;
  },

  async create(data: { name: string }) {
    const existing = await tenantRepository.findByName(data.name);
    if (existing) throw new ConflictError(`Tenant "${data.name}" already exists`);
    return tenantRepository.create(data);
  },
};
