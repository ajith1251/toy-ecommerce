import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Button from '../components/ui/Button';

export default function NotFoundPage() {
  return (
    <div className="pt-32 pb-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-xl mx-auto px-6"
      >
        <motion.p
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 10, stiffness: 200, delay: 0.15 }}
          className="text-8xl mb-6"
          aria-hidden
        >
          🧸
        </motion.p>
        <p className="text-sm font-bold uppercase tracking-widest text-red-500 mb-3">404</p>
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-4">
          Oops! This toy wandered away.
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8 text-lg">
          The page you're looking for doesn't exist.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/">
            <Button>Back to ToyBox</Button>
          </Link>
          <Link to="/products">
            <Button variant="outline">Explore Toys</Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
