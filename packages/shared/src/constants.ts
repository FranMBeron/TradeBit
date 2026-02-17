export const APP_NAME = "TradeBit";

export const LIMITS = {
  BIO_MAX_LENGTH: 280,
  POST_MAX_LENGTH: 500,
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 50,
} as const;

export const REACTION_TYPES = ["rocket", "chart", "speech", "diamond"] as const;
export type ReactionType = (typeof REACTION_TYPES)[number];
