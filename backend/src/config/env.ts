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
  // Lista separada por comas de orígenes permitidos. Debe incluir tanto el panel admin
  // (Angular) como el player (se sirve en su propio origen, ej. http://localhost:5500,
  // y llama a esta API directamente desde el navegador/Electron del dispositivo).
  CORS_ORIGIN: z.string().default("http://localhost:4200,http://localhost:5500"),
});

const rawEnv = envSchema.parse(process.env);

export const env = {
  ...rawEnv,
  CORS_ORIGINS: rawEnv.CORS_ORIGIN.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
};
