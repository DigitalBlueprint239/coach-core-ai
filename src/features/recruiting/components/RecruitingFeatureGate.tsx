import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Center, Spinner, Text, VStack } from '@chakra-ui/react';
import useRecruitingFeatureFlag from '../hooks/useRecruitingFeatureFlag';

interface RecruitingFeatureGateProps {
  children: ReactNode;
  fallbackPath?: string;
  fallback?: ReactNode;
  isPublicRoute?: boolean;
}

const LoadingState = () => (
  <Center minH="50vh">
    <VStack spacing={4}>
      <Spinner size="lg" />
      <Text fontSize="sm" color="gray.500">
        Checking recruiting access…
      </Text>
    </VStack>
  </Center>
);

export const RecruitingFeatureGate = ({
  children,
  fallbackPath,
  fallback,
  isPublicRoute = false,
}: RecruitingFeatureGateProps) => {
  const { isEnabled, isReady, source } = useRecruitingFeatureFlag();

  if (!isReady && source === 'remote-config' && !fallback) {
    return <LoadingState />;
  }

  if (!isEnabled && !isPublicRoute) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (fallbackPath) {
      return <Navigate to={fallbackPath} replace />;
    }

    return null;
  }

  return <>{children}</>;
};

export default RecruitingFeatureGate;
