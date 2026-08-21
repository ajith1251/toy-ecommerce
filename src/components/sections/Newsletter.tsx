import { useState } from 'react';
import { Send } from 'lucide-react';
import Button from '../ui/Button';

export default function Newsletter() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
      setEmail('');
    }
  };

  return (
    <section className="py-24 bg-gradient-to-br from-red-500 via-red-600 to-amber-500 text-white overflow-hidden relative">
      <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
        <h2 className="text-4xl font-extrabold mb-4">Join the ToyBox Club</h2>
        <p className="text-red-100 mb-10 text-lg">
          Get early access to new drops, exclusive deals, and toy reviews.
        </p>

        {submitted ? (
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-8 max-w-lg mx-auto">
            <p className="text-xl font-bold">🎉 Welcome to the club!</p>
            <p className="text-red-100 mt-2">Check your inbox for a special welcome gift.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="flex-1 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full px-6 py-4 text-white placeholder-red-200 focus:outline-none focus:ring-2 focus:ring-white/50"
            />
            <Button variant="secondary" className="bg-white text-red-600 hover:bg-red-50">
              Subscribe <Send size={16} />
            </Button>
          </form>
        )}
      </div>

      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-10 left-10 w-64 h-64 bg-white rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-64 h-64 bg-amber-300 rounded-full blur-3xl" />
      </div>
    </section>
  );
}
