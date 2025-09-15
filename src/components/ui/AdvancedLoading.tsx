import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Skeleton,
  SkeletonText,
  SkeletonCircle,
  Text,
  useBreakpointValue,
} from '@chakra-ui/react';
import { RESPONSIVE_LOADING, RESPONSIVE_SPACING } from '../../utils/responsive';

interface AdvancedLoadingProps {
  type?: 'skeleton' | 'spinner' | 'pulse';
  rows?: number;
  showHeader?: boolean;
  showAvatar?: boolean;
  showActions?: boolean;
}

export const AdvancedLoading: React.FC<AdvancedLoadingProps> = ({
  type = 'skeleton',
  rows = 3,
  showHeader = true,
  showAvatar = true,
  showActions = true,
}) => {
  const skeletonHeight = useBreakpointValue(RESPONSIVE_LOADING.skeleton);
  const spacing = useBreakpointValue(RESPONSIVE_SPACING.md);

  if (type === 'skeleton') {
    return (
      <VStack spacing={spacing} align="stretch" w="full">
        {showHeader && (
          <Box>
            <Skeleton
              height={skeletonHeight?.height}
              borderRadius={skeletonHeight?.borderRadius}
            />
            <SkeletonText mt={2} noOfLines={1} spacing={2} />
          </Box>
        )}

        {Array.from({ length: rows }).map((_, index) => (
          <Box key={index}>
            <HStack spacing={3} align="start">
              {showAvatar && <SkeletonCircle size={{ base: 'sm', md: 'md' }} />}
              <VStack align="start" spacing={2} flex={1}>
                <Skeleton
                  height={skeletonHeight?.height}
                  borderRadius={skeletonHeight?.borderRadius}
                  w="60%"
                />
                <Skeleton
                  height={skeletonHeight?.height}
                  borderRadius={skeletonHeight?.borderRadius}
                  w="80%"
                />
                {showActions && (
                  <HStack spacing={2}>
                    <Skeleton height="24px" w="60px" borderRadius="md" />
                    <Skeleton height="24px" w="60px" borderRadius="md" />
                  </HStack>
                )}
              </VStack>
            </HStack>
          </Box>
        ))}
      </VStack>
    );
  }

  if (type === 'pulse') {
    return (
      <VStack spacing={spacing} align="center" py={8}>
        <Box
          w={{ base: '40px', md: '60px', lg: '80px' }}
          h={{ base: '40px', md: '60px', lg: '80px' }}
          borderRadius="full"
          bg="brand.500"
          animation="pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite"
        />
        <Text color="gray.500" fontSize="sm">
          Loading...
        </Text>
      </VStack>
    );
  }

  return (
    <VStack spacing={spacing} align="center" py={8}>
      <Box
        w={{ base: '32px', md: '40px', lg: '48px' }}
        h={{ base: '32px', md: '40px', lg: '48px' }}
        borderRadius="full"
        border="3px solid"
        borderColor="brand.200"
        borderTopColor="brand.500"
        animation="spin 1s linear infinite"
      />
      <Text color="gray.500" fontSize="sm">
        Loading...
      </Text>
    </VStack>
  );
};

export default AdvancedLoading;
