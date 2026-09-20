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
 <h1 className="text-4xl font-extrabold text-[var(--ink-strong)]">Admin</h1>
 <p className="text-sm font-semibold text-[var(--muted-light)] mt-2">
 Store operations — products, orders, inventory and customers.
 </p>

 <nav aria-label="Admin sections"className="mt-8 flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
 {adminTabs.map(({ to, label, icon: Icon, end }) => (
 <NavLink
 key={to}
 to={to}
 end={end}
 className={({ isActive }) =>
 cn(
 'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors',
 isActive
 ? 'bg-[var(--ink-strong)] text-[var(--page)] shadow-md'
 : 'bg-[var(--surface-soft)] text-[var(--muted)] hover:text-[var(--ink-strong)] hover:bg-[var(--hairline)]'
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
