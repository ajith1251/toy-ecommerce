import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { rateLimit } from 'express-rate-limit';
import { ping } from '../db/pool.js';
import type { DbPool } from '../db/pool.js';
import type { ServerConfig } from '../config.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireClientId } from '../middleware/clientId.js';
import { validate } from '../middleware/validate.js';
import { optionalAuth, requireAuth, requireAdmin, sameOrigin } from '../middleware/auth.js';
import { razorpayWebhookVerification } from '../middleware/webhook.js';
import { InsufficientStockError, NotFoundError } from '../errors.js';
import { productQuerySchema, type ProductQuery } from '../schemas/common.js';
import { addCartItemSchema, productIdParamsSchema, updateCartItemSchema, type AddCartItemInput, type UpdateCartItemInput } from '../schemas/cart.js';
import { createOrderSchema, type CreateOrderInput } from '../schemas/order.js';
import {
  addressIdParamsSchema,
  addressSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  mergeSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
  type AddressInput,
  type MergeInput,
  type RegisterInput,
  type UpdateProfileInput,
} from '../schemas/auth.js';
import { createProductSchema, updateProductSchema, type CreateProductInput, type UpdateProductInput } from '../schemas/product.js';
import { createCategorySchema, updateCategorySchema, type CreateCategoryInput, type UpdateCategoryInput } from '../schemas/category.js';
import { createBrandSchema, updateBrandSchema, type CreateBrandInput, type UpdateBrandInput } from '../schemas/brand.js';
import { inventoryAdjustmentSchema, type InventoryAdjustmentInput } from '../schemas/inventoryAdjustment.js';
import {
  adminPaginationSchema,
  categoryIdParamsSchema,
  customerStatusUpdateSchema,
  numericIdParamsSchema,
  orderNumberParamsSchema,
  orderStatusUpdateSchema,
  type CustomerStatusUpdateInput,
  type OrderStatusUpdateInput,
} from '../schemas/admin.js';
import { createInventoryTransactionService } from '../services/inventoryTransactionService.js';
import { createAuditLogService } from '../services/auditLogService.js';
import { createCatalogController } from '../controllers/catalogController.js';
import { createOrderController } from '../controllers/orderController.js';
import { createCartController } from '../controllers/cartController.js';
import { createWishlistController } from '../controllers/wishlistController.js';
import { createAuthController } from '../controllers/authController.js';
import { createProfileController } from '../controllers/profileController.js';
import { createPaymentController } from '../controllers/paymentController.js';
import type { CatalogService } from '../services/catalogService.js';
import type { OrderService } from '../services/orderService.js';
import type { CartService } from '../services/cartService.js';
import type { WishlistService } from '../services/wishlistService.js';
import type { AuthService } from '../services/authService.js';
import type { ProfileService } from '../services/profileService.js';
import type { Owner } from '../services/ownership.js';
import type { SessionRepository } from '../repositories/sessionRepository.js';
import type { SessionUser } from '../types.js';
import type { OrderRepository } from '../repositories/orderRepository.js';
import type { UserRepository } from '../repositories/userRepository.js';
import type { ProductRepository } from '../repositories/productRepository.js';
import type { CategoryRepository, BrandRepository } from '../repositories/catalogRepository.js';
import type { InventoryTransactionRepository } from '../repositories/inventoryTransactionRepository.js';
import type { AuditLogRepository } from '../repositories/auditLogRepository.js';
import type { PaymentRepository } from '../payments/paymentRepository.js';
import type { PaymentProvider } from '../payments/paymentProvider.js';

export interface ApiDeps {
  pool: DbPool;
  config: Pick<ServerConfig, 'corsOrigins' | 'auth' | 'nodeEnv' | 'razorpay' | 'rateLimit' | 'adminRateLimit'>;
  sessionRepo: SessionRepository;
  catalog: CatalogService;
  orders: OrderService;
  carts: CartService;
  wishlists: WishlistService;
  auth: AuthService;
  profile: ProfileService;
  orderRepo: OrderRepository;
  userRepo: UserRepository;
  // Payment dependencies
  paymentRepo: PaymentRepository;
  paymentProvider?: PaymentProvider;
  // Repositories for admin operations
  productRepo: ProductRepository;
  categoryRepo: CategoryRepository;
  brandRepo: BrandRepository;
  inventoryTransactionRepo: InventoryTransactionRepository;
  auditLogRepo: AuditLogRepository;
}

/** Server-derived ownership for the request — session user wins, else guest client id. */
function ownerFrom(res: Response): Owner {
  const user = res.locals.user as SessionUser | undefined;
  const clientId = res.locals.clientId as string;
  return user ? { userId: user.userId, clientId } : { clientId };
}

export function createApiRouter({ pool, config, sessionRepo, catalog, orders, carts, wishlists, auth, profile, orderRepo, userRepo, paymentRepo, paymentProvider, productRepo, categoryRepo, brandRepo, inventoryTransactionRepo, auditLogRepo }: ApiDeps): Router {
  const router = Router();
  const catalogController = createCatalogController(catalog);
  const orderController = createOrderController(orders);
  const cartController = createCartController(carts);
  const wishlistController = createWishlistController(wishlists);
  const authController = createAuthController({ auth, config });
  const profileController = createProfileController({ profile });
  const paymentController = createPaymentController({
    pool,
    orderRepo,
    paymentRepo,
    paymentProvider,
    config: { razorpay: config.razorpay }
  });
  
  // Inventory transaction service
  const inventoryTransactionService = createInventoryTransactionService({
    pool,
    productRepo,
    inventoryTransactionRepo: inventoryTransactionRepo
  });
  
  // Audit log service
  const auditLogService = createAuditLogService({
    pool,
    auditLogRepo: auditLogRepo
  });

  // Resolve authenticated sessions (cookie) for every request; reject
  // cross-origin mutations (CSRF defense-in-depth, SameSite=Lax primary).
  const authDeps = { sessionRepo, userRepo, config };
  router.use(optionalAuth(authDeps));
  router.use(sameOrigin(config.corsOrigins));

  // ── Health ────────────────────────────────────────────────────────────
  // Liveness: the process is up. No dependency checks — must never fail
  // because PostgreSQL blipped (a DB blip should not get the container
  // killed, only marked not-ready).
  router.get('/health/live', (_req: Request, res: Response) => {
    res.status(200).json({ data: { status: 'live', timestamp: new Date().toISOString() } });
  });

  // Readiness: process + required dependencies. Load balancers / container
  // orchestrators route traffic only while this returns 200.
  router.get('/health/ready', asyncHandler(async (_req: Request, res: Response) => {
    const db = await ping(pool);
    res.status(db ? 200 : 503).json({
      data: { status: db ? 'ready' : 'not_ready', db: db ? 'up' : 'down', timestamp: new Date().toISOString() },
    });
  }));

  // Legacy combined check (kept for existing monitors and tests).
  router.get('/health', asyncHandler(async (_req: Request, res: Response) => {
    const db = await ping(pool);
    res.status(db ? 200 : 503).json({
      data: { status: db ? 'ok' : 'degraded', db: db ? 'up' : 'down', timestamp: new Date().toISOString() },
    });
  }));

  // ── Rate limiting ─────────────────────────────────────────────────────
  // General API safety net (per IP); auth and admin have their own stricter
  // budgets below. All windows/limits are env-configurable via config.
  const apiLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    limit: config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({ error: { code: 'rate_limited', message: 'Too many requests — please try again later' } });
    },
  });
  const adminLimiter = rateLimit({
    windowMs: config.adminRateLimit.windowMs,
    limit: config.adminRateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({ error: { code: 'rate_limited', message: 'Too many requests — please try again later' } });
    },
  });
  router.use(apiLimiter);

  // ── Auth (stricter rate limiting) ──────────────────────────────────────
  const authLimiter = rateLimit({
    windowMs: config.auth.authRateLimit.windowMs,
    limit: config.auth.authRateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({ error: { code: 'rate_limited', message: 'Too many requests — please try again later' } });
    },
  });

  router.post('/auth/register', authLimiter, validate(registerSchema), asyncHandler(async (_req, res) => {
    await authController.register(res.locals.validated.body as RegisterInput, res);
  }));
  router.post('/auth/login', authLimiter, validate(loginSchema), asyncHandler(async (_req, res) => {
    await authController.login(res.locals.validated.body as { email: string; password: string }, res);
  }));
