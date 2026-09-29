export const blockedKey = (userId: string) => `auth:blocked:${userId}`;

// Must outlive the 15m access token; refresh is already blocked by user status.
export const BLOCK_TTL_SECONDS = 16 * 60;
