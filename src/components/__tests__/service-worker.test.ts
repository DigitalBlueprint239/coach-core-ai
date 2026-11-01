import { afterEach, describe, expect, it, vi } from 'vitest';
import { registerServiceWorker } from '../PWAInstallPrompt';

const original = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker');

afterEach(() => {
  if (original) Object.defineProperty(navigator, 'serviceWorker', original);
  else delete (navigator as any).serviceWorker;
  delete (globalThis as any).caches;
});

describe('registerServiceWorker (retired offline worker)', () => {
  it('unregisters every existing service worker and never registers a new one', async () => {
    const unregister = vi.fn().mockResolvedValue(true);
    const register = vi.fn();
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { getRegistrations: vi.fn().mockResolvedValue([{ unregister }, { unregister }]), register },
    });
    await registerServiceWorker();
    expect(unregister).toHaveBeenCalledTimes(2);
    expect(register).not.toHaveBeenCalled();
  });

  it('does nothing when service workers are unsupported', async () => {
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: undefined });
    await expect(registerServiceWorker()).resolves.toBeUndefined();
  });

  it('does not throw when unregistering fails', async () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { getRegistrations: vi.fn().mockRejectedValue(new Error('SecurityError')), register: vi.fn() },
    });
    await expect(registerServiceWorker()).resolves.toBeUndefined();
  });

  it("deletes the old worker's caches too (unregistering alone leaves them on the device)", async () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { getRegistrations: vi.fn().mockResolvedValue([{ unregister: vi.fn().mockResolvedValue(true) }]), register: vi.fn() },
    });
    const del = vi.fn().mockResolvedValue(true);
    (globalThis as any).caches = { keys: vi.fn().mockResolvedValue(['coach-core-static-v1.0.0', 'coach-core-api-v1.0.0']), delete: del };
    await registerServiceWorker();
    expect(del).toHaveBeenCalledWith('coach-core-static-v1.0.0');
    expect(del).toHaveBeenCalledWith('coach-core-api-v1.0.0');
  });
});