router.post('/auth/logout', requireAuth({ sessionRepo, config, userRepo }), asyncHandler(async (_req, res) => {
      await authController.logout(res.locals.user as SessionUser, res);
    }));
router.post('/auth/logout-all', requireAuth({ sessionRepo, config, userRepo }), asyncHandler(async (_req, res) => {
      await authController.logoutAll(res.locals.user as SessionUser, res);
    }));
router.post('/auth/refresh', authLimiter, requireAuth({ sessionRepo, config, userRepo }), asyncHandler(async (_req, res) => {
      await authController.refresh(res.locals.user as SessionUser, res);
    }));
  router.get('/auth/me', asyncHandler(async (_req, res) => {
    if (!res.locals.user) {
      res.status(401).json({ error: { code: 'unauthorized', message: 'Authentication required' } });
      return;
    }
    await authController.me(res.locals.user as SessionUser, res);
  }));
  // Anonymous → account migration (requires auth + a client id for the guest data).
router.post('/auth/merge', authLimiter, requireAuth({ sessionRepo, config, userRepo }), requireClientId, validate(mergeSchema), asyncHandler(async (_req, res) => {
      await authController.merge(res.locals.user as SessionUser, res.locals.clientId as string, res.locals.validated.body as MergeInput, res);
    }));
  router.post('/auth/forgot-password', authLimiter, validate(forgotPasswordSchema), asyncHandler(async (_req, res) => {
    await authController.forgotPassword(res.locals.validated.body as { email: string }, res);
  }));
  router.post('/auth/reset-password', authLimiter, validate(resetPasswordSchema), asyncHandler(async (_req, res) => {
    await authController.resetPassword(res.locals.validated.body as { token: string; password: string }, res);
  }));

  // ── Account (authenticated) ────────────────────────────────────────────
router.get('/account/profile', requireAuth({ sessionRepo, config, userRepo }), asyncHandler(async (_req, res) => {
      await profileController.getProfile((res.locals.user as SessionUser).userId, res);
    }));
router.patch('/account/profile', requireAuth({ sessionRepo, config, userRepo }), validate(updateProfileSchema), asyncHandler(async (_req, res) => {
      await profileController.updateProfile((res.locals.user as SessionUser).userId, res.locals.validated.body as UpdateProfileInput, res);
    }));
router.patch('/account/password', requireAuth({ sessionRepo, config, userRepo }), validate(changePasswordSchema), asyncHandler(async (_req, res) => {
      await authController.changePassword(res.locals.user as SessionUser, res.locals.validated.body as { currentPassword: string; newPassword: string }, res);
    }));
router.get('/account/addresses', requireAuth({ sessionRepo, config, userRepo }), asyncHandler(async (_req, res) => {
      await profileController.listAddresses((res.locals.user as SessionUser).userId, res);
    }));
router.post('/account/addresses', requireAuth({ sessionRepo, config, userRepo }), validate(addressSchema), asyncHandler(async (_req, res) => {
      await profileController.createAddress((res.locals.user as SessionUser).userId, res.locals.validated.body as AddressInput, res);
    }));
router.patch('/account/addresses/:id', requireAuth({ sessionRepo, config, userRepo }), validate(addressSchema), validate(addressIdParamsSchema, 'params'), asyncHandler(async (_req, res) => {
      await profileController.updateAddress(
        (res.locals.user as SessionUser).userId,
        (res.locals.validated.params as { id: number }).id,
        res.locals.validated.body as AddressInput,
        res
      );
    }));
router.delete('/account/addresses/:id', requireAuth({ sessionRepo, config, userRepo }), validate(addressIdParamsSchema, 'params'), asyncHandler(async (_req, res) => {
      await profileController.deleteAddress((res.locals.user as SessionUser).userId, (res.locals.validated.params as { id: number }).id, res);
    }));
router.post('/account/addresses/:id/default', requireAuth({ sessionRepo, config, userRepo }), validate(addressIdParamsSchema, 'params'), asyncHandler(async (_req, res) => {
      await profileController.setDefaultAddress((res.locals.user as SessionUser).userId, (res.locals.validated.params as { id: number }).id, res);
    }));

  // ── Products ──────────────────────────────────────────────────────────
  router.get('/products', validate(productQuerySchema, 'query'), asyncHandler(async (_req, res) => {
    await catalogController.listProducts(res.locals.validated.query as ProductQuery, res);
  }));
  router.get('/products/slug/:slug', asyncHandler(async (req, res) => {
    await catalogController.getProductBySlug(req.params.slug as string, res);
  }));
  router.get('/products/:id', validate(z.object({ id: z.coerce.number().int().positive() }), 'params'), asyncHandler(async (req, res) => {
    await catalogController.getProductById((res.locals.validated.params as { id: number }).id, res);
  }));

  // ── Categories ────────────────────────────────────────────────────────
  router.get('/categories', asyncHandler(async (_req, res) => {
    await catalogController.listCategories(res);
  }));
  router.get('/categories/:slug', asyncHandler(async (req, res) => {
    await catalogController.getCategoryBySlug(req.params.slug as string, res);
  }));

  // ── Brands ────────────────────────────────────────────────────────────
  router.get('/brands', asyncHandler(async (_req, res) => {
    await catalogController.listBrands(res);
  }));
  router.get('/brands/:slug', asyncHandler(async (req, res) => {
    await catalogController.getBrandBySlug(req.params.slug as string, res);
  }));

// ── Orders — scoped to the authenticated user, or the guest client id ──
    router.post('/orders', requireClientId, validate(createOrderSchema), asyncHandler(async (_req, res) => {
      await orderController.createOrder(res.locals.validated.body as CreateOrderInput, ownerFrom(res), res);
    }));
    router.get('/orders', requireClientId, asyncHandler(async (_req, res) => {
      await orderController.listOrders(ownerFrom(res), res);
    }));
    router.get('/orders/:orderNumber', requireClientId, asyncHandler(async (req, res) => {
      await orderController.getOrder(req.params.orderNumber as string, ownerFrom(res), res);
    }));

  // ── Payments ──────────────────────────────────────────────────────────
  // Only register payment routes if payment provider is available
  if (paymentProvider) {
    router.post('/payments/create-order', requireClientId, asyncHandler(async (req, res, next) => {
      await paymentController.createPayment(req, res, next);
    }));
    router.post('/payments/verify', requireClientId, asyncHandler(async (req, res, next) => {
      await paymentController.verifyPayment(req, res, next);
    }));
    router.get('/orders/:orderNumber/payment', requireClientId, asyncHandler(async (req, res, next) => {
      await paymentController.getPaymentStatus(req, res, next);
    }));
  }

  // ── Cart — ownership resolved from session or client id ───────────────
  router.get('/cart', requireClientId, asyncHandler(async (_req, res) => {
    await cartController.getCart(ownerFrom(res), res);
  }));
  router.post('/cart/items', requireClientId, validate(addCartItemSchema), asyncHandler(async (_req, res) => {
    await cartController.addItem(res.locals.validated.body as AddCartItemInput, ownerFrom(res), res);
  }));
  router.patch('/cart/items/:productId', requireClientId, validate(updateCartItemSchema), validate(productIdParamsSchema, 'params'), asyncHandler(async (_req, res) => {
    await cartController.updateItem(
      res.locals.validated.body as UpdateCartItemInput,
      ownerFrom(res),
      (res.locals.validated.params as { productId: number }).productId,
      res
    );
  }));
  router.delete('/cart/items/:productId', requireClientId, validate(productIdParamsSchema, 'params'), asyncHandler(async (_req, res) => {
    await cartController.removeItem(ownerFrom(res), (res.locals.validated.params as { productId: number }).productId, res);
  }));
  router.delete('/cart', requireClientId, asyncHandler(async (_req, res) => {
    await cartController.clearCart(ownerFrom(res), res);
  }));

