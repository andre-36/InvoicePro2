import { z } from "zod";

// Define environment variables schema
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().transform(Number).default("5000"),
  DATABASE_URL: z.string(),
  SESSION_SECRET: z.string().default("supersecret"),
  JWT_SECRET: z.string().default("jwtsupersecret"),
  COOKIE_NAME: z.string().default("aluminum_manager"),
  HOST: z.string().default("0.0.0.0"),
  CLIENT_URL: z.string().default("http://localhost:5000"),
});

// Parse environment variables
export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  DATABASE_URL: process.env.DATABASE_URL,
  SESSION_SECRET: process.env.SESSION_SECRET,
  JWT_SECRET: process.env.JWT_SECRET,
  COOKIE_NAME: process.env.COOKIE_NAME,
  HOST: process.env.HOST,
  CLIENT_URL: process.env.CLIENT_URL,
});