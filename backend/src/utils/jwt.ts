import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface UserTokenPayload {
  userId: string;
  organizationId: string | null;
  roles: { roleId: number; locationId: string | null }[];
}

export const signUserToken = (payload: UserTokenPayload) =>
  jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] });

export const verifyUserToken = (token: string) => jwt.verify(token, env.JWT_SECRET) as UserTokenPayload;

export interface ScreenTokenPayload {
  screenId: string;
}

// Sin expiración: se revoca borrando/rotando authTokenHash en la fila del Screen.
export const signScreenToken = (payload: ScreenTokenPayload) => jwt.sign(payload, env.SCREEN_TOKEN_SECRET);

export const verifyScreenToken = (token: string) =>
  jwt.verify(token, env.SCREEN_TOKEN_SECRET) as ScreenTokenPayload;
