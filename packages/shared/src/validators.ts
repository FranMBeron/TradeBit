import { z } from "zod/v4";
import { LIMITS } from "./constants.ts";

export const usernameSchema = z
  .string()
  .min(LIMITS.USERNAME_MIN_LENGTH)
  .max(LIMITS.USERNAME_MAX_LENGTH)
  .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores");

export const emailSchema = z.string().email();

export const passwordSchema = z.string().min(8, "Password must be at least 8 characters");

export const registerSchema = z.object({
  email: emailSchema,
  username: usernameSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