// ── Wishlist ──────────────────────────────────────────────────────────
   router.get('/wishlist', requireClientId, asyncHandler(async (_req, res) => {
     await wishlistController.getWishlist(ownerFrom(res), res);
   }));
   router.post('/wishlist/items/:productId', requireClientId, validate(productIdParamsSchema, 'params'), asyncHandler(async (_req, res) => {
     await wishlistController.addItem(ownerFrom(res), (res.locals.validated.params as { productId: number }).productId, res);
   }));
router.delete('/wishlist/items/:productId', requireClientId, validate(productIdParamsSchema, 'params'), asyncHandler(async (_req, res) => {
      await wishlistController.removeItem(ownerFrom(res), (res.locals.validated.params as { productId: number }).productId, res);
    }));

  // ── ADMIN ROUTES ──────────────────────────────────────────────────────────────
  // All admin routes require authentication and admin role.
  // Scoped to /admin so unknown non-admin routes still fall through to 404.
  router.use('/admin', requireAuth(authDeps));
  router.use('/admin', requireAdmin(authDeps));
  router.use('/admin', adminLimiter);

  // Admin dashboard
  router.get('/admin/dashboard', asyncHandler(async (req, res) => {
    // Get dashboard statistics from the database
    // Query to get various statistics
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM users WHERE role = 'customer') as customers_count,
        (SELECT COUNT(*) FROM orders) as orders_count,
        (SELECT COUNT(*) FROM products WHERE is_active = true) as products_count,
        (SELECT COUNT(*) FROM products WHERE is_active = true AND stock_quantity <= 10) as low_stock_count,
        (SELECT COUNT(*) FROM payments WHERE status = 'pending') as pending_payments_count,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'captured') as revenue_total
    `;
    
    const result = await pool.query(statsQuery);
    const stats = result.rows[0];
    
    // Format the response
    res.json({
      revenue: stats.revenue_total / 100, // Convert from paise to rupees
      orders: parseInt(stats.orders_count),
      customers: parseInt(stats.customers_count),
      products: parseInt(stats.products_count),
      lowStock: parseInt(stats.low_stock_count),
      pendingPayments: parseInt(stats.pending_payments_count)
    });
  }));

  // Admin product management
  router.get('/admin/products', asyncHandler(async (req, res) => {
    // Get pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    
    // Get filter parameters
    const search = req.query.search as string || '';
    const statusFilter = req.query.status as string || ''; // 'active', 'inactive', or '' for all
    const categoryFilter = req.query.category as string || '';
    const brandFilter = req.query.brand as string || '';
    
    // Build WHERE clause
    const whereConditions = [];
    const queryParams = [];
    
    if (search) {
      queryParams.push(`%${search}%`);
      whereConditions.push(`(p.name ILIKE $${queryParams.length} OR p.description ILIKE $${queryParams.length})`);
    }
    
    if (statusFilter === 'active') {
      whereConditions.push('p.is_active = true');
    } else if (statusFilter === 'inactive') {
      whereConditions.push('p.is_active = false');
    }
    // If statusFilter is empty, show all products (no filter)
    
    if (categoryFilter) {
      queryParams.push(categoryFilter);
      whereConditions.push(`p.category_id = $${queryParams.length}`);
    }
    
    if (brandFilter) {
      queryParams.push(brandFilter);
      whereConditions.push(`p.brand_id = $${queryParams.length}`);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Query to get products with total count
    const productsQuery = `
      SELECT 
        p.id,
        p.slug,
        p.name,
        p.description,
        p.price,
        p.original_price,
        p.category_id,
        b.name AS brand_name,
        p.age_group,
        p.age_range,
        p.rating,
        p.review_count,
        p.image,
        p.stock_quantity,
        p.is_active,
        p.is_new,
        p.is_bestseller,
        p.created_at,
        p.updated_at
      FROM products p
      LEFT JOIN brands b ON b.id = p.brand_id
      ${whereClause}
      ORDER BY p.name ASC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM products p
      ${whereClause}
    `;
    
    // Execute queries
    const params = [...queryParams, limit, offset];
    const productsResult = await pool.query(productsQuery, params);
    const countResult = await pool.query(countQuery, queryParams);
    
    // Format the response to match ProductDto
    const adminProducts = productsResult.rows.map((row: any) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      price: Number(row.price),
      originalPrice: row.original_price === null ? null : Number(row.original_price),
      category: row.category_id,
      brand: row.brand_name || '',
      ageGroup: row.age_group,
      ageRange: row.age_range,
      rating: Number(row.rating),
      reviewCount: Number(row.review_count),
      image: row.image,
      stockQuantity: row.stock_quantity,
      inStock: row.is_active && row.stock_quantity > 0,
      isNew: row.is_new,
      isBestseller: row.is_bestseller,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
    
    res.json({
      data: adminProducts,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].total),
        totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
      }
    });
  }));
  
  router.get('/admin/products/:id', validate(numericIdParamsSchema, 'params'), asyncHandler(async (req, res) => {
    const productId = (res.locals.validated.params as { id: number }).id;
    
    // Get product detail
    const result = await pool.query(`
      SELECT 
        p.id,
        p.slug,
        p.name,
        p.description,
        p.price,
        p.original_price,
        p.category_id,
        b.name AS brand_name,
        p.age_group,
        p.age_range,
        p.rating,
        p.review_count,
        p.image,
        p.stock_quantity,
        p.is_active,
        p.is_new,
        p.is_bestseller,
        p.created_at,
        p.updated_at
      FROM products p
      LEFT JOIN brands b ON b.id = p.brand_id
      WHERE p.id = $1
    `, [productId]);
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: { code: 'not_found', message: 'Product not found' } });
      return;
    }
    
    const row = result.rows[0];
    
    const product = {
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      price: Number(row.price),
      originalPrice: row.original_price === null ? null : Number(row.original_price),
      category: row.category_id,
      brand: row.brand_name || '',
      ageGroup: row.age_group,
      ageRange: row.age_range,
      rating: Number(row.rating),
      reviewCount: Number(row.review_count),
      image: row.image,
      stockQuantity: row.stock_quantity,
      inStock: row.is_active && row.stock_quantity > 0,
      isNew: row.is_new,
      isBestseller: row.is_bestseller,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
    
    res.json({ data: product });
  }));
  
  router.post('/admin/products', validate(createProductSchema), asyncHandler(async (req, res) => {
    const { 
      name, slug, description, price, originalPrice, categoryId, brandId, 
      ageGroup, ageRange, rating, reviewCount, image, stockQuantity, 
      isActive, isNew, isBestseller 
    } = req.body as CreateProductInput;
    
    // Insert the product. The catalog table uses explicit integer ids
    // (mirroring the seeded frontend ids), so allocate the next free id.
    const result = await pool.query(
      `INSERT INTO products (
        id, name, slug, description, price, original_price, category_id, brand_id,
        age_group, age_range, rating, review_count, image, stock_quantity,
        is_active, is_new, is_bestseller
      ) VALUES (
        (SELECT COALESCE(MAX(id), 0) + 1 FROM products),
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
      ) RETURNING *`,
      [
        name, slug, description, price, 
        originalPrice ?? null, 
        categoryId, brandId, 
        ageGroup, ageRange, 
        rating ?? 0, 
        reviewCount ?? 0, 
        image ?? '', 
        stockQuantity ?? 0, 
        isActive ?? true, 
        isNew ?? false, 
        isBestseller ?? false
      ]
    );
    
    const row = result.rows[0];
    
    // Create audit log entry
    await auditLogService.logAction(
      res.locals.user?.userId ?? null,
      'create_product',
      'product',
      row.id.toString(),
      {
        name: row.name,
        slug: row.slug,
        description: row.description,
        price: row.price,
        originalPrice: row.original_price,
        categoryId: row.category_id,
        brandId: row.brand_id,
        ageGroup: row.age_group,
        ageRange: row.age_range,
        rating: row.rating,
        reviewCount: row.review_count,
        image: row.image,
        stockQuantity: row.stock_quantity,
        isActive: row.is_active,
        isNew: row.is_new,
        isBestseller: row.is_bestseller
      },
      req.ip,
      req.get('User-Agent')
    );
    
    // Format the response to match ProductDto
    const product = {
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      price: Number(row.price),
      originalPrice: row.original_price === null ? null : Number(row.original_price),
      category: row.category_id,
      brand: row.brand_name || '',
      ageGroup: row.age_group,
      ageRange: row.age_range,
      rating: Number(row.rating),
      reviewCount: Number(row.review_count),
      image: row.image,
      stockQuantity: row.stock_quantity,
      inStock: row.is_active && row.stock_quantity > 0,
      isNew: row.is_new,
      isBestseller: row.is_bestseller
    };
    
    res.status(201).json({ data: product });
  }));
  
  router.patch('/admin/products/:id', validate(updateProductSchema), validate(numericIdParamsSchema, 'params'), asyncHandler(async (req, res) => {
    const productId = (res.locals.validated.params as { id: number }).id;
    const updateData = req.body as UpdateProductInput;
    
    // Check if product exists
    const existCheck = await pool.query('SELECT id FROM products WHERE id = $1', [productId]);
    if (existCheck.rows.length === 0) {
      res.status(404).json({ error: { code: 'not_found', message: 'Product not found' } });
      return;
    }
    
    // Build the update query dynamically based on provided fields
    const updateFields: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;
    
    for (const [key, value] of Object.entries(updateData)) {
      if (value !== undefined) {
        let dbColumn = key;
        let dbValue = value;
        
        // Map frontend field names to database column names
        switch (key) {
          case 'originalPrice':
            dbColumn = 'original_price';
            dbValue = value ?? null;
            break;
          case 'categoryId':
            dbColumn = 'category_id';
            break;
          case 'brandId':
            dbColumn = 'brand_id';
            break;
          case 'ageGroup':
            dbColumn = 'age_group';
            break;
          case 'ageRange':
            dbColumn = 'age_range';
            break;
          case 'reviewCount':
            dbColumn = 'review_count';
            break;
          case 'stockQuantity':
            dbColumn = 'stock_quantity';
            break;
          case 'isActive':
            dbColumn = 'is_active';
            break;
          case 'isNew':
            dbColumn = 'is_new';
            break;
          case 'isBestseller':
            dbColumn = 'is_bestseller';
            break;
          case 'createdAt':
            dbColumn = 'created_at';
            break;
          case 'updatedAt':
            dbColumn = 'updated_at';
            break;
          default:
            dbColumn = key;
        }
        
        updateFields.push(`${dbColumn} = $${paramIndex}`);
        queryParams.push(dbValue);
        paramIndex++;
      }
    }
    
    if (updateFields.length === 0) {
      res.status(400).json({ error: { code: 'validation_error', message: 'No fields to update' } });
      return;
    }
    
    // Add updated_at timestamp
    updateFields.push(`updated_at = now()`);
    
    // Add product ID to query params
    queryParams.push(productId);
    
    // Update the product
    const result = await pool.query(
      `UPDATE products 
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      queryParams
    );
    
    const row = result.rows[0];
    
    // Create audit log entry
    await auditLogService.logAction(
      res.locals.user?.userId ?? null,
      'update_product',
      'product',
      row.id.toString(),
      {
        name: row.name,
        slug: row.slug,
        description: row.description,
        price: row.price,
        originalPrice: row.original_price,
        categoryId: row.category_id,
        brandId: row.brand_id,
        ageGroup: row.age_group,
        ageRange: row.age_range,
        rating: row.rating,
        reviewCount: row.review_count,
        image: row.image,
        stockQuantity: row.stock_quantity,
        isActive: row.is_active,
        isNew: row.is_new,
        isBestseller: row.is_bestseller
      },
      req.ip,
      req.get('User-Agent')
    );
    
    // Format the response to match ProductDto
    const product = {
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      price: Number(row.price),
      originalPrice: row.original_price === null ? null : Number(row.original_price),
      category: row.category_id,
      brand: row.brand_name || '',
      ageGroup: row.age_group,
      ageRange: row.age_range,
      rating: Number(row.rating),
      reviewCount: Number(row.review_count),
      image: row.image,
      stockQuantity: row.stock_quantity,
      inStock: row.is_active && row.stock_quantity > 0,
      isNew: row.is_new,
      isBestseller: row.is_bestseller
    };
    
    res.json({ data: product });
  }));
  
  router.delete('/admin/products/:id', validate(numericIdParamsSchema, 'params'), asyncHandler(async (req, res) => {
    const productId = (res.locals.validated.params as { id: number }).id;
    
    // Check if product exists
    const existCheck = await pool.query('SELECT id, name FROM products WHERE id = $1', [productId]);
    if (existCheck.rows.length === 0) {
      res.status(404).json({ error: { code: 'not_found', message: 'Product not found' } });
      return;
    }
    
    const product = existCheck.rows[0];
    
    // Soft delete the product by setting is_active to false
    await pool.query(
      'UPDATE products SET is_active = false, updated_at = now() WHERE id = $1',
      [productId]
    );
    
    // Create audit log entry
    await auditLogService.logAction(
      res.locals.user?.userId ?? null,
      'delete_product',
      'product',
      productId.toString(),
      {
        id: product.id,
        name: product.name
      },
      req.ip,
      req.get('User-Agent')
    );
    
    res.json({ message: 'Product deleted successfully' });
  }));

