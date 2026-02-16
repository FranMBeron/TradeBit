import { z } from "zod/v4";
import { LIMITS } from "./constants.ts";

export const usernameSchema = z
  .string()
  .min(LIMITS.USERNAME_MIN_LENGTH)
  .max(LIMITS.USERNAME_MAX_LENGTH)
  .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores");

export const emailSchema = z.string().email();
