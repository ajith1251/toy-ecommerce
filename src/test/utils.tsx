import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import { expect } from 'vitest';
import type { ReactElement, ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import ShopProvider from '../context/ShopProvider';
import { AuthContext, DEFAULT_AUTH, type AuthContextValue } from '../context/AuthContext';

/**
 * Renders a component inside a MemoryRouter so components that use
 * react-router hooks (Link, useNavigate, …) work in isolation.
 */
export function renderWithRouter(ui: ReactElement, { route = '/' }: { route?: string } = {}) {
  return render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>);
}

/**
 * Renders a component inside the full app provider stack (ShopProvider only —
 * router included for components that need Link/navigation).
 */
export function renderWithShop(ui: ReactElement, { route = '/' }: { route?: string } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ShopProvider>{ui}</ShopProvider>
    </MemoryRouter>
  );
}

/**
 * Auth provider with a controllable value — tests set status/user directly
 * instead of waiting on the real /api/auth/me bootstrap.
 */
export function AuthTestProvider({
  value = {},
  children,
}: {
  value?: Partial<AuthContextValue>;
  children: ReactNode;
}) {
  return <AuthContext.Provider value={{ ...DEFAULT_AUTH, ...value }}>{children}</AuthContext.Provider>;
}

/** Renders inside MemoryRouter + AuthTestProvider (+ ShopProvider optionally). */
export function renderWithAuth(
  ui: ReactElement,
  { route = '/', value = {}, withShop = false }: { route?: string; value?: Partial<AuthContextValue>; withShop?: boolean } = {}
) {
  const wrapped = withShop ? <ShopProvider>{ui}</ShopProvider> : ui;
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthTestProvider value={value}>{wrapped}</AuthTestProvider>
    </MemoryRouter>
  );
}

/**
 * Runs axe-core over a rendered component and asserts zero violations.
 * Call after render(): `expectNoViolations(screen.getByRole('main'))`.
 */
export async function expectNoViolations(container: HTMLElement): Promise<void> {
  const results = await axe(container);
  expect(results.violations).toEqual([]);
}

/** Seeds localStorage with several keys at once (test isolation helper). */
export function seedStorage(entries: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(entries)) {
    localStorage.setItem(key, JSON.stringify(value));
  }
}