// Admin category management
  router.get('/admin/categories', asyncHandler(async (req, res) => {
    const categories = await catalog.listCategories();
    res.json({ data: categories });
  }));
  
  router.post('/admin/categories', validate(createCategorySchema), asyncHandler(async (req, res) => {
    const { id, name, icon, color, ageGroup, description } = req.body as CreateCategoryInput;
    
    // Insert the category
    const result = await pool.query(
      `INSERT INTO categories (
        id, name, icon, color, age_group, description
      ) VALUES (
        $1, $2, $3, $4, $5, $6
      ) RETURNING *`,
      [id, name, icon, color, ageGroup, description]
    );
    
    const row = result.rows[0];
    
    // Create audit log entry
    await auditLogService.logAction(
      res.locals.user?.userId ?? null,
      'create_category',
      'category',
      row.id,
      {
        id: row.id,
        name: row.name,
        icon: row.icon,
        color: row.color,
        ageGroup: row.age_group,
        description: row.description
      },
      req.ip,
      req.get('User-Agent')
    );
    
    // Format the response to match CategoryDto
    const category = {
      id: row.id,
      name: row.name,
      icon: row.icon,
      color: row.color,
      ageGroup: row.age_group,
      slug: row.id
    };
    
    res.status(201).json({ data: category });
  }));
  
  router.patch('/admin/categories/:id', validate(updateCategorySchema), validate(categoryIdParamsSchema, 'params'), asyncHandler(async (req, res) => {
    const categoryId = (res.locals.validated.params as { id: string }).id;
    const updateData = req.body as UpdateCategoryInput;
    
    // Check if category exists
    const existCheck = await pool.query('SELECT id FROM categories WHERE id = $1', [categoryId]);
    if (existCheck.rows.length === 0) {
      res.status(404).json({ error: { code: 'not_found', message: 'Category not found' } });
      return;
    }
    
    // Build the update query dynamically based on provided fields
    const updateFields: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;
    
    for (const [key, value] of Object.entries(updateData)) {
      if (value !== undefined) {
        let dbColumn = key;
        let dbValue = value;
        
        // Map frontend field names to database column names
        switch (key) {
          case 'ageGroup':
            dbColumn = 'age_group';
            break;
          default:
            dbColumn = key;
        }
        
        updateFields.push(`${dbColumn} = $${paramIndex}`);
        queryParams.push(dbValue);
        paramIndex++;
      }
    }
    
    if (updateFields.length === 0) {
      res.status(400).json({ error: { code: 'validation_error', message: 'No fields to update' } });
      return;
    }
    
    // Add updated_at timestamp
    updateFields.push(`updated_at = now()`);
    
    // Add category ID to query params
    queryParams.push(categoryId);
    
    // Update the category
    const result = await pool.query(
      `UPDATE categories 
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      queryParams
    );
    
    const row = result.rows[0];
    
    // Create audit log entry
    await auditLogService.logAction(
      res.locals.user?.userId ?? null,
      'update_category',
      'category',
      row.id,
      {
        id: row.id,
        name: row.name,
        icon: row.icon,
        color: row.color,
        ageGroup: row.age_group,
        description: row.description
      },
      req.ip,
      req.get('User-Agent')
    );
    
    // Format the response to match CategoryDto
    const category = {
      id: row.id,
      name: row.name,
      icon: row.icon,
      color: row.color,
      ageGroup: row.age_group,
      slug: row.id
    };
    
    res.json({ data: category });
  }));
  
  router.delete('/admin/categories/:id', validate(categoryIdParamsSchema, 'params'), asyncHandler(async (req, res) => {
    const categoryId = (res.locals.validated.params as { id: string }).id;
    
    // Check if category exists
    const existCheck = await pool.query('SELECT id, name FROM categories WHERE id = $1', [categoryId]);
    if (existCheck.rows.length === 0) {
      res.status(404).json({ error: { code: 'not_found', message: 'Category not found' } });
      return;
    }
    
    const category = existCheck.rows[0];
    
    // Check if any products are using this category
    const productCheck = await pool.query(
      'SELECT COUNT(*) as count FROM products WHERE category_id = $1',
      [categoryId]
    );
    
    if (parseInt(productCheck.rows[0].count) > 0) {
      res.status(400).json({ 
        error: { 
          code: 'conflict', 
          message: `Cannot delete category because ${productCheck.rows[0].count} products are using it` 
        } 
      });
      return;
    }
    
    // Delete the category
    await pool.query('DELETE FROM categories WHERE id = $1', [categoryId]);
    
    // Create audit log entry
    await auditLogService.logAction(
      res.locals.user?.userId ?? null,
      'delete_category',
      'category',
      categoryId,
      {
        id: category.id,
        name: category.name
      },
      req.ip,
      req.get('User-Agent')
    );
    
    res.json({ message: 'Category deleted successfully' });
  }));

// Admin brand management
  router.get('/admin/brands', asyncHandler(async (req, res) => {
    const brands = await catalog.listBrands();
    res.json({ data: brands });
  }));
  
  router.post('/admin/brands', validate(createBrandSchema), asyncHandler(async (req, res) => {
    const { name, slug, description } = req.body as CreateBrandInput;
    
    // Insert the brand
    const result = await pool.query(
      `INSERT INTO brands (
        name, slug, description
      ) VALUES (
        $1, $2, $3
      ) RETURNING *`,
      [name, slug, description]
    );
    
    const row = result.rows[0];
    
    // Create audit log entry
    await auditLogService.logAction(
      res.locals.user?.userId ?? null,
      'create_brand',
      'brand',
      row.id.toString(),
      {
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description
      },
      req.ip,
      req.get('User-Agent')
    );
    
    // Format the response to match BrandDto
    const brand = {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description
    };
    
    res.status(201).json({ data: brand });
  }));
  
  router.patch('/admin/brands/:id', validate(updateBrandSchema), validate(numericIdParamsSchema, 'params'), asyncHandler(async (req, res) => {
    const brandId = (res.locals.validated.params as { id: number }).id;
    const updateData = req.body as UpdateBrandInput;
    
    // Check if brand exists
    const existCheck = await pool.query('SELECT id FROM brands WHERE id = $1', [brandId]);
    if (existCheck.rows.length === 0) {
      res.status(404).json({ error: { code: 'not_found', message: 'Brand not found' } });
      return;
    }
    
    // Build the update query dynamically based on provided fields
    const updateFields: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;
    
    for (const [key, value] of Object.entries(updateData)) {
      if (value !== undefined) {
        let dbColumn = key;
        let dbValue = value;
        
        // Map frontend field names to database column names
        switch (key) {
          default:
            dbColumn = key;
        }
        
        updateFields.push(`${dbColumn} = $${paramIndex}`);
        queryParams.push(dbValue);
        paramIndex++;
      }
    }
    
    if (updateFields.length === 0) {
      res.status(400).json({ error: { code: 'validation_error', message: 'No fields to update' } });
      return;
    }
    
    // Add updated_at timestamp
    updateFields.push(`updated_at = now()`);
    
    // Add brand ID to query params
    queryParams.push(brandId);
    
    // Update the brand
    const result = await pool.query(
      `UPDATE brands 
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      queryParams
    );
    
    const row = result.rows[0];
    
    // Create audit log entry
    await auditLogService.logAction(
      res.locals.user?.userId ?? null,
      'update_brand',
      'brand',
      row.id.toString(),
      {
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description
      },
      req.ip,
      req.get('User-Agent')
    );
    
    // Format the response to match BrandDto
    const brand = {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description
    };
    
    res.json({ data: brand });
  }));
  
  router.delete('/admin/brands/:id', validate(numericIdParamsSchema, 'params'), asyncHandler(async (req, res) => {
    const brandId = (res.locals.validated.params as { id: number }).id;
    
    // Check if brand exists
    const existCheck = await pool.query('SELECT id, name FROM brands WHERE id = $1', [brandId]);
    if (existCheck.rows.length === 0) {
      res.status(404).json({ error: { code: 'not_found', message: 'Brand not found' } });
      return;
    }
    
    const brand = existCheck.rows[0];
    
    // Check if any products are using this brand
    const productCheck = await pool.query(
      'SELECT COUNT(*) as count FROM products WHERE brand_id = $1',
      [brandId]
    );
    
    if (parseInt(productCheck.rows[0].count) > 0) {
      res.status(400).json({ 
        error: { 
          code: 'conflict', 
          message: `Cannot delete brand because ${productCheck.rows[0].count} products are using it` 
        } 
      });
      return;
    }
    
    // Delete the brand
    await pool.query('DELETE FROM brands WHERE id = $1', [brandId]);
    
    // Create audit log entry
    await auditLogService.logAction(
      res.locals.user?.userId ?? null,
      'delete_brand',
      'brand',
      brandId.toString(),
      {
        id: brand.id,
        name: brand.name
      },
      req.ip,
      req.get('User-Agent')
    );
    
    res.json({ message: 'Brand deleted successfully' });
  }));

