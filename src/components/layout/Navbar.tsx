import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ShoppingBag, Menu, X, Search, Heart, User } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useShop } from '../../context/ShopContext';
import { useAuth } from '../../context/AuthContext';

interface NavbarProps {
  onCartOpen: () => void;
}

const navLinks = [
  { to: '/products', label: 'Shop All', accent: 'var(--accent-purple)' },
  { to: '/category/build', label: 'Build', accent: 'var(--accent-blue)' },
  { to: '/category/create', label: 'Create', accent: 'var(--accent-yellow)' },
  { to: '/category/discover', label: 'Discover', accent: 'var(--accent-coral)' },
];

export default function Navbar({ onCartOpen }: NavbarProps) {
  const { cartTotalItems, wishlistCount } = useShop();
  const { status, user, logout } = useAuth();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const authArea = (mobile: boolean) =>
    status === 'authenticated' && user ? (
      <div className={cn('flex items-center gap-6', mobile && 'flex-col items-start gap-4 mt-8')}>
        <Link
          to="/account"
          onClick={() => setMenuOpen(false)}
          className="flex items-center gap-2 text-[var(--ink)] hover:text-[var(--accent-blue)] font-medium transition-colors"
          aria-label="My Account"
        >
          {mobile && <User size={20} />}
          My Account
        </Link>
        <button
          onClick={() => {
            if (!mobile) navigate('/');
            void logout();
          }}
          className="text-[var(--muted)] hover:text-[var(--accent-coral)] font-medium transition-colors cursor-pointer"
          aria-label="Log out"
        >
          Log out
        </button>
      </div>
    ) : status === 'unauthenticated' ? (
      <Link
        to="/login"
        onClick={() => setMenuOpen(false)}
        className="flex items-center gap-2 text-[var(--ink)] hover:text-[var(--accent-blue)] font-medium transition-colors"
        aria-label="Log in"
      >
        {mobile && <User size={20} />}
        Log in
      </Link>
    ) : null;

  return (
    <nav
      className={cn(
        'fixed w-full z-50 transition-all duration-300',
        scrolled ? 'bg-[var(--page)]/95 backdrop-blur-md border-b border-[var(--hairline)] py-2' : 'bg-transparent py-4'
      )}
    >
      <div className="mx-auto flex items-center justify-between gap-6 px-6 max-w-[1440px]">
        {/* Logo and Primary Nav */}
        <div className="flex items-center gap-12">
          <Link to="/" className="text-2xl font-extrabold tracking-tight text-[var(--ink-strong)] flex items-center">
            ToyBox<span className="text-[var(--accent-blue)]">.</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={() =>
                  cn(
                    'group relative inline-flex items-center gap-1.5 pb-1 text-sm font-semibold transition-colors',
                    'text-[var(--ink)] hover:text-[var(--accent-blue)]'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      aria-hidden="true"
                      className="h-1.5 w-1.5 rounded-full opacity-0 scale-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300"
                      style={{ backgroundColor: link.accent }}
                    />
                    <span className={isActive ? 'text-[var(--accent-blue)]' : undefined}>{link.label}</span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        'absolute bottom-0 left-0 h-[3px] w-full origin-left rounded-full transition-transform duration-300',
                        isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                      )}
                      style={{ backgroundColor: link.accent }}
                    />
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>

        {/* Secondary Actions */}
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-6">
            <Link to="/search" aria-label="Search" className="text-[var(--ink)] hover:text-[var(--accent-blue)] transition-colors">
              <Search size={20} />
            </Link>
            <Link to="/wishlist" aria-label="Wishlist" className="relative text-[var(--ink)] hover:text-[var(--accent-blue)] transition-colors">
              <Heart size={20} />
              {wishlistCount > 0 && (
                <span className="absolute -top-1.5 -right-2 w-4 h-4 bg-[var(--accent-coral)] text-white text-[10px] font-bold flex items-center justify-center rounded-full">
                  {wishlistCount}
                </span>
              )}
            </Link>
            <div className="w-px h-4 bg-[var(--hairline)]" />
            <Link to="/account" aria-label="Account" className="text-[var(--ink)] hover:text-[var(--accent-blue)] transition-colors">
              <User size={20} />
            </Link>
          </div>

          <button
            onClick={onCartOpen}
            aria-label={`Open cart (${cartTotalItems} items)`}
            className="flex items-center gap-2 bg-[var(--ink-strong)] text-white px-5 py-2.5 rounded-[var(--radius-button,8px)] text-sm font-semibold transition-all hover:bg-[var(--accent-blue)] shadow-sm cursor-pointer active:scale-95"
          >
            <ShoppingBag size={18} />
            <span className="hidden sm:inline">Cart</span>
            {cartTotalItems > 0 && (
              <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs ml-1">{cartTotalItems}</span>
            )}
          </button>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            className="md:hidden p-2 text-[var(--ink)] cursor-pointer"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 top-[73px] z-40 flex flex-col px-6 pt-6 pb-16 overflow-y-auto bg-[var(--page)] h-[calc(100vh-73px)]">
          <div className="flex flex-col gap-6">
            {navLinks.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 text-3xl font-bold tracking-tight',
                    isActive ? 'text-[var(--accent-blue)]' : 'text-[var(--ink-strong)]'
                  )
                }
              >
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: link.accent }} />
                {link.label}
              </NavLink>
            ))}
          </div>

          <div className="w-full h-px bg-[var(--hairline)] my-8" />
          
          <div className="flex flex-col gap-6">
            <Link to="/search" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 text-lg font-medium text-[var(--ink)]">
              <Search size={24} /> Search
            </Link>
            <Link to="/wishlist" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 text-lg font-medium text-[var(--ink)]">
              <Heart size={24} /> Wishlist {wishlistCount > 0 && `(${wishlistCount})`}
            </Link>
            <Link to="/orders" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 text-lg font-medium text-[var(--ink)]">
              <ShoppingBag size={24} /> Orders
            </Link>
          </div>

          <div className="mt-8">{authArea(true)}</div>
          {status === 'unauthenticated' && (
            <Link
              to="/register"
              onClick={() => setMenuOpen(false)}
              className="mt-4 text-[var(--muted)] font-medium underline underline-offset-4"
            >
              Create an account
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
