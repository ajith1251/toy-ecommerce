import { BrowserRouter, useRoutes } from 'react-router-dom';
import AuthProvider from './context/AuthProvider';
import ShopProvider from './context/ShopProvider';
import ErrorBoundary from './components/ErrorBoundary';
import CatalogBoundary from './components/CatalogBoundary';
import { appRoutes } from './routes';

function AppRoutes() {
  return useRoutes(appRoutes);
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <CatalogBoundary>
            <ShopProvider>
              <AppRoutes />
            </ShopProvider>
          </CatalogBoundary>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
