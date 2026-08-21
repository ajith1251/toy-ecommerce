import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { loadConfig, type ServerConfig } from './config.js';
import type { DbPool } from './db/pool.js';
import { ForbiddenError, NotFoundError } from './errors.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/logger.js';
import { attachRequestId } from './observability/requestContext.js';
import { initLogger } from './observability/logger.js';
import { createCatalogService } from './services/catalogService.js';
import { createOrderService } from './services/orderService.js';
import { createCartService } from './services/cartService.js';
import { createWishlistService } from './services/wishlistService.js';
import { createAuthService } from './services/authService.js';
import { createProfileService } from './services/profileService.js';
import { createCategoryRepository, createBrandRepository } from './repositories/catalogRepository.js';
import { createProductRepository } from './repositories/productRepository.js';
import { createOrderRepository } from './repositories/orderRepository.js';
import { createCartRepository } from './repositories/cartRepository.js';
import { createWishlistRepository } from './repositories/wishlistRepository.js';
import { createUserRepository } from './repositories/userRepository.js';
import { createSessionRepository } from './repositories/sessionRepository.js';
import { createAddressRepository } from './repositories/addressRepository.js';
import { createPasswordResetRepository } from './repositories/passwordResetRepository.js';
import { createInventoryTransactionRepository } from './repositories/inventoryTransactionRepository.js';
import { createAuditLogRepository } from './repositories/auditLogRepository.js';
import { createEmailService, type EmailService } from './services/emailService.js';
import { createApiRouter } from './routes/index.js';
import { createPaymentRepository } from './payments/paymentRepository.js';
import { createRazorpayProvider } from './payments/razorpayProvider.js';
import type { PaymentRepository } from './payments/paymentRepository.js';
import type { PaymentProvider } from './payments/paymentProvider.js';

export interface AppDeps {
  pool: DbPool;
  config?: Pick<ServerConfig, 'corsOrigins' | 'rateLimit' | 'adminRateLimit' | 'auth' | 'nodeEnv' | 'logFormat' | 'email' | 'razorpay'>;
  /** Tests inject a capture transport instead of console/file/SMTP. */
  email?: EmailService;
  /** Payment dependencies for tests */
  paymentRepository?: PaymentRepository;
  paymentProvider?: PaymentProvider;
}

/**
 * Builds the Express application. `pool` is injected so tests can point the
 * app at a dedicated test database. Server startup (listen) lives in
 * server.ts.
 */
export function createApp({ pool, config, email: injectedEmail, paymentRepository, paymentProvider }: AppDeps) {
  // Tests may omit config — fall back to environment-derived defaults.
  const resolved = config ?? loadConfig();
  const corsOrigins = resolved.corsOrigins;
  const email = injectedEmail ?? createEmailService(resolved.email);
  const app = express();

  initLogger(resolved);
  app.use(attachRequestId());
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        // Allow non-browser clients (curl, supertest) that send no Origin.
        if (!origin || corsOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new ForbiddenError(`Origin ${origin} is not allowed by CORS`));
        }
      },
      credentials: true, // cookie-based sessions
    })
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(requestLogger());

  // Domain wiring: controllers → services → repositories → PostgreSQL.
  const productRepo = createProductRepository(pool);
  const categoryRepo = createCategoryRepository(pool);
  const brandRepo = createBrandRepository(pool);
  const orderRepo = createOrderRepository(pool);
  const cartRepo = createCartRepository(pool);
  const wishlistRepo = createWishlistRepository(pool);
  const userRepo = createUserRepository(pool);
  const sessionRepo = createSessionRepository(pool);
  const addressRepo = createAddressRepository(pool);
  const resetRepo = createPasswordResetRepository(pool);
  const inventoryTransactionRepo = createInventoryTransactionRepository(pool);
  const auditLogRepo = createAuditLogRepository(pool);

  // Payment dependencies
  const paymentRepo = paymentRepository ?? createPaymentRepository(pool);
  
  // Only create Razorpay provider if credentials are available
  const paymentProviderInstance = paymentProvider ?? (
    resolved.razorpay.keyId && resolved.razorpay.keySecret
      ? createRazorpayProvider(resolved.razorpay.keyId, resolved.razorpay.keySecret, resolved.razorpay.timeoutMs)
      : undefined
  );

  const catalog = createCatalogService({ productRepo, categoryRepo, brandRepo });
  const orders = createOrderService({ pool, productRepo, orderRepo });
  const carts = createCartService({ cartRepo, productRepo });
  const wishlists = createWishlistService({ wishlistRepo, productRepo });
  const auth = createAuthService({
    userRepo,
    sessionRepo,
    cartRepo,
    wishlistRepo,
    orderRepo,
    productRepo,
    resetRepo,
    config: resolved,
    email,
    appBaseUrl: resolved.email.appBaseUrl,
  });
  const profile = createProfileService({ userRepo, addressRepo });

  app.use(
    '/api',
    createApiRouter({ 
      pool, 
      config: resolved, 
      sessionRepo, 
      catalog, 
      orders, 
      carts, 
      wishlists, 
      auth, 
      profile,
      orderRepo,
      userRepo,
      paymentRepo: paymentRepo,
      paymentProvider: paymentProviderInstance,
      productRepo,
      categoryRepo,
      brandRepo,
      inventoryTransactionRepo,
      auditLogRepo
    })
  );

  // Unknown API routes → 404 (non-API paths too, this is an API-only app).
  app.use('/api', (_req, _res, next) => next(new NotFoundError('API endpoint not found')));
  app.use((_req, _res, next) => next(new NotFoundError('Not found')));

  app.use(errorHandler);

  return app;
}
