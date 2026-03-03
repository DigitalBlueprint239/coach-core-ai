import { ProviderAdapter, ProviderKey } from './types';
import youtubeAdapter from './adapters/youtubeAdapter';

const adapterRegistry = new Map<ProviderKey, ProviderAdapter>();

adapterRegistry.set('youtube', youtubeAdapter);

export const registerProviderAdapter = (adapter: ProviderAdapter) => {
  adapterRegistry.set(adapter.provider, adapter);
};

export const getProviderAdapter = (provider: ProviderKey): ProviderAdapter => {
  const adapter = adapterRegistry.get(provider);

  if (!adapter) {
    throw new Error(`No adapter registered for provider: ${provider}`);
  }

  return adapter;
};

export const listProviderAdapters = (): ProviderAdapter[] => Array.from(adapterRegistry.values());
