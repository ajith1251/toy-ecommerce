import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithRouter } from '../test/utils';
import { ApiError } from '../lib/api/errors';
import CatalogBoundary from './CatalogBoundary';

vi.mock('../services/productService', async importOriginal => {
  const actual = await importOriginal<typeof import('../services/productService')>();
  return {
    ...actual,
    loadCatalog: vi.fn(),
    getCatalogState: vi.fn(),
    subscribeCatalog: vi.fn(() => () => {}),
  };
});

import { getCatalogState, loadCatalog, subscribeCatalog } from '../services/productService';

const mockedLoad = vi.mocked(loadCatalog);
const mockedState = vi.mocked(getCatalogState);
const mockedSubscribe = vi.mocked(subscribeCatalog);

describe('CatalogBoundary', () => {
  it('kicks off the catalog load on mount', () => {
    mockedState.mockReturnValue({ status: 'loading' });
    mockedSubscribe.mockImplementation(fn => {
      fn();
      return () => {};
    });
    renderWithRouter(<CatalogBoundary>children</CatalogBoundary>);
    expect(mockedLoad).toHaveBeenCalledTimes(1);
  });

  it('shows a loader while loading', () => {
    mockedState.mockReturnValue({ status: 'loading' });
    renderWithRouter(<CatalogBoundary>children</CatalogBoundary>);
    expect(screen.getByText('Loading the toy shop…')).toBeInTheDocument();
  });

  it('shows an explicit error state with retry when the API is down', () => {
    mockedState.mockReturnValue({ status: 'error', message: 'Network error' });
    renderWithRouter(<CatalogBoundary>children</CatalogBoundary>);
    expect(screen.getByRole('heading', { name: "We couldn't load the shop" })).toBeInTheDocument();
    expect(screen.getByText('Network error')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Try Again/ })).toBeInTheDocument();
  });

  it('renders children once the catalog is ready', () => {
    mockedState.mockReturnValue({ status: 'ready' });
    renderWithRouter(<CatalogBoundary>shop content</CatalogBoundary>);
    expect(screen.getByText('shop content')).toBeInTheDocument();
  });

  it('propagates unknown failures from loadCatalog as an ApiError-safe state', async () => {
    mockedLoad.mockRejectedValue(new ApiError('boom', 500, 'internal'));
    mockedState.mockReturnValue({ status: 'idle' });
    renderWithRouter(<CatalogBoundary>children</CatalogBoundary>);
    // loadCatalog rejection is caught by the service itself; the boundary
    // simply keeps showing the loader until state flips to error.
    expect(screen.getByText('Loading the toy shop…')).toBeInTheDocument();
  });
});
