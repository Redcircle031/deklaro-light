/**
 * Vitest setup file
 * Configures testing environment for React component tests
 */

import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Cleanup after each test automatically
afterEach(() => {
  cleanup();
});

// Mock localStorage for client-side tests
global.localStorage = {
  getItem: (key: string) => {
    if (key === 'x-tenant-id') return 'test-tenant-123';
    return null;
  },
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
  length: 0,
  key: () => null,
};
