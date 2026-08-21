import type { ServerConfig } from '../config.js';
import { ConflictError, UnauthorizedError } from '../errors.js';
import type { CartRepository } from '../repositories/cartRepository.js';
import type { OrderRepository } from '../repositories/orderRepository.js';
import type { PasswordResetRepository } from '../repositories/passwordResetRepository.js';
import type { ProductRepository } from '../repositories/productRepository.js';
import type { SessionRepository } from '../repositories/sessionRepository.js';
import type { UserRepository } from '../repositories/userRepository.js';
import type { WishlistRepository } from '../repositories/wishlistRepository.js';
import type { MergeInput, RegisterInput } from '../schemas/auth.js';
import type { SessionUser, UserDto } from '../types.js';
import { generateToken, hashPassword, hashToken, verifyPassword } from '../utils/auth.js';
import { buildResetUrl, type EmailService } from './emailService.js';

/** Owner key prefixes — the single place ownership is derived server-side. */
export function clientOwnerKey(clientId: string): string {
  return `client:${clientId}`;
}
export function userOwnerKey(userId: number): string {
  return `user:${userId}`;
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === '23505'
  );
}

export interface AuthDeps {
  userRepo: UserRepository;
  sessionRepo: SessionRepository;
  cartRepo: CartRepository;
  wishlistRepo: WishlistRepository;
  orderRepo: OrderRepository;
  productRepo: ProductRepository;
  resetRepo: PasswordResetRepository;
  config: Pick<ServerConfig, 'auth'>;
  email: EmailService;
  /** Public origin used to build password-reset links. */
  appBaseUrl: string;
}

export interface RegisterResult {
  user: UserDto;
  token: string;
}

