import { randomUUID } from 'crypto';

// UUID, not a timestamp+hash: identical files uploaded concurrently must not collide (upsert is off).
export function uniqueObjectName(ext: string): string {
  return `${randomUUID()}.${ext}`;
}
