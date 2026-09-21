import { tenantRepository, TenantListParams } from "../repositories/tenant.repository";
import { ConflictError, NotFoundError } from "../lib/errors";

export const tenantService = {
  list(userId: string, params: TenantListParams) {
    return tenantRepository.findManyForUser(userId, params);
  },

  async getById(id: string) {
    const tenant = await tenantRepository.findById(id);
    if (!tenant) throw new NotFoundError("Tenant");
    return tenant;
  },

  async create(userId: string, data: { name: string }) {
    const existing = await tenantRepository.findByName(data.name);
    if (existing) throw new ConflictError(`Tenant "${data.name}" already exists`);
    return tenantRepository.createWithAdmin(userId, data.name);
  },

  async summary(userId: string) {
    const [total, activeCount] = await Promise.all([
      tenantRepository.countForUser(userId),
      tenantRepository.countActiveForUser(userId),
    ]);
    return { total, activeCount };
  },
};