// Admin inventory management
  router.get('/admin/inventory', asyncHandler(async (req, res) => {
    // Get pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    
    // Get filter parameters
    const search = req.query.search as string || '';
    const stockFilter = req.query.stock as string || ''; // 'in-stock', 'low-stock', 'out-of-stock', or '' for all
    
    // Build WHERE clause
    const whereConditions = [];
    const queryParams = [];
    
    if (search) {
      queryParams.push(`%${search}%`);
      whereConditions.push(`(p.name ILIKE $${queryParams.length} OR p.description ILIKE $${queryParams.length})`);
    }
    
    if (stockFilter === 'in-stock') {
      whereConditions.push('p.stock_quantity > 0');
    } else if (stockFilter === 'low-stock') {
      whereConditions.push('p.stock_quantity > 0 AND p.stock_quantity <= 10');
    } else if (stockFilter === 'out-of-stock') {
      whereConditions.push('p.stock_quantity = 0');
    }
    // If stockFilter is empty, show all products (no filter)
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Query to get inventory items with total count
    const inventoryQuery = `
      SELECT 
        p.id,
        p.name,
        p.description,
        p.price,
        p.is_active,
        p.stock_quantity,
        p.created_at,
        p.updated_at,
        b.name AS brand_name,
        c.name AS category_name
      FROM products p
      LEFT JOIN brands b ON b.id = p.brand_id
      LEFT JOIN categories c ON c.id = p.category_id
      ${whereClause}
      ORDER BY p.name ASC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM products p
      ${whereClause}
    `;
    
    // Execute queries
    const params = [...queryParams, limit, offset];
    const inventoryResult = await pool.query(inventoryQuery, params);
    const countResult = await pool.query(countQuery, queryParams);
    
    // Format the response
    const inventoryItems = inventoryResult.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      price: Number(row.price),
      isActive: row.is_active,
      stockQuantity: row.stock_quantity,
      brand: row.brand_name || '',
      category: row.category_name || '',
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
    
    res.json({
      data: inventoryItems,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].total),
        totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
      }
    });
  }));
  
  router.post('/admin/inventory/:productId/adjust', validate(inventoryAdjustmentSchema), validate(productIdParamsSchema, 'params'), asyncHandler(async (req, res) => {
    const productId = (res.locals.validated.params as { productId: number }).productId;
    const { quantityDelta, reason, referenceType, referenceId } = req.body as InventoryAdjustmentInput;
    
    // Check if product exists
    const productCheck = await pool.query(
      'SELECT id, name, stock_quantity FROM products WHERE id = $1',
      [productId]
    );
    
    if (productCheck.rows.length === 0) {
      res.status(404).json({ error: { code: 'not_found', message: 'Product not found' } });
      return;
    }
    
    const product = productCheck.rows[0];
    
    try {
      // Adjust inventory using the service
      const result = await inventoryTransactionService.adjustStock(
        productId,
        quantityDelta,
        reason,
        referenceType ?? null,
        referenceId ?? null,
        res.locals.user?.userId ?? null
      );
      
      // Get the updated product info
      const updatedProduct = await pool.query(
        'SELECT stock_quantity FROM products WHERE id = $1',
        [productId]
      );
      
      // Create audit log entry
      await auditLogService.logAction(
        res.locals.user?.userId ?? null,
        'adjust_inventory',
        'product',
        productId.toString(),
        {
          productId: productId,
          productName: product.name,
          quantityDelta: quantityDelta,
          previousStock: product.stock_quantity,
          newStock: updatedProduct.rows[0].stock_quantity,
          reason: reason,
          referenceType: referenceType,
          referenceId: referenceId
        },
        req.ip,
        req.get('User-Agent')
      );
      
      res.json({
        message: 'Inventory adjusted successfully',
        data: {
          productId: productId,
          productName: product.name,
          quantityDelta: quantityDelta,
          previousStock: product.stock_quantity,
          newStock: updatedProduct.rows[0].stock_quantity
        }
      });
    } catch (error) {
      if (error instanceof InsufficientStockError) {
        res.status(409).json({ 
          error: { 
            code: 'insufficient_stock', 
            message: 'Insufficient stock for this adjustment',
            details: error.details 
          } 
        });
      } else if (error instanceof NotFoundError) {
        res.status(404).json({ 
          error: { 
            code: 'not_found', 
            message: error.message 
          } 
        });
      } else {
        throw error;
      }
    }
  }));

