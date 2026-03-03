import { describe, it, expect, beforeEach, vi } from 'vitest';
import createManualImportedAsset from '../manualLinker';
import { findAssetByFingerprint, saveImportedAsset } from '@/features/recruiting/data';

vi.mock('@/features/recruiting/data', () => ({
  findAssetByFingerprint: vi.fn(),
  saveImportedAsset: vi.fn(),
}));

vi.mock('@/utils/secure-logger', () => ({
  __esModule: true,
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const mockFindAsset = findAssetByFingerprint as unknown as ReturnType<typeof vi.fn>;
const mockSaveAsset = saveImportedAsset as unknown as ReturnType<typeof vi.fn>;

describe('createManualImportedAsset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes instagram handles and persists asset', async () => {
    mockFindAsset.mockResolvedValue(null);
    mockSaveAsset.mockResolvedValue('asset-id');

    const asset = await createManualImportedAsset({
      userId: 'user-1',
      provider: 'instagram',
      url: '@seedathlete',
      tags: ['social'],
      capturedAt: new Date('2024-10-01T12:00:00Z'),
    });

    expect(asset).toMatchObject({
      provider: 'instagram',
      sourceUrl: 'https://instagram.com/seedathlete',
      assetType: 'post',
      meta: expect.objectContaining({ tags: ['social'] }),
    });
    expect(mockSaveAsset).toHaveBeenCalledTimes(1);
  });

  it('returns existing asset when fingerprint already present', async () => {
    const existing = {
      id: 'asset-existing',
      userId: 'user-1',
      provider: 'hudl' as const,
      assetType: 'video' as const,
      sourceUrl: 'https://www.hudl.com/video/Hudl2/example',
      meta: {},
      aiTags: [],
      fingerprint: 'hudl-existing',
      createdAt: new Date(),
    };

    mockFindAsset.mockResolvedValue(existing);

    const asset = await createManualImportedAsset({
      userId: 'user-1',
      provider: 'hudl',
      url: 'https://www.hudl.com/video/Hudl2/example',
    });

    expect(asset).toBe(existing);
    expect(mockSaveAsset).not.toHaveBeenCalled();
  });

  it('prefixes protocol for bare URLs', async () => {
    mockFindAsset.mockResolvedValue(null);
    mockSaveAsset.mockResolvedValue('asset-id');

    const asset = await createManualImportedAsset({
      userId: 'user-1',
      provider: 'maxpreps',
      url: 'www.maxpreps.com/athlete/seed',
    });

    expect(asset?.sourceUrl).toBe('https://www.maxpreps.com/athlete/seed');
  });

  it('swallows errors and returns null when persistence fails', async () => {
    mockFindAsset.mockResolvedValue(null);
    mockSaveAsset.mockRejectedValue(new Error('write failed'));

    const asset = await createManualImportedAsset({
      userId: 'user-1',
      provider: 'hudl',
      url: 'https://www.hudl.com/video/Hudl2/example',
    });

    expect(asset).toBeNull();
  });
});
