import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import Button from '../ui/Button';
import type { AgeGroup } from '../../types';

interface HeroProps {
  activeTab: AgeGroup;
}

export default function Hero({ activeTab }: HeroProps) {
  const navigate = useNavigate();
  const isKids = activeTab === 'kids';
  const isTeens = activeTab === 'teens';

  return (
    <section className="relative pt-32 pb-20 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 items-center gap-12">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <span
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 mb-6 text-sm font-bold tracking-widest uppercase rounded-full ${
              isKids
                ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30'
                : isTeens
                ? 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-900/30'
                : 'text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/30'
            }`}
          >
            <Sparkles size={14} />
            {isKids ? 'New Kids Collection' : isTeens ? 'Teen Favorites' : 'Premium Adults Line'}
          </span>
          <h2 className="text-5xl md:text-7xl font-extrabold leading-[1.05] mb-8 text-slate-900 dark:text-white tracking-tight">
            {isKids ? (
              <>
                Where <span className="text-blue-500">Fun</span> Meets
                <br />Adventure.
              </>
            ) : isTeens ? (
              <>
                Level Up Your <span className="text-purple-500">Game</span>.
                <br />Gear for Teens.
              </>
            ) : (
              <>
                Collect <span className="text-amber-600">Premium</span>
                <br />Masterpieces.
              </>
            )}
          </h2>
          <p className="text-lg text-slate-500 dark:text-slate-400 mb-10 max-w-lg leading-relaxed">
            {isKids
              ? 'Discover toys that spark imagination, learning, and endless fun for children of all ages.'
              : isTeens
              ? 'Cool gadgets, tech gear, and creative kits built for the next generation.'
              : 'Curated collectibles, building sets, and premium toys crafted for the discerning adult enthusiast.'}
          </p>
          <div className="flex flex-wrap gap-4">
            <Button className="px-10 h-14 text-lg" onClick={() => navigate('/products')}>
              Shop Now <ArrowRight size={20} />
            </Button>
            <Button variant="outline" className="h-14" onClick={() => navigate('/products')}>
              View Catalog
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
          className="relative"
        >
          <div className="relative z-10 rounded-3xl overflow-hidden shadow-2xl">
            <img
              src={
                isKids
                  ? 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=800&q=80'
                  : isTeens
                  ? 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80'
                  : 'https://images.unsplash.com/photo-1608889175123-8ee362201f81?w=800&q=80'
              }
              alt={isKids ? 'Kids playing' : isTeens ? 'Teen gadgets' : 'Adult collectibles'}
              className="w-full h-80 md:h-[420px] object-cover"
            />
          </div>
          <div
            className={`absolute -bottom-6 -left-6 bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-xl z-20 hidden lg:block ${
              isKids ? 'animate-bounce' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 text-xl">
                ✓
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white text-sm">Quality Assured</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Safe & Durable Materials</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <div
        className={`absolute top-0 right-0 -z-10 w-1/3 h-full rounded-l-[100px] ${
          isKids ? 'bg-blue-50/50 dark:bg-blue-900/10' : isTeens ? 'bg-purple-50/50 dark:bg-purple-900/10' : 'bg-amber-50/50 dark:bg-amber-900/10'
        }`}
      />
    </section>
  );
}
