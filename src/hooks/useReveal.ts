import { useEffect, useRef } from 'react';

/**
 * Adds `.is-visible` to elements with the `.reveal` class inside the returned
 * ref when they scroll into view (once, threshold 30%). Pairs with the
 * `.reveal` CSS in index.css — the single quiet motion pattern on the page.
 * Also flips `.lines-in` on the container so masked headline lines stagger in.
 */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const targets = Array.from(root.querySelectorAll<HTMLElement>('.reveal, .lines'));

    // Degrade gracefully where IntersectionObserver is unavailable (jsdom,
    // very old browsers): show everything immediately.
    if (
      typeof IntersectionObserver === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      targets.forEach(el => {
        el.classList.add('is-visible', 'lines-in');
      });
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible', 'lines-in');
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.3 }
    );

    targets.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return ref;
}
