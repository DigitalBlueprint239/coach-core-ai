import React from 'react';
import {
  Box,
  Skeleton,
  SkeletonText,
  Spinner,
  Progress,
  VStack,
  HStack,
  Text,
  Center,
  useColorModeValue,
  useBreakpointValue,
} from '@chakra-ui/react';
import { RESPONSIVE_SPACING, RESPONSIVE_FONTS } from '../../utils/responsive';

// Skeleton Loader Components
export const SkeletonCard: React.FC<{
  lines?: number;
  height?: string;
  width?: string;
}> = ({ lines = 3, height = '200px', width = '100%' }) => (
  <Box p={4} borderWidth="1px" borderRadius="lg" width={width}>
    <Skeleton height="20px" width="60%" mb={4} />
    <SkeletonText noOfLines={lines} spacing={3} />
    <HStack mt={4} spacing={2}>
      <Skeleton height="16px" width="40px" />
      <Skeleton height="16px" width="60px" />
    </HStack>
  </Box>
);

export const SkeletonTable: React.FC<{
  rows?: number;
  columns?: number;
}> = ({ rows = 5, columns = 4 }) => (
  <Box>
    {/* Header */}
    <HStack spacing={4} mb={4}>
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} height="20px" width={`${100 / columns}%`} />
      ))}
    </HStack>

    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <HStack key={rowIndex} spacing={4} mb={3}>
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton key={colIndex} height="16px" width={`${100 / columns}%`} />
        ))}
      </HStack>
    ))}
  </Box>
);

export const SkeletonList: React.FC<{
  items?: number;
  showAvatar?: boolean;
}> = ({ items = 5, showAvatar = true }) => (
  <VStack spacing={3} align="stretch">
    {Array.from({ length: items }).map((_, i) => (
      <HStack key={i} spacing={3} p={3} borderWidth="1px" borderRadius="md">
        {showAvatar && (
          <Skeleton height="40px" width="40px" borderRadius="full" />
        )}
        <VStack flex={1} align="stretch" spacing={2}>
          <Skeleton height="16px" width="70%" />
          <Skeleton height="14px" width="50%" />
        </VStack>
        <Skeleton height="20px" width="60px" />
      </HStack>
    ))}
  </VStack>
);

// Spinner Components
export const LoadingSpinner: React.FC<{
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  color?: string;
}> = ({ size = 'md', text = 'Loading...', color }) => {
  const spinnerColor = color || useColorModeValue('blue.500', 'blue.400');

  return (
    <Center p={8}>
      <VStack spacing={4}>
        <Spinner
          thickness="4px"
          speed="0.65s"
          emptyColor="gray.200"
          color={spinnerColor}
          size={size}
        />
        {text && (
          <Text
            fontSize={RESPONSIVE_FONTS.sm}
            color={useColorModeValue('gray.600', 'gray.400')}
          >
            {text}
          </Text>
        )}
      </VStack>
    </Center>
  );
};

export const InlineSpinner: React.FC<{
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  color?: string;
}> = ({ size = 'sm', text, color }) => {
  const spinnerColor = color || useColorModeValue('blue.500', 'blue.400');

  return (
    <HStack spacing={2}>
      <Spinner
        thickness="2px"
        speed="0.65s"
        emptyColor="gray.200"
        color={spinnerColor}
        size={size}
      />
      {text && (
        <Text
          fontSize={RESPONSIVE_FONTS.xs}
          color={useColorModeValue('gray.600', 'gray.400')}
        >
          {text}
        </Text>
      )}
    </HStack>
  );
};

// Progress Components
export const LoadingProgress: React.FC<{
  value: number;
  max?: number;
  text?: string;
  showValue?: boolean;
  colorScheme?: string;
  size?: 'sm' | 'md' | 'lg';
}> = ({
  value,
  max = 100,
  text,
  showValue = true,
  colorScheme = 'blue',
  size = 'md',
}) => {
  const percentage = Math.round((value / max) * 100);

  return (
    <VStack spacing={3} align="stretch" w="100%">
      {text && (
        <HStack justify="space-between" align="center">
          <Text
            fontSize={RESPONSIVE_FONTS.sm}
            fontWeight="medium"
            color={useColorModeValue('gray.700', 'gray.200')}
          >
            {text}
          </Text>
          {showValue && (
            <Text
              fontSize={RESPONSIVE_FONTS.sm}
              color={useColorModeValue('gray.600', 'gray.400')}
            >
              {percentage}%
            </Text>
          )}
        </HStack>
      )}

      <Progress
        value={value}
        max={max}
        colorScheme={colorScheme}
        size={size}
        borderRadius="full"
        hasStripe
        isAnimated
      />
    </VStack>
  );
};

