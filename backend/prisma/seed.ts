import { prisma } from "../src/config/prisma.js";
import { ROLE } from "../src/config/roles.js";
import { hashPassword } from "../src/utils/password.js";

const TEST_ORG_SLUG = "demo";
const TEST_USER_EMAIL = "admin@demo.local";
const TEST_USER_PASSWORD = "Demo1234!";

const SUPERADMIN_EMAIL = "superadmin@demo.local";
const SUPERADMIN_PASSWORD = "SuperAdmin1234!";

async function main() {
  const roles = [
    { id: ROLE.SuperAdmin, name: "SuperAdmin" },
    { id: ROLE.OrgAdmin, name: "OrgAdmin" },
    { id: ROLE.LocationAdmin, name: "LocationAdmin" },
    { id: ROLE.Viewer, name: "Viewer" },
  ];
  for (const role of roles) {
    await prisma.role.upsert({ where: { id: role.id }, update: {}, create: role });
  }

  const organization = await prisma.organization.upsert({
    where: { slug: TEST_ORG_SLUG },
    update: {},
    create: { name: "Organización de Pruebas", slug: TEST_ORG_SLUG },
  });

  const location =
    (await prisma.location.findFirst({ where: { organizationId: organization.id } })) ??
    (await prisma.location.create({
      data: { organizationId: organization.id, name: "Restaurante Demo" },
    }));

  const passwordHash = await hashPassword(TEST_USER_PASSWORD);
  const user = await prisma.user.upsert({
    where: { email: TEST_USER_EMAIL },
    update: { passwordHash },
    create: {
      organizationId: organization.id,
      email: TEST_USER_EMAIL,
      passwordHash,
      fullName: "Admin de Pruebas",
    },
  });

  const existingRole = await prisma.userRole.findFirst({
    where: { userId: user.id, roleId: ROLE.OrgAdmin, locationId: null },
  });
  if (!existingRole) {
    await prisma.userRole.create({
      data: { userId: user.id, roleId: ROLE.OrgAdmin, locationId: null }, // OrgAdmin de la organización demo
    });
  }

  const superAdminPasswordHash = await hashPassword(SUPERADMIN_PASSWORD);
  const superAdmin = await prisma.user.upsert({
    where: { email: SUPERADMIN_EMAIL },
    update: { passwordHash: superAdminPasswordHash },
    create: {
      organizationId: null, // SuperAdmin: acceso global, no pertenece a ninguna organización
      email: SUPERADMIN_EMAIL,
      passwordHash: superAdminPasswordHash,
      fullName: "Super Admin de Pruebas",
    },
  });

  const existingSuperAdminRole = await prisma.userRole.findFirst({
    where: { userId: superAdmin.id, roleId: ROLE.SuperAdmin, locationId: null },
  });
  if (!existingSuperAdminRole) {
    await prisma.userRole.create({
      data: { userId: superAdmin.id, roleId: ROLE.SuperAdmin, locationId: null },
    });
  }

  console.log("Usuario de pruebas (OrgAdmin, organización:", organization.name, "/ restaurante:", location.name, "):");
  console.log(`  email:    ${TEST_USER_EMAIL}`);
  console.log(`  password: ${TEST_USER_PASSWORD}`);
  console.log("Usuario de pruebas (SuperAdmin, acceso global):");
  console.log(`  email:    ${SUPERADMIN_EMAIL}`);
  console.log(`  password: ${SUPERADMIN_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
