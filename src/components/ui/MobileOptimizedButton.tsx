import React from 'react';
import {
  Button,
  ButtonProps,
  useColorModeValue,
  useBreakpointValue,
} from '@chakra-ui/react';
import {
  TOUCH_SIZES,
  RESPONSIVE_FONTS,
  RESPONSIVE_SPACING,
} from '../../utils/responsive';

interface MobileOptimizedButtonProps extends Omit<ButtonProps, 'size'> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'solid' | 'outline' | 'ghost' | 'link' | 'unstyled';
  colorScheme?: string;
  isFullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactElement;
  rightIcon?: React.ReactElement;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

const MobileOptimizedButton: React.FC<MobileOptimizedButtonProps> = ({
  size = 'md',
  variant = 'solid',
  colorScheme = 'blue',
  isFullWidth = false,
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  onClick,
  disabled = false,
  ...rest
}) => {
  const isMobile = useBreakpointValue({ base: true, md: false });

  // Get responsive button size
  const getButtonSize = () => {
    if (isMobile) {
      // Mobile: ensure touch-friendly sizing
      switch (size) {
        case 'xs':
          return {
            h: TOUCH_SIZES.button,
            px: 3,
            py: 2,
            fontSize: RESPONSIVE_FONTS.xs,
          };
        case 'sm':
          return {
            h: TOUCH_SIZES.button,
            px: 4,
            py: 2,
            fontSize: RESPONSIVE_FONTS.sm,
          };
        case 'lg':
          return { h: '52px', px: 6, py: 3, fontSize: RESPONSIVE_FONTS.md };
        case 'xl':
          return { h: '56px', px: 8, py: 4, fontSize: RESPONSIVE_FONTS.lg };
        default: // md
          return {
            h: TOUCH_SIZES.button,
            px: 5,
            py: 2,
            fontSize: RESPONSIVE_FONTS.sm,
          };
      }
    } else {
      // Desktop: use standard sizing
      switch (size) {
        case 'xs':
          return { h: '24px', px: 2, py: 1, fontSize: 'xs' };
        case 'sm':
          return { h: '32px', px: 3, py: 1, fontSize: 'sm' };
        case 'lg':
          return { h: '40px', px: 6, py: 2, fontSize: 'md' };
        case 'xl':
          return { h: '48px', px: 8, py: 3, fontSize: 'lg' };
        default: // md
          return { h: '36px', px: 4, py: 2, fontSize: 'sm' };
      }
    }
  };

  // Get responsive spacing
  const getSpacing = () => {
    if (isMobile) {
      return { gap: 2, minW: TOUCH_SIZES.button };
    }
    return { gap: 2 };
  };

  const buttonSize = getButtonSize();
  const spacing = getSpacing();

  // Enhanced hover and active states for mobile
  const getMobileStates = () => {
    if (isMobile) {
      return {
        _hover: {
          transform: 'scale(1.02)',
          boxShadow: 'lg',
        },
        _active: {
          transform: 'scale(0.98)',
          boxShadow: 'md',
        },
        _focus: {
          boxShadow: '0 0 0 3px var(--chakra-colors-blue-500)',
        },
      };
    }
    return {};
  };

  return (
    <Button
      size={size}
      variant={variant}
      colorScheme={colorScheme}
      width={isFullWidth ? '100%' : 'auto'}
      isLoading={isLoading}
      leftIcon={leftIcon}
      rightIcon={rightIcon}
      onClick={onClick}
      disabled={disabled}
      borderRadius={{ base: 'xl', md: 'md' }}
      fontWeight="medium"
      transition="all 0.2s"
      {...buttonSize}
      {...spacing}
      {...getMobileStates()}
      {...rest}
    >
      {children}
    </Button>
  );
};

export default MobileOptimizedButton;
