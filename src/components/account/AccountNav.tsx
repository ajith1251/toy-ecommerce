import { NavLink } from 'react-router-dom';
import { Package, Heart, MapPin, ShieldCheck, User } from 'lucide-react';
import { cn } from '../../lib/cn';

const tabs = [
  { to: '/account', label: 'Overview', icon: User, end: true },
  { to: '/account/orders', label: 'Orders', icon: Package },
  { to: '/account/wishlist', label: 'Wishlist', icon: Heart },
  { to: '/account/addresses', label: 'Addresses', icon: MapPin },
  { to: '/account/security', label: 'Security', icon: ShieldCheck },
];

export default function AccountNav() {
  return (
    <nav aria-label="Account" className="flex flex-wrap gap-2">
      {tabs.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all cursor-pointer',
              isActive
                ? 'bg-red-500 text-white shadow-md'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            )
          }
        >
          <Icon size={16} aria-hidden />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
