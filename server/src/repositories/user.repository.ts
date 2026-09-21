import { prisma } from "../lib/prisma";

export const userRepository = {
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  count() {
    return prisma.user.count();
  },

  create(data: { email: string; name: string; passwordHash: string }) {
    return prisma.user.create({ data });
  },
};
