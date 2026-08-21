import type { RouteObject } from 'react-router-dom';
import Layout from './components/layout/Layout';
import RequireAuth from './components/RequireAuth';
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CategoryPage from './pages/CategoryPage';
import BrandPage from './pages/BrandPage';
import SearchPage from './pages/SearchPage';
import WishlistPage from './pages/WishlistPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrdersPage from './pages/OrdersPage';
import OrderDetailsPage from './pages/OrderDetailsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import AccountPage from './pages/AccountPage';
import AccountAddressesPage from './pages/AccountAddressesPage';
import AccountSecurityPage from './pages/AccountSecurityPage';
import RequireAdmin from './components/RequireAdmin';
import AdminLayoutPage from './pages/admin/AdminLayoutPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminProductsPage from './pages/admin/AdminProductsPage';
import AdminInventoryPage from './pages/admin/AdminInventoryPage';
import AdminOrdersPage from './pages/admin/AdminOrdersPage';
import AdminCustomersPage from './pages/admin/AdminCustomersPage';
import AdminPaymentsPage from './pages/admin/AdminPaymentsPage';
import AdminAuditLogsPage from './pages/admin/AdminAuditLogsPage';
import NotFoundPage from './pages/NotFoundPage';

/**
 * Route table shared by the browser app and the test suite
 * (createMemoryRouter uses the same table).
 */
export const appRoutes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'products', element: <ProductsPage /> },
      { path: 'product/:id', element: <ProductDetailPage /> },
      { path: 'category/:slug', element: <CategoryPage /> },
      { path: 'brand/:slug', element: <BrandPage /> },
      { path: 'search', element: <SearchPage /> },
      { path: 'wishlist', element: <WishlistPage /> },
      { path: 'cart', element: <CartPage /> },
      { path: 'checkout/:step', element: <CheckoutPage /> },
      { path: 'orders', element: <OrdersPage /> },
      { path: 'orders/:id', element: <OrderDetailsPage /> },
      // Auth
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },
      { path: 'account', element: <RequireAuth><AccountPage /></RequireAuth> },
      { path: 'account/orders', element: <RequireAuth><OrdersPage /></RequireAuth> },
      { path: 'account/wishlist', element: <RequireAuth><WishlistPage /></RequireAuth> },
      { path: 'account/addresses', element: <RequireAuth><AccountAddressesPage /></RequireAuth> },
      { path: 'account/security', element: <RequireAuth><AccountSecurityPage /></RequireAuth> },
      // Admin (session + admin role; the server enforces this independently)
      {
        path: 'admin',
        element: <RequireAdmin><AdminLayoutPage /></RequireAdmin>,
        children: [
          { index: true, element: <AdminDashboardPage /> },
          { path: 'products', element: <AdminProductsPage /> },
          { path: 'inventory', element: <AdminInventoryPage /> },
          { path: 'orders', element: <AdminOrdersPage /> },
          { path: 'customers', element: <AdminCustomersPage /> },
          { path: 'payments', element: <AdminPaymentsPage /> },
          { path: 'audit-logs', element: <AdminAuditLogsPage /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
