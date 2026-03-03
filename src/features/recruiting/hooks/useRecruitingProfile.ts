import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Athlete, highlightReelRefSchema } from '@/features/recruiting';

type ProviderStatus = 'connected' | 'manual' | 'not_linked';

type SupportedProvider = 'youtube' | 'hudl' | 'instagram' | 'maxpreps';

type LinkedAccountState = {
  status: ProviderStatus;
  url?: string;
  lastSyncedAt?: string;
};

type RecruitingAsset = {
  id: string;
  provider: SupportedProvider | 'twitter';
  title: string;
  url: string;
  thumbnail?: string;
  metrics?: {
    views?: number;
    likes?: number;
    timestamp?: string;
  };
};

type PrivacySettings = {
  academics: boolean;
  contact: boolean;
};

type RecruitingProfileState = {
  athlete: Partial<Athlete>;
  linkedAccounts: Record<SupportedProvider, LinkedAccountState>;
  assets: RecruitingAsset[];
  privacy: PrivacySettings;
  readinessScore: number;
  lastUpdated: string;
};

type SaveStatus = 'idle' | 'saving' | 'saved';

const STORAGE_KEY = 'coach-core-recruiting-profile';

const defaultProfile: RecruitingProfileState = {
  athlete: {
    name: '',
    gradYear: new Date().getFullYear() + 2,
    positionPrimary: '',
    heightIn: 72,
    weightLb: 190,
    recruitingReadinessScore: 60,
    tags: [],
    endorsements: [],
    highlightReels: [],
    bio: '',
  },
  linkedAccounts: {
    youtube: { status: 'not_linked' },
    hudl: { status: 'not_linked' },
    instagram: { status: 'not_linked' },
    maxpreps: { status: 'not_linked' },
  },
  assets: [],
  privacy: {
    academics: true,
    contact: false,
  },
  readinessScore: 60,
  lastUpdated: new Date().toISOString(),
};

const requiredFields: Array<keyof Partial<Athlete>> = [
  'name',
  'gradYear',
  'positionPrimary',
  'heightIn',
  'weightLb',
  'gpa',
  'act',
  'transcriptUrl',
];

const calculateCompletion = (athlete: Partial<Athlete>) => {
  const completed = requiredFields.reduce((count, field) => {
    const value = athlete[field];
    if (value === undefined || value === null) {
      return count;
    }
    if (typeof value === 'string') {
      return value.trim().length > 0 ? count + 1 : count;
    }
    return count + 1;
  }, 0);

  return Math.round((completed / requiredFields.length) * 100);
};

const deriveNextActions = (athlete: Partial<Athlete>): string[] => {
  const actions: string[] = [];
  if (!athlete.transcriptUrl) {
    actions.push('Upload transcript PDF to unlock academic visibility');
  }
  if (!athlete.highlightReels || athlete.highlightReels.length === 0) {
    actions.push('Create a highlight reel to showcase best plays');
  }
  if (!athlete.gpa) {
    actions.push('Add GPA to strengthen academic profile');
  }
  return actions.slice(0, 3);
};

const sanitizeReels = (reels: unknown) => {
  if (!Array.isArray(reels)) return [];
  return reels
    .map((reel) => {
      const parsed = highlightReelRefSchema.safeParse(reel);
      return parsed.success ? parsed.data : null;
    })
    .filter((reel): reel is ReturnType<typeof highlightReelRefSchema.parse> => reel !== null);
};

export const useRecruitingProfile = () => {
  const [profile, setProfile] = useState<RecruitingProfileState>(() => {
    if (typeof window === 'undefined') {
      return defaultProfile;
    }
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultProfile;
      const parsed = JSON.parse(raw) as RecruitingProfileState;
      return {
        ...defaultProfile,
        ...parsed,
        athlete: {
          ...defaultProfile.athlete,
          ...parsed.athlete,
          highlightReels: sanitizeReels(parsed.athlete?.highlightReels) ?? [],
        },
      };
    } catch (error) {
      console.warn('Failed to parse recruiting profile from storage', error);
      return defaultProfile;
    }
  });

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [nextActions, setNextActions] = useState<string[]>(() => deriveNextActions(profile.athlete));
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const persist = useCallback((state: RecruitingProfileState) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, []);

  const schedulePersist = useCallback(
    (state: RecruitingProfileState) => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      setSaveStatus('saving');
      debounceTimer.current = setTimeout(() => {
        persist(state);
        setSaveStatus('saved');
      }, 600);
    },
    [persist]
  );

  const updateProfile = useCallback(
    (updater: (prev: RecruitingProfileState) => RecruitingProfileState) => {
      setProfile((prev) => {
        const next = updater(prev);
        schedulePersist(next);
        return next;
      });
    },
    [schedulePersist]
  );

  const updateAthlete = useCallback(
    (partial: Partial<Athlete>) => {
      updateProfile((prev) => {
        const merged: RecruitingProfileState = {
          ...prev,
          athlete: {
            ...prev.athlete,
            ...partial,
          },
          readinessScore: Math.min(100, Math.round((calculateCompletion({ ...prev.athlete, ...partial }) + 60) / 1.2)),
          lastUpdated: new Date().toISOString(),
        };
        return merged;
      });
    },
    [updateProfile]
  );

  const updateLinkedAccount = useCallback(
    (provider: SupportedProvider, status: ProviderStatus, url?: string) => {
      updateProfile((prev) => ({
        ...prev,
        linkedAccounts: {
          ...prev.linkedAccounts,
          [provider]: {
            status,
            url: url ?? prev.linkedAccounts[provider].url,
            lastSyncedAt: new Date().toISOString(),
          },
        },
        lastUpdated: new Date().toISOString(),
      }));
    },
    [updateProfile]
  );

  const addAsset = useCallback(
    (asset: RecruitingAsset) => {
      updateProfile((prev) => ({
        ...prev,
        assets: [asset, ...prev.assets.filter((existing) => existing.id !== asset.id)].slice(0, 50),
        lastUpdated: new Date().toISOString(),
      }));
    },
    [updateProfile]
  );

  const updatePrivacy = useCallback(
    (partial: Partial<PrivacySettings>) => {
      updateProfile((prev) => ({
        ...prev,
        privacy: { ...prev.privacy, ...partial },
        lastUpdated: new Date().toISOString(),
      }));
    },
    [updateProfile]
  );

  useEffect(() => {
    setNextActions(deriveNextActions(profile.athlete));
  }, [profile.athlete]);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  const completion = useMemo(() => calculateCompletion(profile.athlete), [profile.athlete]);

  return {
    profile,
    saveStatus,
    completion,
    nextActions,
    updateAthlete,
    updateLinkedAccount,
    updatePrivacy,
    addAsset,
    resetProfile: () => {
      setProfile(defaultProfile);
      persist(defaultProfile);
    },
  };
};

export type RecruitingProfileHook = ReturnType<typeof useRecruitingProfile>;

export default useRecruitingProfile;
