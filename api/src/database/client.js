import { PrismaClient } from '@prisma/client';

let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    log: ['error', 'warn'],
  });
} else {
  if (!global.__db) {
    global.__db = new PrismaClient({
      log: ['query', 'error', 'warn'],
    });
  }
  prisma = global.__db;
}

export { prisma };
export default prisma;