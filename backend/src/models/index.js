import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Example model placeholder - extend as needed
export const User = {
  findMany: () => prisma.user.findMany(),
  findById: (id) => prisma.user.findUnique({ where: { id } }),
  create: (data) => prisma.user.create({ data }),
};

export default prisma;
