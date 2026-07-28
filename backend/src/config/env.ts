import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().default(4000),
  JWT_SECRET: z.string().min(1),
  JWT_EXPIRES_IN: z.string().default("8h"),
  SCREEN_TOKEN_SECRET: z.string().min(1),
  AZURE_STORAGE_CONNECTION_STRING: z.string().min(1),
  AZURE_STORAGE_CONTAINER: z.string().default("media"),
  SAS_URL_EXPIRY_MINUTES: z.coerce.number().default(60),
});

export const env = envSchema.parse(process.env);
