import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.role.createMany({
    data: [
      { id: 1, name: "SuperAdmin" },
      { id: 2, name: "OrgAdmin" },
      { id: 3, name: "LocationAdmin" },
      { id: 4, name: "Viewer" },
    ],
    skipDuplicates: true,
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
