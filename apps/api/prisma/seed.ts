import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Database seed.
 *
 * Skeleton only — populated in A-03 with demo workflows, fictitious patients
 * and coherent action logs. Kept idempotent (db:reset wipes then re-seeds).
 */
async function main(): Promise<void> {
  // Seeding logic added in A-03.
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
