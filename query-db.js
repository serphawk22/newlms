require('dotenv').config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const materials = await prisma.readingMaterial.findMany({
    include: { file: true }
  });
  console.log("Reading Materials:");
  console.log(JSON.stringify(materials, null, 2));

  const files = await prisma.uploadedFile.findMany();
  console.log("Uploaded Files:");
  console.log(JSON.stringify(files, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
