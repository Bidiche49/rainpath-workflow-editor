// Point every Prisma client created during the test run at a dedicated SQLite
// file, isolated from the dev database. Runs in each worker BEFORE any module
// (and therefore before PrismaClient) is instantiated.
process.env.DATABASE_URL = 'file:./test.db';