// Admin order management
  router.get('/admin/orders', asyncHandler(async (req, res) => {
    // Get pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    
    // Get filter parameters
    const statusFilter = req.query.status as string || ''; // Order status filter
    const paymentStatusFilter = req.query.paymentStatus as string || ''; // Payment status filter
    const customerSearch = req.query.customer as string || ''; // Search by customer name/email
    
    // Build WHERE clause
    const whereConditions = [];
    const queryParams = [];
    
    if (statusFilter) {
      queryParams.push(statusFilter);
      whereConditions.push(`o.status = $${queryParams.length}`);
    }
    
    if (paymentStatusFilter) {
      queryParams.push(paymentStatusFilter);
      whereConditions.push(`o.payment_status = $${queryParams.length}`);
    }
    
    if (customerSearch) {
      queryParams.push(`%${customerSearch}%`);
      whereConditions.push(`(o.customer ->> 'firstName' ILIKE $${queryParams.length} OR o.customer ->> 'lastName' ILIKE $${queryParams.length} OR o.customer ->> 'email' ILIKE $${queryParams.length})`);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Query to get orders with total count
    const ordersQuery = `
      SELECT 
        o.order_number,
        o.status,
        o.payment_status,
        o.customer,
        o.shipping_address,
        o.payment,
        o.pricing,
        o.created_at,
        o.updated_at
      FROM orders o
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM orders o
      ${whereClause}
    `;
    
    // Execute queries
    const params = [...queryParams, limit, offset];
    const ordersResult = await pool.query(ordersQuery, params);
    const countResult = await pool.query(countQuery, queryParams);
    
    // Load order items for each order
    const ordersWithItems = await Promise.all(
      ordersResult.rows.map(async (order: any) => {
        const items = await pool.query(`
          SELECT 
            oi.product_id,
            oi.product_name,
            oi.image,
            oi.brand,
            oi.unit_price,
            oi.quantity
          FROM order_items oi
          WHERE oi.order_number = $1
        `, [order.order_number]);
        
        return {
          id: order.order_number,
          createdAt: order.created_at,
          updatedAt: order.updated_at,
          status: order.status,
          paymentStatus: order.payment_status,
          customer: order.customer,
          shippingAddress: order.shipping_address,
          payment: order.payment,
          pricing: order.pricing,
          items: items.rows
        };
      })
    );
    
    res.json({
      data: ordersWithItems,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].total),
        totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
      }
    });
  }));
  
  router.get('/admin/orders/:id', asyncHandler(async (req, res) => {
    const orderNumber = req.params.id;
    
    // Get order details
    const orderResult = await pool.query(`
      SELECT 
        o.order_number,
        o.status,
        o.payment_status,
        o.customer,
        o.shipping_address,
        o.payment,
        o.pricing,
        o.created_at,
        o.updated_at
      FROM orders o
      WHERE o.order_number = $1
    `, [orderNumber]);
    
    if (orderResult.rows.length === 0) {
      res.status(404).json({ error: { code: 'not_found', message: 'Order not found' } });
      return;
    }
    
    const order = orderResult.rows[0];
    
    // Get order items
    const itemsResult = await pool.query(`
      SELECT 
        oi.product_id,
        oi.product_name,
        oi.image,
        oi.brand,
        oi.unit_price,
        oi.quantity
      FROM order_items oi
      WHERE oi.order_number = $1
    `, [orderNumber]);
    
    const orderWithItems = {
      id: order.order_number,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      status: order.status,
      paymentStatus: order.payment_status,
      customer: order.customer,
      shippingAddress: order.shipping_address,
      payment: order.payment,
      pricing: order.pricing,
      items: itemsResult.rows
    };
    
    res.json({ data: orderWithItems });
  }));
  
  router.patch('/admin/orders/:id/status', validate(orderStatusUpdateSchema), validate(orderNumberParamsSchema, 'params'), asyncHandler(async (req, res) => {
    const orderNumber = (res.locals.validated.params as { id: string }).id;
    const { status } = res.locals.validated.body as OrderStatusUpdateInput;
    
    // Check if order exists
    const orderCheck = await pool.query(
      'SELECT status FROM orders WHERE order_number = $1',
      [orderNumber]
    );
    
    if (orderCheck.rows.length === 0) {
      res.status(404).json({ error: { code: 'not_found', message: 'Order not found' } });
      return;
    }
    
    const currentStatus = orderCheck.rows[0].status;
    
    // Validate status transition (basic validation - can be enhanced)
    const validTransitions: Record<string, string[]> = {
      'pending': ['confirmed', 'cancelled'],
      'confirmed': ['paid', 'cancelled'],
      'paid': ['shipped', 'cancelled'],
      'shipped': ['delivered'],
      'delivered': [], // Final state
      'cancelled': []  // Final state
    };
    
    if (!validTransitions[currentStatus]?.includes(status) && currentStatus !== status) {
      res.status(400).json({ 
        error: { 
          code: 'invalid_transition', 
          message: `Cannot transition from ${currentStatus} to ${status}` 
        } 
      });
      return;
    }
    
    // Update order status
    await pool.query(
      'UPDATE orders SET status = $1, updated_at = now() WHERE order_number = $2',
      [status, orderNumber]
    );
    
    // Create audit log entry for this action
    await auditLogService.logAction(
      res.locals.user?.userId ?? null,
      'update_order_status',
      'order',
      orderNumber,
      {
        orderNumber: orderNumber,
        previousStatus: currentStatus,
        newStatus: status
      },
      req.ip,
      req.get('User-Agent')
    );
    
    res.json({ message: 'Order status updated successfully' });
  }));

