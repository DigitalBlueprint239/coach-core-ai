import { render } from '@testing-library/react';

// Mock components that depend on browser APIs not available in JSDOM
jest.mock('./components/PWAInstallPrompt', () => ({
  PWAInstallPrompt: () => null,
  registerServiceWorker: () => {},
  usePWAInstall: () => ({ isInstalled: false, isSupported: false, install: () => {} }),
}));

jest.mock('./services/push-notifications', () => ({
  requestNotificationPermission: () => Promise.resolve('default'),
  subscribeUserToPush: () => Promise.resolve(),
}));

import App from './App';

test('renders App without crashing', () => {
  const { container } = render(<App />);
  expect(container.firstChild).toBeTruthy();
});
