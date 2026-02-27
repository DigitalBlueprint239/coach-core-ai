import '@testing-library/jest-dom';

// jsdom does not fully implement window.matchMedia — mock it so components
// using responsive/PWA detection don't throw in tests.
// Using Object.defineProperty with configurable:true to override jsdom's stub.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