export function createAuthService({ userRepo, sessionRepo, cartRepo, wishlistRepo, orderRepo, productRepo, resetRepo, config, email, appBaseUrl }: AuthDeps) {
  async function establishSession(userId: number): Promise<string> {
    const token = generateToken();
    const expiresAt = new Date(Date.now() + config.auth.sessionTtlMs);
    await sessionRepo.createSession(userId, hashToken(token), expiresAt);
    return token;
  }

  async function register(input: RegisterInput): Promise<RegisterResult> {
    const passwordHash = await hashPassword(input.password);
    let user: UserDto;
    try {
      user = await userRepo.createUser({
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictError('An account with this email already exists', { code: 'email_taken' });
      }
      throw err;
    }
    const token = await establishSession(user.id);
    return { user, token };
  }

  /** Generic failure message — never reveals whether an email is registered. */
  async function login(email: string, password: string): Promise<RegisterResult> {
    const user = await userRepo.findByEmail(email);
    const valid = user ? await verifyPassword(user.password_hash, password) : false;
    if (!user || !valid) {
      throw new UnauthorizedError('Invalid email or password');
    }
    if (user.status !== 'active') {
      throw new UnauthorizedError('This account has been suspended');
    }
    await userRepo.touchLastLogin(user.id);
    const safeUser = await userRepo.findById(user.id);
    if (!safeUser) throw new UnauthorizedError('Invalid email or password');
    const token = await establishSession(user.id);
    return { user: safeUser, token };
  }

  async function logout(sessionId: number): Promise<void> {
    await sessionRepo.revokeSession(sessionId);
  }

  /** Logs the user out of every device by revoking all of their sessions. */
  async function logoutAll(userId: number): Promise<void> {
    await sessionRepo.revokeAllForUser(userId);
  }

  /** Rotates the session token (session-fixation protection) and slides expiry. */
  async function refresh(session: SessionUser): Promise<{ token: string }> {
    await sessionRepo.revokeSession(session.sessionId);
    return { token: await establishSession(session.userId) };
  }

  async function getMe(userId: number): Promise<UserDto | null> {
    return userRepo.findById(userId);
  }

  /**
   * Anonymous → account migration. Merges the guest's server-side cart (by
   * client id) plus any client-supplied localStorage items into the account
   * cart (quantities capped at current stock), unions the wishlist, and
   * claims same-browser anonymous orders for the account. Guest carts are
   * retired once merged; nothing is silently deleted.
   */
  async function merge(userId: number, clientId: string, input: MergeInput) {
    const guestOwner = clientOwnerKey(clientId);
    const accountOwner = userOwnerKey(userId);

    const existing = await cartRepo.getCart(accountOwner);
    const combined = new Map<number, number>(existing.map(i => [i.product_id, i.quantity]));
    for (const row of await cartRepo.getCart(guestOwner)) {
      combined.set(row.product_id, (combined.get(row.product_id) ?? 0) + row.quantity);
    }
    for (const item of input.cartItems) {
      combined.set(item.productId, (combined.get(item.productId) ?? 0) + item.quantity);
    }

    const stockById = new Map((await productRepo.getProductsByIds(Array.from(combined.keys()))).map(p => [p.id, p.stockQuantity]));
    const capped: { productId: number; requested: number; capped: number }[] = [];
    await cartRepo.clearCart(accountOwner);
    for (const [productId, requested] of combined) {
      const available = stockById.get(productId) ?? 0;
      const qty = Math.min(requested, Math.max(0, available));
      if (qty > 0) await cartRepo.upsertItem(accountOwner, productId, qty);
      if (qty < requested) capped.push({ productId, requested, capped: qty });
    }
    await cartRepo.clearCart(guestOwner);

    // Only client-supplied ids are unvalidated — drop ids that don't exist
    // (guest/server wishlists were already FK-validated at insert time).
    const validInputIds = new Set((await productRepo.getProductsByIds(input.wishlistIds)).map(p => p.id));
    const wishlistIds = Array.from(
      new Set([
        ...(await wishlistRepo.getWishlist(guestOwner)),
        ...(await wishlistRepo.getWishlist(accountOwner)),
        ...input.wishlistIds.filter(id => validInputIds.has(id)),
      ])
    );
    await wishlistRepo.mergeIntoAccount(accountOwner, userId, guestOwner);
    for (const id of wishlistIds) {
      await wishlistRepo.addItem(accountOwner, id);
    }

    // Same-browser anonymous orders become the account's orders.
    await orderRepo.claimOrdersForUser(clientId, userId);

    const cart = (await cartRepo.getCart(accountOwner)).map(i => ({ productId: i.product_id, quantity: i.quantity }));
    return { cart, wishlist: wishlistIds, capped };
  }

  async function changePassword(userId: number, currentSessionId: number, currentPassword: string, newPassword: string): Promise<void> {
    const user = await userRepo.findById(userId);
    if (!user) throw new UnauthorizedError('Authentication required');
    const full = await userRepo.findByEmail(user.email);
    const ok = full ? await verifyPassword(full.password_hash, currentPassword) : false;
    if (!ok) throw new UnauthorizedError('Current password is incorrect');
    await userRepo.updatePassword(userId, await hashPassword(newPassword));
    // Revoke every OTHER session; the current one stays so the user isn't logged out.
    await sessionRepo.revokeAllForUser(userId, currentSessionId);
  }

  /**
   * Password reset: creates a one-time token (stored only as a hash, 30-min
   * TTL) and delivers the reset link by email. The response is identical
   * whether or not the email exists (no account enumeration) and never
   * returns the token — delivery is the email service's job.
   */
  async function forgotPassword(emailAddress: string): Promise<void> {
    const user = await userRepo.findByEmail(emailAddress);
    if (!user) return;
    const token = generateToken();
    await resetRepo.create(user.id, hashToken(token), new Date(Date.now() + config.auth.passwordResetTtlMs));
    await email.sendPasswordResetEmail({
      to: user.email,
      firstName: user.first_name,
      resetUrl: buildResetUrl(appBaseUrl, token),
    });
  }

  async function resetPassword(token: string, newPassword: string): Promise<void> {
    const userId = await resetRepo.consume(hashToken(token));
    if (!userId) throw new UnauthorizedError('This reset link is invalid or has expired');
    await userRepo.updatePassword(userId, await hashPassword(newPassword));
    await sessionRepo.revokeAllForUser(userId);
  }

  return { register, login, logout, logoutAll, refresh, getMe, merge, changePassword, forgotPassword, resetPassword, establishSession };
}

export type AuthService = ReturnType<typeof createAuthService>;
