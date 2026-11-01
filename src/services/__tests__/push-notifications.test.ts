import { afterEach, describe, expect, it, vi } from 'vitest';

const originalSW = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker');

async function load(vapidKey: string | undefined) {
  vi.stubEnv('REACT_APP_VAPID_PUBLIC_KEY', vapidKey);
  vi.resetModules();
  return import('../push-notifications');
}

function fakeServiceWorker(registration: unknown) {
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      // Never resolves when no worker is registered, exactly like the real thing.
      ready: new Promise(() => {}),
      getRegistration: vi.fn().mockResolvedValue(registration),
    },
  });
  (window as any).PushManager = function PushManager() {};
}

afterEach(() => {
  vi.unstubAllEnvs();
  if (originalSW) Object.defineProperty(navigator, 'serviceWorker', originalSW);
  else delete (navigator as any).serviceWorker;
  delete (window as any).PushManager;
  delete (window as any).Notification;
});

describe('push notifications without a service worker', () => {
  it('subscribeUserToPush resolves null instead of waiting forever when no worker is registered', async () => {
    fakeServiceWorker(undefined);
    const { subscribeUserToPush } = await load('BPublicKeyForTest');
    await expect(subscribeUserToPush()).resolves.toBeNull();
  });

  it('does not ask for notification permission when push is not configured (no VAPID key)', async () => {
    fakeServiceWorker(undefined);
    const requestPermission = vi.fn().mockResolvedValue('granted');
    (window as any).Notification = { requestPermission };
    const { setUpPushAfterOnboarding } = await load(undefined);
    await setUpPushAfterOnboarding();
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it('does not ask for notification permission when no service worker is registered', async () => {
    fakeServiceWorker(undefined);
    const requestPermission = vi.fn().mockResolvedValue('granted');
    (window as any).Notification = { requestPermission };
    const { setUpPushAfterOnboarding } = await load('BPublicKeyForTest');
    await setUpPushAfterOnboarding();
    expect(requestPermission).not.toHaveBeenCalled();
  });
});
