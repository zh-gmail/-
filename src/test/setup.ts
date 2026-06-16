import '@testing-library/jest-dom/vitest';

// Mock matchMedia for jsdom (required by some React/component patterns)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock localStorage for jsdom (vitest 4.x / jsdom may not include it)
const STORE: Record<string, string> = {};
Object.defineProperty(window, 'localStorage', {
  writable: true,
  value: {
    getItem: (key: string) => STORE[key] ?? null,
    setItem: (key: string, value: string) => { STORE[key] = value; },
    removeItem: (key: string) => { delete STORE[key]; },
    clear: () => { Object.keys(STORE).forEach((k) => delete STORE[k]); },
    get length() { return Object.keys(STORE).length; },
    key: (index: number) => Object.keys(STORE)[index] ?? null,
  },
});
