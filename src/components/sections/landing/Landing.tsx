import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { Boxes, Gift, ShieldCheck, Sparkles } from 'lucide-react';
import { useReveal } from '../../../hooks/useReveal';
import { getProducts } from '../../../services/productService';
import { formatMoney } from '../../../utils/orderCalculations';
import Button from '../../ui/Button';

function Eyebrow({ children, className }: { children: string; className?: string }) {
  return <p className={`eyebrow mb-4 ${className || ''}`}>{children}</p>;
}

export function LandingHero() {
  const ref = useReveal<HTMLElement>();
  const [on, setOn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setOn(true), 60);
    return () => clearTimeout(t);
  }, []);

  const heroImages = useMemo(() => {
    return getProducts().filter(p => p.image).slice(0, 7);
  }, []);

  return (
    <section ref={ref} className="relative flex flex-col justify-center min-h-[90svh] px-6 bg-[var(--page)] overflow-hidden">
      {/* Decorative subtle background elements */}
      <div className="absolute top-1/4 left-10 w-64 h-64 bg-[var(--accent-yellow)] opacity-10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-10 w-80 h-80 bg-[var(--accent-blue)] opacity-10 rounded-full blur-3xl pointer-events-none" />

      <div className="mx-auto w-full max-w-[1440px] pt-32 pb-16 grid lg:grid-cols-2 gap-16 items-center relative z-10">
        <div className={on ? 'lines' : 'lines opacity-0'}>
          <div className="mb-6">
            <div className="flex flex-wrap items-center gap-3">
              <p className="eyebrow text-[var(--accent-blue)]">Welcome to ToyBox</p>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-yellow)] px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest text-[var(--ink-strong)] border-2 border-[var(--ink-strong)] shadow-md -rotate-2 hover:rotate-0 transition-transform duration-300">
                <Sparkles size={14} strokeWidth={3} aria-hidden="true" />
                New drops weekly
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--hairline)] bg-white px-3 py-1 text-xs font-semibold text-[var(--ink-strong)] shadow-sm hover:-translate-y-0.5 transition-transform">
                <Boxes size={14} className="text-[var(--accent-blue)]" aria-hidden="true" />
                54 toys ready to play
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--hairline)] bg-white px-3 py-1 text-xs font-semibold text-[var(--ink-strong)] shadow-sm hover:-translate-y-0.5 transition-transform">
                <Gift size={14} className="text-[var(--accent-coral)]" aria-hidden="true" />
                Same-day gift wrap
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--hairline)] bg-white px-3 py-1 text-xs font-semibold text-[var(--ink-strong)] shadow-sm hover:-translate-y-0.5 transition-transform">
                <ShieldCheck size={14} className="text-[var(--accent-green)]" aria-hidden="true" />
                Kid-tested &amp; approved
              </span>
            </div>
          </div>
          <h1 className="text-6xl sm:text-7xl lg:text-8xl font-extrabold tracking-tight text-[var(--ink-strong)] leading-[1.05] mb-6">
            <span className="line-mask block text-[var(--accent-coral)]"><span>PLAY.</span></span>
            <span className="line-mask block text-[var(--accent-yellow)]"><span>CREATE.</span></span>
            <span className="line-mask block text-[var(--accent-blue)]"><span>DISCOVER.</span></span>
          </h1>
          <p className="mt-8 text-xl max-w-[500px] text-[var(--muted)] leading-relaxed">
            Premium toys for every age. From imaginative playsets to collector-grade builds. Find something worth playing with.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link to="/products">
              <Button size="lg" className="rounded-full px-8 shadow-lg shadow-[var(--accent-blue)]/20 hover:scale-105 transition-transform">
                Start shopping
              </Button>
            </Link>
            <Link to="/category/build">
              <Button size="lg" variant="secondary" className="rounded-full px-8 hover:scale-105 transition-transform border-[var(--hairline)] shadow-sm">
                Shop Builders
              </Button>
            </Link>
          </div>

          {heroImages[3] && (
            <div className="mt-10 relative max-w-[400px]">
              <img
                src={heroImages[3].image}
                alt={heroImages[3].name}
                className="w-full h-[240px] object-cover rounded-[24px] shadow-xl -rotate-2 hover:rotate-0 transition-all duration-500 border-4 border-white"
              />
              <div className="absolute -bottom-4 -right-4 bg-white rounded-2xl shadow-lg px-4 py-2 border border-[var(--hairline)]">
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--accent-blue)]">Featured</p>
                <p className="text-sm font-semibold text-[var(--ink-strong)] leading-tight">{heroImages[3].name}</p>
              </div>
            </div>
          )}

          {heroImages.length > 4 && (
            <div className="mt-8 flex items-center gap-4">
              <div className="flex -space-x-3">
                {heroImages.slice(4, 7).map(p => (
                  <img
                    key={p.id}
                    src={p.image}
                    alt=""
                    className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-md"
                  />
                ))}
              </div>
              <p className="text-sm text-[var(--muted)]">
                <span className="font-bold text-[var(--accent-coral)]">★ 4.9</span>{' '}
                <span className="font-semibold text-[var(--ink-strong)]">from 2,400+ happy families</span>
              </p>
            </div>
          )}
        </div>

        {/* Hero Imagery */}
        <div className="relative h-[500px] lg:h-[650px] w-full hidden md:block">
          {heroImages[0] && (
            <img src={heroImages[0].image} alt="Hero toy 1" className="absolute top-10 right-10 w-[300px] h-[380px] object-cover rounded-[24px] shadow-2xl rotate-3 hover:rotate-0 transition-all duration-500 z-20 border-4 border-white" />
          )}
          {heroImages[1] && (
            <img src={heroImages[1].image} alt="Hero toy 2" className="absolute bottom-10 left-20 w-[240px] h-[300px] object-cover rounded-[24px] shadow-xl -rotate-6 hover:rotate-0 transition-all duration-500 z-30 border-4 border-white" />
          )}
          {heroImages[2] && (
            <img src={heroImages[2].image} alt="Hero toy 3" className="absolute top-1/2 left-0 w-[200px] h-[200px] object-cover rounded-full shadow-lg rotate-12 hover:rotate-0 transition-all duration-500 z-10 border-4 border-white" />
          )}
          {heroImages[4] && (
            <img src={heroImages[4].image} alt="Hero toy 4" className="absolute top-0 left-2 w-[180px] h-[140px] object-cover rounded-[20px] shadow-lg -rotate-6 hover:rotate-0 transition-all duration-500 z-0 border-4 border-white" />
          )}
          <div className="absolute bottom-4 right-4 z-40 bg-white rounded-2xl shadow-xl px-5 py-3 border border-[var(--hairline)] rotate-2">
            <p className="text-sm font-bold text-[var(--ink-strong)]">
              <span className="text-[var(--accent-yellow)]">★</span> Free shipping over $50
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function SocialProof() {
  const PARTNERS = ['Mattel', 'LEGO Group', 'Hasbro', 'Funko', 'Playmobil', 'Ravensburger'];
  return (
    <section aria-label="Trusted partners" className="px-6 py-16 bg-[var(--surface-soft)] border-y border-[var(--hairline)]">
      <div className="mx-auto max-w-[1440px] flex flex-col md:flex-row items-center justify-between gap-8">
        <p className="text-sm font-semibold tracking-widest uppercase text-[var(--muted-light)]">Curating the best brands</p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-60">
          {PARTNERS.map(name => (
            <span key={name} className="text-xl font-bold tracking-tight text-[var(--ink)] uppercase">
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ProductProof() {
  // Skipping the technical mockup section as it's not very "Playful Premium". Replacing with a Shop by Play section.
  const categories = [
    { id: 'build', name: 'BUILD', desc: 'For little makers.', color: 'bg-[var(--accent-blue)]' },
    { id: 'create', name: 'CREATE', desc: 'For imaginative minds.', color: 'bg-[var(--accent-yellow)] text-[var(--ink-strong)]' },
    { id: 'discover', name: 'DISCOVER', desc: 'For curious explorers.', color: 'bg-[var(--accent-coral)]' },
    { id: 'adventure', name: 'ADVENTURE', desc: 'For active play.', color: 'bg-[var(--accent-green)] text-[var(--ink-strong)]' },
  ];

  return (
    <section className="px-6 py-24 md:py-32 bg-[var(--page)]">
      <div className="mx-auto max-w-[1440px]">
        <div className="text-center mb-16">
          <Eyebrow>Find their passion</Eyebrow>
          <h2 className="text-4xl md:text-5xl font-bold">Shop by Play</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map(c => (
            <Link key={c.id} to={`/category/${c.id}`} className="group relative overflow-hidden rounded-[24px] aspect-square flex flex-col justify-end p-8 transition-transform hover:-translate-y-2">
              <div className={`absolute inset-0 ${c.color} opacity-90 transition-opacity group-hover:opacity-100`} />
              <div className="relative z-10">
                <h3 className="text-3xl font-extrabold mb-2 text-inherit tracking-tight">{c.name}</h3>
                <p className="text-lg text-inherit font-medium opacity-90">{c.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FeaturedToys() {
  const ref = useReveal<HTMLElement>();
  const toys = useMemo(
    () => getProducts().filter(p => p.isBestseller || p.isNew).slice(0, 4),
    []
  );

  return (
    <section ref={ref} className="px-6 py-24 md:py-32 bg-[var(--surface-soft)]">
      <div className="mx-auto max-w-[1440px] reveal">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
          <div>
            <Eyebrow className="text-[var(--accent-coral)]">Everyone's playing with</Eyebrow>
            <h2 className="text-4xl md:text-5xl font-bold">Trending Now</h2>
          </div>
          <Link to="/products">
            <Button variant="outline" className="rounded-full">View all trending</Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {toys.map((toy, i) => (
            <Link
              key={toy.id}
              to={`/product/${toy.id}`}
              className="group block bg-[var(--surface)] p-4 rounded-[20px] shadow-sm hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] transition-all duration-300 border border-[var(--hairline)]"
            >
              <div className="aspect-square rounded-[12px] overflow-hidden bg-[var(--surface-soft)] mb-6">
                <img
                  src={toy.image}
                  alt={toy.name}
                  loading={i < 2 ? "eager" : "lazy"}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-widest text-[var(--accent-blue)]">{toy.brand}</span>
              </div>
              <h3 className="font-bold text-lg text-[var(--ink-strong)] leading-tight mb-2 group-hover:text-[var(--accent-blue)] transition-colors">
                {toy.name}
              </h3>
              <p className="text-xl font-bold text-[var(--ink-strong)]">{formatMoney(toy.price)}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FeatureRows() {
  const curatedToy = getProducts().find(p => p.ageGroup === 'teens' || p.ageGroup === 'adults');
  
  return (
    <section className="px-6 py-24 md:py-32 bg-[var(--page)]">
      <div className="mx-auto max-w-[1440px]">
        <div className="bg-[var(--ink-strong)] rounded-[32px] overflow-hidden flex flex-col md:flex-row">
          <div className="md:w-1/2 p-12 md:p-20 flex flex-col justify-center">
            <Eyebrow className="text-[var(--accent-yellow)]">The Weekend Adventure</Eyebrow>
            <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6 leading-tight">Everything you need for a day of building.</h2>
            <p className="text-lg text-[var(--muted-light)] mb-10 max-w-md">
              Curated collections for imaginative minds. We've put together the ultimate sets for your next great adventure.
            </p>
            <div>
              <Link to="/products">
                <Button className="rounded-full bg-[var(--accent-yellow)] text-[var(--ink-strong)] hover:brightness-105">
                  Shop the Collection
                </Button>
              </Link>
            </div>
          </div>
          <div className="md:w-1/2 aspect-square md:aspect-auto">
            {curatedToy && (
              <img src={curatedToy.image} alt="Curated collection" className="w-full h-full object-cover opacity-90" />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="px-6 py-24 md:py-32 bg-[var(--accent-blue)] relative overflow-hidden">
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
      <div className="mx-auto max-w-[800px] text-center relative z-10">
        <h2 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight mb-8">Ready to play?</h2>
        <p className="text-xl md:text-2xl text-white/90 mb-12 font-medium">
          Join thousands of families finding their next favorite toy.
        </p>
        <Link to="/products">
          <Button size="lg" className="rounded-full bg-white text-[var(--accent-blue)] hover:bg-[var(--surface-soft)] shadow-xl px-10 text-lg">
            Explore the Catalog
          </Button>
        </Link>
      </div>
    </section>
  );
}
