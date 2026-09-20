import { Link } from 'react-router-dom';

const columns = [
  {
    title: 'Shop',
    links: [
      { label: 'Catalog', to: '/products' },
      { label: 'Search', to: '/search' },
      { label: 'Wishlist', to: '/wishlist' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'Cart', to: '/cart' },
      { label: 'Orders', to: '/orders' },
      { label: 'Log in', to: '/login' },
    ],
  },
];

export default function Footer() {
  return (
    <footer
      className="px-6 pb-10 pt-16"
      style={{ backgroundColor: '#ececea' }}
    >
      <div className="mx-auto max-w-[1120px]">
        <div className="flex flex-col justify-between gap-12 md:flex-row">
          <div>
            <Link to="/" className="text-xl tracking-tight" style={{ color: 'var(--ink-strong)' }}>
              ToyBox
            </Link>
            <p className="mt-3 max-w-[280px] text-[15px]" style={{ color: 'var(--muted)' }}>
              One quiet system for your entire toy store.
            </p>
          </div>
          {columns.map(col => (
            <div key={col.title}>
              <p className="eyebrow mb-4">{col.title}</p>
              <ul className="space-y-2">
                {col.links.map(link => (
                  <li key={link.label}>
                    <Link to={link.to} className="u-link text-[15px]">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div
          className="mt-14 flex flex-col justify-between gap-2 pt-6 text-xs md:flex-row"
          style={{ color: 'var(--muted)', borderTop: '1px solid var(--hairline)' }}
        >
          <p>&copy; 2026 ToyBox. All rights reserved.</p>
          <p>Privacy · Terms</p>
        </div>
      </div>
    </footer>
  );
}
