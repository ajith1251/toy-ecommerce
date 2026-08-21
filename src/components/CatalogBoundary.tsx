import { useEffect, useSyncExternalStore } from 'react';
import { getCatalogState, loadCatalog, subscribeCatalog } from '../services/productService';
import PageLoader from './ui/PageLoader';
import ErrorState from './ui/ErrorState';

/**
 * Boots the product catalog from the REST API and gates the app on it:
 *   loading → PageLoader
 *   error   → ErrorState with retry (never a fake empty grid)
 *   ready   → children
 *
 * The backend (PostgreSQL) is the source of truth for products/inventory;
 * if it is unreachable the app says so explicitly instead of silently
 * falling back to static data.
 */
export default function CatalogBoundary({ children }: { children: React.ReactNode }) {
  const state = useSyncExternalStore(subscribeCatalog, getCatalogState);

  useEffect(() => {
    void loadCatalog();
  }, []);

  if (state.status === 'loading' || state.status === 'idle') {
    return <PageLoader label="Loading the toy shop…" />;
  }

  if (state.status === 'error') {
    return (
      <ErrorState
        title="We couldn't load the shop"
        description={state.message}
        onRetry={() => void loadCatalog()}
      />
    );
  }

  return <>{children}</>;
}
