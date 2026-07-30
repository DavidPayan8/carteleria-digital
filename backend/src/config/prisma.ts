import { PrismaMssql } from "@prisma/adapter-mssql";
import { PrismaClient } from "../generated/prisma/client.js";
import { env } from "./env.js";

const adapter = new PrismaMssql(env.DATABASE_URL);

export const prisma = new PrismaClient({ adapter });
