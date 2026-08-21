import { useState, useMemo, useCallback, useEffect } from 'react';
import { FILTERS_STORAGE_KEY } from '../constants/storage';
import { storage } from '../lib/storage';
import { getProducts, getProductsByAgeGroup } from '../services/productService';
import {
  countActiveFilters,
  filterAndSortProducts,
  getAvailableBrands,
  getPriceRange,
} from '../utils/productFilters';
import type { FilterState, SortOption } from '../utils/productFilters';

export type { FilterState, SortOption };

export const defaultFilters: FilterState = {
  searchQuery: '',
  category: 'all',
  ageGroup: 'kids',
  priceRange: { min: 0, max: 1000 },
  sortBy: 'newest',
  brand: 'all',
  inStockOnly: false,
  minRating: 0,
};

function loadFilters(): FilterState {
  const parsed = storage.get<Partial<FilterState>>(FILTERS_STORAGE_KEY, {});
  return { ...defaultFilters, ...parsed };
}

function saveFilters(filters: FilterState) {
  storage.set(FILTERS_STORAGE_KEY, filters);
}

export function useFilters() {
  const [filters, setFilters] = useState<FilterState>(loadFilters);

  useEffect(() => {
    saveFilters(filters);
  }, [filters]);

  const setFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  const filteredProducts = useMemo(
    () => filterAndSortProducts(getProducts(), filters),
    [filters]
  );

  const ageProducts = useMemo(() => getProductsByAgeGroup(filters.ageGroup), [filters.ageGroup]);

  const availableBrands = useMemo(() => getAvailableBrands(ageProducts), [ageProducts]);

  const priceRange = useMemo(() => getPriceRange(ageProducts), [ageProducts]);

  const activeFilterCount = useMemo(
    () => countActiveFilters(filters, priceRange),
    [filters, priceRange]
  );

  return {
    filters,
    setFilter,
    clearFilters,
    filteredProducts,
    availableBrands,
    priceRange,
    activeFilterCount,
  };
}
