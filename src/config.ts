import { config } from "dotenv";
import { resolve } from "node:path";

export const NODE_ENV = process.env.NODE_ENV ?? "development";

config({ path: resolve(`.env.${NODE_ENV}`) });

export const PORT = Number(process.env.PORT ?? 3000);
export const DB_URI = process.env.DB_URI ?? "";
export const REDIS_URI = process.env.REDIS_URI ?? "";

export const APP_EMAIL = process.env.APP_EMAIL ?? "";
export const APP_PASSWORD = process.env.APP_PASSWORD ?? "";

export const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET ?? "";
export const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET ?? "";
export const ACCESS_TOKEN_EXPIRES_IN = Number(process.env.ACCESS_TOKEN_EXPIRES_IN ?? 3600);
export const REFRESH_TOKEN_EXPIRES_IN = Number(process.env.REFRESH_TOKEN_EXPIRES_IN ?? 31536000);

export const ENC_KEY = Buffer.from(process.env.ENC_KEY ?? "", "hex");
export const IV_LENGTH = Number(process.env.IV_LENGTH ?? 16);

export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";

export const FACEBOOK = process.env.FACEBOOK ?? "#";
export const INSTAGRAM = process.env.INSTAGRAM ?? "#";
export const TWITTER = process.env.TWITTER ?? "#";