// Admin customer management
  router.get('/admin/customers', asyncHandler(async (req, res) => {
    // Get pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    
    // Get filter parameters
    const search = req.query.search as string || '';
    const statusFilter = req.query.status as string || ''; // 'active', 'inactive', or '' for all
    
    // Build WHERE clause
    const whereConditions = ["role = 'customer'"]; // Only show customers, not admins
    const queryParams = [];
    
    if (search) {
      queryParams.push(`%${search}%`);
      whereConditions.push(`(first_name ILIKE $${queryParams.length} OR last_name ILIKE $${queryParams.length} OR email ILIKE $${queryParams.length})`);
    }
    
    if (statusFilter === 'active') {
      whereConditions.push(`status = 'active'`);
    } else if (statusFilter === 'inactive') {
      whereConditions.push(`status = 'suspended'`);
    }
    // If statusFilter is empty, show all customers (no additional filter)
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Query to get customers with total count
    const customersQuery = `
      SELECT 
        id,
        email,
        first_name,
        last_name,
        phone,
        status,
        role,
        created_at,
        last_login_at
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM users
      ${whereClause}
    `;
    
    // Execute queries
    const params = [...queryParams, limit, offset];
    const customersResult = await pool.query(customersQuery, params);
    const countResult = await pool.query(countQuery, queryParams);
    
    // Format the response
    const customers = customersResult.rows.map((row: any) => ({
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      phone: row.phone,
      isActive: row.status === 'active',
      status: row.status,
      role: row.role,
      createdAt: row.created_at,
      lastLoginAt: row.last_login_at
    }));
    
    res.json({
      data: customers,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].total),
        totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
      }
    });
  }));
  
  router.get('/admin/customers/:id', validate(numericIdParamsSchema, 'params'), asyncHandler(async (req, res) => {
    const userId = (res.locals.validated.params as { id: number }).id;
    
    // Get customer details
    const result = await pool.query(`
      SELECT 
        id,
        email,
        first_name,
        last_name,
        phone,
        status,
        role,
        created_at,
        last_login_at
      FROM users
      WHERE id = $1 AND role = 'customer'
    `, [userId]);
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: { code: 'not_found', message: 'Customer not found' } });
      return;
    }
    
    const customer = result.rows[0];
    
    res.json({
      data: {
        id: customer.id,
        email: customer.email,
        firstName: customer.first_name,
        lastName: customer.last_name,
        phone: customer.phone,
        isActive: customer.status === 'active',
        status: customer.status,
        role: customer.role,
        createdAt: customer.created_at,
        lastLoginAt: customer.last_login_at
      }
    });
  }));
  
router.patch('/admin/customers/:id/status', validate(customerStatusUpdateSchema), validate(numericIdParamsSchema, 'params'), asyncHandler(async (req, res) => {
    const userId = (res.locals.validated.params as { id: number }).id;
    const { status } = res.locals.validated.body as CustomerStatusUpdateInput;
    
    // Check if customer exists
    const customerCheck = await pool.query(
      'SELECT id FROM users WHERE id = $1 AND role = \'customer\'',
      [userId]
    );
    
    if (customerCheck.rows.length === 0) {
      res.status(404).json({ error: { code: 'not_found', message: 'Customer not found' } });
      return;
    }
    
    // Update customer status
    await pool.query(
      'UPDATE users SET status = $1, updated_at = now() WHERE id = $2 AND role = \'customer\'',
      [status, userId]
    );
    
    // Create audit log entry for this action
    await auditLogService.logAction(
      res.locals.user?.userId ?? null,
      'update_customer_status',
      'user',
      userId.toString(),
      {
        userId: userId,
        newStatus: status
      },
      req.ip,
      req.get('User-Agent')
    );
    
    res.json({ message: 'Customer status updated successfully' });
  }));

