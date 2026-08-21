import { clientOwnerKey, userOwnerKey } from './authService.js';

/**
 * Who is making the request. `userId` comes from the verified session
 * (never from the client); `clientId` from the X-Client-Id header (guests).
 */
export type Owner = { userId: number; clientId: string } | { clientId: string };

/** Owner key used by carts/wishlists: `user:<id>` for accounts, `client:<id>` for guests. */
export function resolveOwnerKey(owner: Owner): string {
  return 'userId' in owner ? userOwnerKey(owner.userId) : clientOwnerKey(owner.clientId);
}

export function resolveOwnerScope(owner: Owner): { userId: number } | { clientId: string } {
  return 'userId' in owner ? { userId: owner.userId } : { clientId: owner.clientId };
}
