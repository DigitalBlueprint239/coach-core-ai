import { useMemo } from 'react';
import { appConfig } from '@/config/app.config';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

type FeatureSource = 'remote-config' | 'env';

export const useRecruitingFeatureFlag = () => {
  const { featureFlags, isReady } = useFeatureFlags();
  const remoteFlag = isReady ? featureFlags.get('recruitingHub') : undefined;

  const { isEnabled, source }: { isEnabled: boolean; source: FeatureSource } = useMemo(() => {
    if (typeof remoteFlag === 'boolean') {
      return { isEnabled: remoteFlag, source: 'remote-config' };
    }

    return { isEnabled: appConfig.features.recruitingHub ?? false, source: 'env' };
  }, [remoteFlag]);

  return {
    isEnabled,
    source,
    isReady,
  };
};

export default useRecruitingFeatureFlag;
