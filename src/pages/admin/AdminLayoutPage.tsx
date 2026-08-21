import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, Boxes, Users, CreditCard, ScrollText } from 'lucide-react';
import { cn } from '../../lib/cn';

const adminTabs = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/products', label: 'Products', icon: Package, end: false },
  { to: '/admin/inventory', label: 'Inventory', icon: Boxes, end: false },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingCart, end: false },
  { to: '/admin/customers', label: 'Customers', icon: Users, end: false },
  { to: '/admin/payments', label: 'Payments', icon: CreditCard, end: false },
  { to: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText, end: false },
];

/** Shell for the /admin area — tab navigation plus the active page. */
export default function AdminLayoutPage() {
  return (
    <div className="pt-24 pb-10">
      <div className="max-w-7xl mx-auto px-6 pt-4">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Admin</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Store operations — products, orders, inventory and customers.
        </p>

        <nav aria-label="Admin sections" className="mt-6 flex gap-2 overflow-x-auto pb-2">
          {adminTabs.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors',
                  isActive
                    ? 'bg-red-500 text-white shadow-md'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                )
              }
            >
              <Icon size={16} aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-6">
        <Outlet />
      </div>
    </div>
  );
}