// Admin payment management
  router.get('/admin/payments', asyncHandler(async (req, res) => {
    // Get pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    
    // Get filter parameters
    const statusFilter = req.query.status as string || ''; // Payment status filter
    const methodFilter = req.query.method as string || ''; // Payment method filter
    const amountMin = req.query.amountMin ? parseFloat(req.query.amountMin as string) : undefined;
    const amountMax = req.query.amountMax ? parseFloat(req.query.amountMax as string) : undefined;
    const customerSearch = req.query.customer as string || ''; // Search by customer name/email
    
    // Build WHERE clause
    const whereConditions = [];
    const queryParams = [];
    
    if (statusFilter) {
      queryParams.push(statusFilter);
      whereConditions.push(`p.status = $${queryParams.length}`);
    }
    
    if (methodFilter) {
      queryParams.push(methodFilter);
      whereConditions.push(`p.method = $${queryParams.length}`);
    }
    
    if (amountMin !== undefined) {
      queryParams.push(amountMin * 100); // Convert to paise
      whereConditions.push(`p.amount >= $${queryParams.length}`);
    }
    
    if (amountMax !== undefined) {
      queryParams.push(amountMax * 100); // Convert to paise
      whereConditions.push(`p.amount <= $${queryParams.length}`);
    }
    
    if (customerSearch) {
      queryParams.push(`%${customerSearch}%`);
      whereConditions.push(`(o.customer ->> 'firstName' ILIKE $${queryParams.length} OR o.customer ->> 'lastName' ILIKE $${queryParams.length} OR o.customer ->> 'email' ILIKE $${queryParams.length})`);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Query to get payments with total count
    const paymentsQuery = `
      SELECT 
        p.id,
        p.order_id,
        p.provider,
        p.provider_order_id,
        p.provider_payment_id,
        p.method,
        p.amount,
        p.currency,
        p.status,
        p.failure_code,
        p.failure_message,
        p.created_at,
        p.updated_at,
        p.captured_at,
        o.customer,
        o.created_at as order_created_at
      FROM payments p
      JOIN orders o ON o.id = p.order_id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM payments p
      JOIN orders o ON o.order_id = p.order_id
      ${whereClause}
    `;
    
    // Execute queries
    const params = [...queryParams, limit, offset];
    const paymentsResult = await pool.query(paymentsQuery, params);
    const countResult = await pool.query(countQuery, queryParams);
    
    // Format the response
    const payments = paymentsResult.rows.map((row: any) => ({
      id: row.id.toString(),
      orderId: row.order_id.toString(),
      provider: row.provider,
      providerOrderId: row.provider_order_id,
      providerPaymentId: row.provider_payment_id,
      method: row.method,
      amount: row.amount / 100, // Convert from paise to rupees
      currency: row.currency,
      status: row.status,
      failureCode: row.failure_code,
      failureMessage: row.failure_message,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      capturedAt: row.captured_at,
      customer: row.customer,
      orderCreatedAt: row.order_created_at
    }));
    
    res.json({
      data: payments,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].total),
        totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
      }
    });
  }));
  
  router.get('/admin/payments/:id', validate(numericIdParamsSchema, 'params'), asyncHandler(async (req, res) => {
    const paymentId = (res.locals.validated.params as { id: number }).id;
    
    // Get payment details
    const result = await pool.query(`
      SELECT 
        p.id,
        p.order_id,
        p.provider,
        p.provider_order_id,
        p.provider_payment_id,
        p.method,
        p.amount,
        p.currency,
        p.status,
        p.failure_code,
        p.failure_message,
        p.created_at,
        p.updated_at,
        p.captured_at,
        o.customer,
        o.created_at as order_created_at
      FROM payments p
      JOIN orders o ON o.id = p.order_id
      WHERE p.id = $1
    `, [paymentId]);
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: { code: 'not_found', message: 'Payment not found' } });
      return;
    }
    
    const payment = result.rows[0];
    
    res.json({
      data: {
        id: payment.id.toString(),
        orderId: payment.order_id.toString(),
        provider: payment.provider,
        providerOrderId: payment.provider_order_id,
        providerPaymentId: payment.provider_payment_id,
        method: payment.method,
        amount: payment.amount / 100, // Convert from paise to rupees
        currency: payment.currency,
        status: payment.status,
        failureCode: payment.failure_code,
        failureMessage: payment.failure_message,
        createdAt: payment.created_at,
        updatedAt: payment.updated_at,
        capturedAt: payment.captured_at,
        customer: payment.customer,
        orderCreatedAt: payment.order_created_at
      }
    });
  }));

  // Admin audit log
  router.get('/admin/audit-logs', asyncHandler(async (req, res) => {
    // Get pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    
    // Get filter parameters
    const entityType = req.query.entityType as string || '';
    const adminUserId = req.query.adminUserId ? parseInt(req.query.adminUserId as string) : undefined;
    const startDate = req.query.startDate || '';
    const endDate = req.query.endDate || '';
    
    // Build WHERE clause
    const whereConditions = [];
    const queryParams = [];
    
    if (entityType) {
      queryParams.push(entityType);
      whereConditions.push(`entity_type = $${queryParams.length}`);
    }
    
    if (adminUserId) {
      queryParams.push(adminUserId);
      whereConditions.push(`admin_user_id = $${queryParams.length}`);
    }
    
    if (startDate) {
      queryParams.push(startDate);
      whereConditions.push(`created_at >= $${queryParams.length}`);
    }
    
    if (endDate) {
      queryParams.push(endDate);
      whereConditions.push(`created_at <= $${queryParams.length}`);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Query to get audit logs with total count
    const auditLogsQuery = `
      SELECT 
        al.id,
        al.admin_user_id,
        al.action,
        al.entity_type,
        al.entity_id,
        al.changes,
        al.ip_address,
        al.user_agent,
        al.created_at,
        u.email as admin_email,
        u.first_name as admin_first_name,
        u.last_name as admin_last_name
      FROM admin_audit_logs al
      LEFT JOIN users u ON u.id = al.admin_user_id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM admin_audit_logs al
      ${whereClause}
    `;
    
    try {
      // Execute queries
      const params = [...queryParams, limit, offset];
      const auditLogsResult = await pool.query(auditLogsQuery, params);
      const countResult = await pool.query(countQuery, queryParams);
      
      // Format the response
      const auditLogs = auditLogsResult.rows.map((row: any) => ({
        id: row.id,
        adminUserId: row.admin_user_id,
        adminEmail: row.admin_email,
        adminFirstName: row.admin_first_name,
        adminLastName: row.admin_last_name,
        action: row.action,
        entityType: row.entity_type,
        entityId: row.entity_id,
        changes: row.changes,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        createdAt: row.created_at
      }));
      
      res.json({
        data: auditLogs,
        pagination: {
          page,
          limit,
          total: parseInt(countResult.rows[0].total),
          totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
        }
      });
    } catch (error) {
      // If the table doesn't exist yet, return an empty array
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.warn('Admin audit log table does not exist yet:', message);
      res.json({
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0
        }
      });
    }
  }));

  // ── Webhooks ──────────────────────────────────────────────────────────
    // Webhook endpoint for Razorpay - no authentication, but signature verification
    router.post(
      '/webhooks/razorpay',
      razorpayWebhookVerification(config.razorpay.webhookSecret),
      asyncHandler(async (req: Request, res: Response) => {
        // The raw body is attached to the request by the middleware
        const rawBody = (req as any).rawBody as string;
        
        // Parse the JSON payload
        let payload: Record<string, unknown>;
        try {
          payload = JSON.parse(rawBody);
        } catch (err) {
          return res.status(400).json({ 
            error: { 
              code: 'invalid_payload', 
              message: 'Invalid JSON payload' 
            } 
          });
        }
        
        const eventType = payload.event as string;
        if (!eventType) {
          return res.status(400).json({ 
            error: { 
              code: 'missing_event_type', 
              message: 'Missing event type in webhook payload' 
            } 
          });
        }
        
        await paymentController.handleWebhook('razorpay', eventType, payload);
        res.status(200).json({ received: true });
      })
    );

   return router;
}