export const IndeterminateProgress: React.FC<{
  text?: string;
  colorScheme?: string;
  size?: 'sm' | 'md' | 'lg';
}> = ({ text, colorScheme = 'blue', size = 'md' }) => (
  <VStack spacing={3} align="stretch" w="100%">
    {text && (
      <Text
        fontSize={RESPONSIVE_FONTS.sm}
        fontWeight="medium"
        color={useColorModeValue('gray.700', 'gray.200')}
      >
        {text}
      </Text>
    )}

    <Progress
      size={size}
      colorScheme={colorScheme}
      borderRadius="full"
      isIndeterminate
    />
  </VStack>
);

// Page Loading States
export const PageLoading: React.FC<{
  title?: string;
  subtitle?: string;
}> = ({
  title = 'Loading Page',
  subtitle = 'Please wait while we prepare your content',
}) => (
  <Center minH="60vh" p={8}>
    <VStack spacing={6} textAlign="center">
      <Spinner
        thickness="4px"
        speed="0.65s"
        emptyColor="gray.200"
        color="blue.500"
        size="xl"
      />

      <VStack spacing={2}>
        <Text
          fontSize={RESPONSIVE_FONTS.lg}
          fontWeight="semibold"
          color={useColorModeValue('gray.800', 'white')}
        >
          {title}
        </Text>
        <Text
          fontSize={RESPONSIVE_FONTS.sm}
          color={useColorModeValue('gray.600', 'gray.400')}
          maxW="400px"
        >
          {subtitle}
        </Text>
      </VStack>
    </VStack>
  </Center>
);

export const ContentLoading: React.FC<{
  type?: 'card' | 'table' | 'list';
  count?: number;
  height?: string;
}> = ({ type = 'card', count = 3, height }) => {
  const isMobile = useBreakpointValue({ base: true, md: false });
  const spacing = isMobile ? RESPONSIVE_SPACING.md : RESPONSIVE_SPACING.sm;

  return (
    <VStack spacing={spacing} align="stretch">
      {type === 'card' && (
        <>
          {Array.from({ length: count }).map((_, i) => (
            <SkeletonCard key={i} height={height} />
          ))}
        </>
      )}

      {type === 'table' && <SkeletonTable rows={count} columns={4} />}

      {type === 'list' && <SkeletonList items={count} showAvatar={true} />}
    </VStack>
  );
};

// Button Loading States
export const LoadingButton: React.FC<{
  isLoading: boolean;
  loadingText?: string;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  colorScheme?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'solid' | 'outline' | 'ghost';
}> = ({
  isLoading,
  loadingText = 'Loading...',
  children,
  onClick,
  disabled,
  colorScheme = 'blue',
  size = 'md',
  variant = 'solid',
}) => (
  <Box
    as="button"
    px={size === 'lg' ? 8 : size === 'sm' ? 4 : 6}
    py={size === 'lg' ? 4 : size === 'sm' ? 2 : 3}
    bg={isLoading ? 'gray.400' : `${colorScheme}.500`}
    color="white"
    borderRadius="md"
    fontWeight="medium"
    fontSize={size === 'lg' ? 'lg' : size === 'sm' ? 'sm' : 'md'}
    cursor={isLoading || disabled ? 'not-allowed' : 'pointer'}
    opacity={isLoading || disabled ? 0.6 : 1}
    transition="all 0.2s"
    _hover={!isLoading && !disabled ? { bg: `${colorScheme}.600` } : {}}
    _active={!isLoading && !disabled ? { bg: `${colorScheme}.700` } : {}}
    onClick={!isLoading && !disabled ? onClick : undefined}
    disabled={isLoading || disabled}
  >
    {isLoading ? (
      <HStack spacing={2} justify="center">
        <Spinner size="sm" color="white" />
        <Text>{loadingText}</Text>
      </HStack>
    ) : (
      children
    )}
  </Box>
);

// Export all components
export default {
  SkeletonCard,
  SkeletonTable,
  SkeletonList,
  LoadingSpinner,
  InlineSpinner,
  LoadingProgress,
  IndeterminateProgress,
  PageLoading,
  ContentLoading,
  LoadingButton,
};
