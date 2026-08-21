import { useState, useEffect, useCallback } from 'react';
import { THEME_STORAGE_KEY } from '../constants/storage';
import { storage } from '../lib/storage';

type Theme = 'light' | 'dark';

function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function loadTheme(): Theme {
  const saved = storage.getRaw(THEME_STORAGE_KEY, '');
  if (saved === 'light' || saved === 'dark') return saved;
  return getSystemTheme();
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(loadTheme);

  // Apply the theme class to <html>. Persistence happens only on explicit
  // user toggles (below) so that an untouched session keeps following the
  // OS preference until the user actually opts in.
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      if (!storage.getRaw(THEME_STORAGE_KEY, '')) {
        setThemeState(e.matches ? 'dark' : 'light');
      }
    };
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => {
      const next: Theme = prev === 'light' ? 'dark' : 'light';
      storage.setRaw(THEME_STORAGE_KEY, next);
      return next;
    });
  }, []);

  return { theme, toggleTheme };
}
