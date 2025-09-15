import React from 'react';
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  CardFooter,
  Text,
  Heading,
  Badge,
  HStack,
  VStack,
  Icon,
  IconButton,
  useColorModeValue,
  useBreakpointValue,
} from '@chakra-ui/react';
import {
  RESPONSIVE_SPACING,
  RESPONSIVE_FONTS,
  TOUCH_SIZES,
} from '../../utils/responsive';

interface MobileOptimizedCardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  badges?: Array<{ text: string; colorScheme?: string }>;
  actions?: Array<{
    icon: React.ComponentType<any>;
    onClick: () => void;
    label: string;
    colorScheme?: string;
  }>;
  onClick?: () => void;
  isClickable?: boolean;
  isSelected?: boolean;
  variant?: 'default' | 'elevated' | 'outline' | 'filled';
  size?: 'sm' | 'md' | 'lg';
}

const MobileOptimizedCard: React.FC<MobileOptimizedCardProps> = ({
  title,
  subtitle,
  children,
  footer,
  badges = [],
  actions = [],
  onClick,
  isClickable = false,
  isSelected = false,
  variant = 'default',
  size = 'md',
}) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const selectedBg = useColorModeValue('blue.50', 'blue.900');
  const selectedBorder = useColorModeValue('blue.200', 'blue.600');

  const isMobile = useBreakpointValue({ base: true, md: false });

  // Responsive sizing
  const getCardSize = () => {
    switch (size) {
      case 'sm':
        return { p: RESPONSIVE_SPACING.sm, spacing: RESPONSIVE_SPACING.sm };
      case 'lg':
        return { p: RESPONSIVE_SPACING.lg, spacing: RESPONSIVE_SPACING.lg };
      default:
        return { p: RESPONSIVE_SPACING.md, spacing: RESPONSIVE_SPACING.md };
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'elevated':
        return {
          boxShadow: { base: 'lg', md: 'md' },
          border: 'none',
        };
      case 'outline':
        return {
          boxShadow: 'none',
          border: '1px solid',
          borderColor: isSelected ? selectedBorder : borderColor,
        };
      case 'filled':
        return {
          boxShadow: 'none',
          border: 'none',
          bg: useColorModeValue('gray.50', 'gray.700'),
        };
      default:
        return {
          boxShadow: { base: 'sm', md: 'xs' },
          border: '1px solid',
          borderColor: isSelected ? selectedBorder : borderColor,
        };
    }
  };

  const cardSize = getCardSize();
  const variantStyles = getVariantStyles();

  return (
    <Card
      bg={isSelected ? selectedBg : bgColor}
      {...variantStyles}
      borderRadius={{ base: 'xl', md: 'lg' }}
      cursor={isClickable ? 'pointer' : 'default'}
      transition="all 0.2s"
      _hover={
        isClickable
          ? {
              transform: { base: 'none', md: 'translateY(-2px)' },
              boxShadow: { base: 'lg', md: 'xl' },
            }
          : {}
      }
      _active={
        isClickable
          ? {
              transform: { base: 'scale(0.98)', md: 'scale(0.99)' },
            }
          : {}
      }
      onClick={onClick}
      position="relative"
      overflow="hidden"
    >
      {/* Header */}
      {(title || subtitle || badges.length > 0) && (
        <CardHeader p={cardSize.p} pb={cardSize.spacing}>
          <VStack spacing={cardSize.spacing} align="stretch">
            {title && (
              <Heading
                size={useBreakpointValue({ base: 'md', md: 'sm' })}
                color={useColorModeValue('gray.800', 'white')}
                fontWeight="semibold"
                lineHeight="tight"
              >
                {title}
              </Heading>
            )}

            {subtitle && (
              <Text
                fontSize={RESPONSIVE_FONTS.sm}
                color={useColorModeValue('gray.600', 'gray.300')}
                lineHeight="relaxed"
              >
                {subtitle}
              </Text>
            )}

            {badges.length > 0 && (
              <HStack spacing={2} flexWrap="wrap">
                {badges.map((badge, index) => (
                  <Badge
                    key={index}
                    colorScheme={badge.colorScheme || 'blue'}
                    variant="subtle"
                    fontSize={RESPONSIVE_FONTS.xs}
                    px={2}
                    py={1}
                    borderRadius="full"
                  >
                    {badge.text}
                  </Badge>
                ))}
              </HStack>
            )}
          </VStack>
        </CardHeader>
      )}

      {/* Body */}
      <CardBody
        p={cardSize.p}
        pt={title || subtitle || badges.length > 0 ? 0 : cardSize.p}
      >
        <Box fontSize={RESPONSIVE_FONTS.md} lineHeight="relaxed">
          {children}
        </Box>
      </CardBody>

      {/* Footer */}
      {(footer || actions.length > 0) && (
        <CardFooter
          p={cardSize.p}
          pt={0}
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          flexWrap="wrap"
          gap={2}
        >
          {footer && (
            <Box flex="1" minW="0">
              {footer}
            </Box>
          )}

          {actions.length > 0 && (
            <HStack spacing={2} flexShrink={0}>
              {actions.map((action, index) => (
                <IconButton
                  key={index}
                  aria-label={action.label}
                  icon={<action.icon />}
                  onClick={e => {
                    e.stopPropagation();
                    action.onClick();
                  }}
                  size={isMobile ? 'md' : 'sm'}
                  colorScheme={action.colorScheme || 'gray'}
                  variant="ghost"
                  minH={TOUCH_SIZES.button}
                  minW={TOUCH_SIZES.button}
                  borderRadius="full"
                  _hover={{
                    bg: useColorModeValue('gray.100', 'gray.700'),
                  }}
                  _active={{
                    bg: useColorModeValue('gray.200', 'gray.600'),
                  }}
                />
              ))}
            </HStack>
          )}
        </CardFooter>
      )}

      {/* Touch indicator for mobile */}
      {isClickable && isMobile && (
        <Box
          position="absolute"
          top={2}
          right={2}
          w={2}
          h={2}
          borderRadius="full"
          bg={useColorModeValue('blue.400', 'blue.300')}
          opacity={0.6}
        />
      )}
    </Card>
  );
};

export default MobileOptimizedCard;
