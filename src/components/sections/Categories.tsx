import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { CategoryInfo } from '../../types';

interface CategoriesProps {
  categories: CategoryInfo[];
}

export default function Categories({ categories }: CategoriesProps) {
  return (
    <section className="py-16 max-w-7xl mx-auto px-6">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-3">Browse Categories</h2>
        <p className="text-slate-500 dark:text-slate-400">Find exactly what you're looking for</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {categories.map((cat, i) => (
          <motion.div
            key={cat.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ y: -4, scale: 1.02 }}
          >
            <Link
              to={`/category/${cat.id}`}
              className="block bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 text-center hover:shadow-lg transition-all group h-full"
            >
              <div className={`w-14 h-14 ${cat.color} rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3 group-hover:scale-110 transition-transform`}>
                {cat.icon}
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm">{cat.name}</h3>
              <span className="text-xs text-slate-400 dark:text-slate-500 mt-1 inline-block">
                {cat.ageGroup === 'adults' ? '18+' : cat.ageGroup === 'teens' ? '13-17' : 'Kids'}
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
