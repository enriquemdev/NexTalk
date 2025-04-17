import '@testing-library/jest-dom';
import { vi, expect } from 'vitest';
import { cleanup } from '@testing-library/react';
import matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect method with methods from react-testing-library
expect.extend(matchers);

// Clean up after each test
afterEach(() => {
  cleanup();
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock Clerk types
declare global {
  namespace Clerk {
    interface ClerkState {
      userId: string | null;
      sessionId: string | null;
      sessionClaims: Record<string, unknown>;
      sessionStatus: 'active' | 'signed-out';
      actor: null;
      orgId: string | null;
      orgRole: string | null;
      orgSlug: string | null;
      has: () => boolean;
      debug: () => null;
    }
  }
}

// Mock Convex types
declare global {
  namespace Convex {
    interface FunctionReference<T extends 'query' | 'mutation'> {
      _type: T;
      name: string;
    }
  }
} 