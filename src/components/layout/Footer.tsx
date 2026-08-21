import { Link } from 'react-router-dom';

const shopLinks = [
  { label: 'Kids Toys', to: '/products' },
  { label: 'Teen Gear', to: '/products' },
  { label: 'Adult Collectibles', to: '/products' },
  { label: 'New Arrivals', to: '/products' },
  { label: 'Bestsellers', to: '/products' },
  { label: 'Sale', to: '/products' },
];

export default function Footer() {
  return (
    <footer className="bg-slate-900 dark:bg-slate-950 text-white py-16">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="col-span-1 md:col-span-1">
          <Link to="/" className="text-2xl font-extrabold mb-4 flex items-center gap-2">
            <span className="text-3xl">🧸</span>
            <span className="bg-gradient-to-r from-red-400 to-amber-400 bg-clip-text text-transparent">
              ToyBox
            </span>
          </Link>
          <p className="text-slate-400 leading-relaxed mb-6">
            Premium toys for kids and collectibles for adults. Quality guaranteed.
          </p>
          <div className="flex gap-4">
            <a href="#" className="text-slate-400 hover:text-red-400 transition-colors font-semibold">FB</a>
            <a href="#" className="text-slate-400 hover:text-red-400 transition-colors font-semibold">IG</a>
            <a href="#" className="text-slate-400 hover:text-red-400 transition-colors font-semibold">X</a>
            <a href="#" className="text-slate-400 hover:text-red-400 transition-colors font-semibold">YT</a>
          </div>
        </div>

        <div>
          <h4 className="font-bold text-white mb-6">Shop</h4>
          <ul className="space-y-3 text-slate-400">
            {shopLinks.map(link => (
              <li key={link.label}>
                <Link to={link.to} className="hover:text-red-400 transition-colors">{link.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        {[
          { title: 'Support', links: ['Help Center', 'Shipping Info', 'Returns', 'Track Order', 'Contact Us'] },
          { title: 'Company', links: ['About Us', 'Careers', 'Blog', 'Press', 'Partners'] },
        ].map(col => (
          <div key={col.title}>
            <h4 className="font-bold text-white mb-6">{col.title}</h4>
            <ul className="space-y-3 text-slate-400">
              {col.links.map(link => (
                <li key={link}>
                  <a href="#" className="hover:text-red-400 transition-colors">{link}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-12 pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 text-slate-500 text-sm">
        <p>&copy; 2026 ToyBox. All rights reserved.</p>
        <div className="flex gap-6">
          <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
        </div>
      </div>
    </footer>
  );
}
