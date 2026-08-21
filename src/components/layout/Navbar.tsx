import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Search, ShoppingBag, Menu, X, Heart, PackageOpen, UserCircle2, LogOut, LogIn, LayoutDashboard } from 'lucide-react';
import { cn } from '../../lib/cn';
import ThemeToggle from '../ui/ThemeToggle';
import { getCategoriesByAgeGroup } from '../../services/productService';
import { useShop } from '../../context/ShopContext';
import { useAuth } from '../../context/AuthContext';
import type { AgeGroup } from '../../types';

interface NavbarProps {
  onCartOpen: () => void;
}

const ageTabs: { value: AgeGroup; label: string; emoji: string }[] = [
  { value: 'kids', label: 'Kids', emoji: '🧒' },
  { value: 'teens', label: 'Teens', emoji: '🧑' },
  { value: 'adults', label: 'Adults', emoji: '🎯' },
];

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/products', label: 'Toys' },
  { to: '/wishlist', label: 'Wishlist' },
  { to: '/orders', label: 'Orders' },
];

export default function Navbar({ onCartOpen }: NavbarProps) {
  const { cartTotalItems, wishlistCount, theme, toggleTheme, filters, setFilter } = useShop();
  const { status, user, logout } = useAuth();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [megaMenuOpen, setMegaMenuOpen] = useState<AgeGroup | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const categoriesByAge = (age: AgeGroup) => getCategoriesByAgeGroup(age);

  const handleTabChange = (tab: AgeGroup) => {
    setFilter('ageGroup', tab);
    setFilter('category', 'all');
    setFilter('searchQuery', '');
    setMenuOpen(false);
  };

  const activeTab = filters.ageGroup;

  return (
    <nav
      className={cn(
        'fixed w-full z-50 transition-all duration-300',
        scrolled
          ? 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg py-3 shadow-sm'
          : 'bg-transparent py-5'
      )}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-10">
          <Link to="/" className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <span className="text-3xl">🧸</span>
            <span className="bg-gradient-to-r from-red-500 to-amber-500 bg-clip-text text-transparent">
              ToyBox
            </span>
          </Link>

          {/* Desktop Age Tabs */}
          <div className="hidden md:flex items-center bg-slate-100 dark:bg-slate-800 rounded-full p-1">
            {ageTabs.map(tab => (
              <button
                key={tab.value}
                onClick={() => handleTabChange(tab.value)}
                onMouseEnter={() => setMegaMenuOpen(tab.value)}
                onMouseLeave={() => setMegaMenuOpen(null)}
                className={cn(
                  'px-5 py-2 rounded-full text-sm font-semibold transition-all cursor-pointer relative',
                  activeTab === tab.value
                    ? tab.value === 'kids'
                      ? 'bg-blue-500 text-white shadow-md'
                      : tab.value === 'teens'
                      ? 'bg-purple-500 text-white shadow-md'
                      : 'bg-slate-900 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                {tab.emoji} {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Desktop nav links */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'relative px-3 py-2 rounded-full text-sm font-semibold transition-colors',
                    isActive
                      ? 'text-red-500 bg-red-50 dark:bg-red-500/10'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  )
                }
              >
                {link.label === 'Wishlist' ? (
                  <span className="flex items-center gap-1.5">
                    <Heart size={16} aria-hidden />
                    Wishlist
                    {wishlistCount > 0 && (
                      <span className="min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                        {wishlistCount}
                      </span>
                    )}
                  </span>
                ) : (
                  link.label
                )}
              </NavLink>
            ))}
          </div>

          <Link
            to="/search"
            aria-label="Search toys"
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer hidden md:block"
          >
            <Search size={20} />
          </Link>

          <ThemeToggle theme={theme} onToggle={toggleTheme} />

          <Link
            to="/orders"
            title="Order History"
            aria-label="Order History"
            className="relative p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer hidden sm:block"
          >
            <PackageOpen size={20} />
          </Link>

          {/* Auth: guest → log in / register; account → profile + logout */}
          {status === 'authenticated' && user ? (
            <>
              {user.role === 'admin' && (
                <Link
                  to="/admin"
                  title="Admin dashboard"
                  aria-label="Admin dashboard"
                  className="hidden sm:flex p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
                >
                  <LayoutDashboard size={20} />
                </Link>
              )}
              <Link
                to="/account"
                title="My Account"
                aria-label="My Account"
                className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <UserCircle2 size={20} />
                <span className="max-w-24 truncate">{user.firstName || user.email.split('@')[0]}</span>
              </Link>
              <button
                onClick={() => {
                  // Leave the protected route BEFORE the session flips, so
                  // RequireAuth can't redirect to /login mid-logout.
                  navigate('/');
                  void logout();
                }}
                title="Log out"
                aria-label="Log out"
                className="hidden sm:flex p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
              >
                <LogOut size={20} />
              </button>
            </>
          ) : status === 'unauthenticated' ? (
            <Link
              to="/login"
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-red-500 dark:hover:bg-red-500 dark:hover:text-white transition-all cursor-pointer"
            >
              <LogIn size={16} aria-hidden />
              Log in
            </Link>
          ) : null}

          <button
            onClick={onCartOpen}
            aria-label={`Open cart (${cartTotalItems} items)`}
            className="relative p-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full hover:bg-red-500 dark:hover:bg-red-500 transition-all active:scale-90 cursor-pointer"
          >
            <ShoppingBag size={20} />
            {cartTotalItems > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900 font-bold animate-bounce">
                {cartTotalItems}
              </span>
            )}
          </button>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            className="md:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mega Menu */}
      {megaMenuOpen && (
        <div
          className="hidden md:block absolute top-full left-0 w-full bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shadow-xl"
          onMouseEnter={() => setMegaMenuOpen(megaMenuOpen)}
          onMouseLeave={() => setMegaMenuOpen(null)}
        >
          <div className="max-w-7xl mx-auto px-6 py-8">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              {megaMenuOpen === 'kids' ? '🧒 Kids Categories' : megaMenuOpen === 'teens' ? '🧑 Teens Categories' : '🎯 Adults Categories'}
            </h3>
            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
              {categoriesByAge(megaMenuOpen).map(cat => (
                <Link
                  key={cat.id}
                  to={`/category/${cat.id}`}
                  onClick={() => setMegaMenuOpen(null)}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-lg', cat.color)}>
                    {cat.icon}
                  </div>
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300 text-center">{cat.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shadow-lg">
          <div className="flex flex-col p-4 gap-2">
            <div className="grid grid-cols-2 gap-2">
              {navLinks.map(link => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/'}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'px-4 py-3 rounded-xl text-left font-semibold transition-all',
                      isActive
                        ? 'bg-red-500 text-white'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                    )
                  }
                >
                  {link.label === 'Wishlist' && wishlistCount > 0
                    ? `${link.label} (${wishlistCount})`
                    : link.label}
                </NavLink>
              ))}
            </div>
            <hr className="border-slate-100 dark:border-slate-800 my-2" />
            {ageTabs.map(tab => (
              <button
                key={tab.value}
                onClick={() => handleTabChange(tab.value)}
                className={cn(
                  'px-4 py-3 rounded-xl text-left font-semibold transition-all',
                  activeTab === tab.value
                    ? tab.value === 'kids'
                      ? 'bg-blue-500 text-white'
                      : tab.value === 'teens'
                      ? 'bg-purple-500 text-white'
                      : 'bg-slate-900 text-white'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                )}
              >
                {tab.emoji} {tab.label}
              </button>
            ))}
            <hr className="border-slate-100 dark:border-slate-800 my-2" />
            <div className="grid grid-cols-2 gap-2">
              {categoriesByAge(activeTab).slice(0, 8).map(cat => (
                <Link
                  key={cat.id}
                  to={`/category/${cat.id}`}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm cursor-pointer"
                >
                  <span>{cat.icon}</span>
                  <span className="text-slate-700 dark:text-slate-300">{cat.name}</span>
                </Link>
              ))}
            </div>
            <hr className="border-slate-100 dark:border-slate-800 my-2" />
            {status === 'authenticated' && user ? (
              <div className="grid grid-cols-2 gap-2">
                {user.role === 'admin' && (
                  <Link
                    to="/admin"
                    onClick={() => setMenuOpen(false)}
                    className="px-4 py-3 rounded-xl text-left font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                  >
                    Admin
                  </Link>
                )}
                <Link
                  to="/account"
                  onClick={() => setMenuOpen(false)}
                  className="px-4 py-3 rounded-xl text-left font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  My Account
                </Link>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    navigate('/');
                    void logout();
                  }}
                  className="px-4 py-3 rounded-xl text-left font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                >
                  Log out
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className="px-4 py-3 rounded-xl text-left font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMenuOpen(false)}
                  className="px-4 py-3 rounded-xl text-left font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
