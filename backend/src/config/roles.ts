// Roles seed (ver prisma/seed.ts): 1=SuperAdmin, 2=OrgAdmin, 3=LocationAdmin, 4=Viewer.
// Mismos valores que ROLE en frontend/src/app/core/models/models.ts.
export const ROLE = {
  SuperAdmin: 1,
  OrgAdmin: 2,
  LocationAdmin: 3,
  Viewer: 4,
} as const;
