import React from 'react';
import {
  Input,
  InputProps,
  FormControl,
  FormLabel,
  FormErrorMessage,
  FormHelperText,
  useColorModeValue,
  useBreakpointValue,
  Box,
  Text,
  HStack,
  Icon,
} from '@chakra-ui/react';
import { TOUCH_SIZES, RESPONSIVE_FONTS, RESPONSIVE_SPACING } from '../../utils/responsive';

interface MobileOptimizedInputProps extends Omit<InputProps, 'size'> {
  label?: string;
  helperText?: string;
  error?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  isInvalid?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  leftIcon?: React.ComponentType<any>;
  rightIcon?: React.ComponentType<any>;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  type?: string;
  name?: string;
  id?: string;
}

const MobileOptimizedInput: React.FC<MobileOptimizedInputProps> = ({
  label,
  helperText,
  error,
  isRequired = false,
  isDisabled = false,
  isReadOnly = false,
  isInvalid = false,
  size = 'md',
  leftIcon,
  rightIcon,
  placeholder,
  value,
  onChange,
  onBlur,
  onFocus,
  type = 'text',
  name,
  id,
  ...rest
}) => {
  const isMobile = useBreakpointValue({ base: true, md: false });
  
  const borderColor = useColorModeValue('gray.300', 'gray.600');
  const focusBorderColor = useColorModeValue('blue.500', 'blue.400');
  const errorBorderColor = useColorModeValue('red.500', 'red.400');
  const labelColor = useColorModeValue('gray.700', 'gray.200');
  const helperColor = useColorModeValue('gray.600', 'gray.400');
  const errorColor = useColorModeValue('red.500', 'red.400');
  
  // Get responsive input size
  const getInputSize = () => {
    if (isMobile) {
      // Mobile: ensure touch-friendly sizing
      switch (size) {
        case 'xs':
          return { h: TOUCH_SIZES.input, px: 3, py: 2, fontSize: RESPONSIVE_FONTS.xs };
        case 'sm':
          return { h: TOUCH_SIZES.input, px: 4, py: 2, fontSize: RESPONSIVE_FONTS.sm };
        case 'lg':
          return { h: '56px', px: 6, py: 3, fontSize: RESPONSIVE_FONTS.md };
        case 'xl':
          return { h: '60px', px: 8, py: 4, fontSize: RESPONSIVE_FONTS.lg };
        default: // md
          return { h: TOUCH_SIZES.input, px: 5, py: 2, fontSize: RESPONSIVE_FONTS.sm };
      }
    } else {
      // Desktop: use standard sizing
      switch (size) {
        case 'xs':
          return { h: '24px', px: 2, py: 1, fontSize: 'xs' };
        case 'sm':
          return { h: '32px', px: 3, py: 1, fontSize: 'sm' };
        case 'lg':
          return { h: '40px', px: 4, py: 2, fontSize: 'md' };
        case 'xl':
          return { h: '48px', px: 6, py: 3, fontSize: 'lg' };
        default: // md
          return { h: '36px', px: 3, py: 2, fontSize: 'sm' };
      }
    }
  };

  // Get responsive label and helper text sizing
  const getTextSize = () => {
    if (isMobile) {
      return {
        labelSize: RESPONSIVE_FONTS.md,
        helperSize: RESPONSIVE_FONTS.sm,
        spacing: RESPONSIVE_SPACING.sm,
      };
    }
    return {
      labelSize: 'sm',
      helperSize: 'xs',
      spacing: 2,
    };
  };

  const inputSize = getInputSize();
  const textSize = getTextSize();

  // Enhanced focus states for mobile
  const getMobileFocusStates = () => {
    if (isMobile) {
      return {
        _focus: {
          borderColor: isInvalid ? errorBorderColor : focusBorderColor,
          boxShadow: `0 0 0 1px ${isInvalid ? errorBorderColor : focusBorderColor}`,
          transform: 'scale(1.01)',
        },
        _hover: {
          borderColor: isInvalid ? errorBorderColor : 'gray.400',
        },
      };
    }
    return {
      _focus: {
        borderColor: isInvalid ? errorBorderColor : focusBorderColor,
        boxShadow: `0 0 0 1px ${isInvalid ? errorBorderColor : focusBorderColor}`,
      },
    };
  };

  return (
    <FormControl
      isRequired={isRequired}
      isDisabled={isDisabled}
      isInvalid={isInvalid}
      mb={textSize.spacing}
    >
      {label && (
        <FormLabel
          htmlFor={id || name}
          fontSize={textSize.labelSize}
          fontWeight="medium"
          color={labelColor}
          mb={2}
          display="flex"
          alignItems="center"
          gap={2}
        >
          {label}
          {isRequired && (
            <Text as="span" color={errorColor}>
              *
            </Text>
          )}
        </FormLabel>
      )}

      <Box position="relative">
        {leftIcon && (
          <Box
            position="absolute"
            left={4}
            top="50%"
            transform="translateY(-50%)"
            zIndex={1}
            color={useColorModeValue('gray.500', 'gray.400')}
          >
            <Icon as={leftIcon} boxSize={isMobile ? 5 : 4} />
          </Box>
        )}

        <Input
          id={id || name}
          name={name}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          onFocus={onFocus}
          isDisabled={isDisabled}
          isReadOnly={isReadOnly}
          borderRadius={{ base: 'xl', md: 'md' }}
          borderColor={isInvalid ? errorBorderColor : borderColor}
          transition="all 0.2s"
          pl={leftIcon ? (isMobile ? 12 : 10) : undefined}
          pr={rightIcon ? (isMobile ? 12 : 10) : undefined}
          {...inputSize}
          {...getMobileFocusStates()}
          {...rest}
        />

        {rightIcon && (
          <Box
            position="absolute"
            right={4}
            top="50%"
            transform="translateY(-50%)"
            zIndex={1}
            color={useColorModeValue('gray.500', 'gray.400')}
          >
            <Icon as={rightIcon} boxSize={isMobile ? 5 : 4} />
          </Box>
        )}
      </Box>

      {helperText && !error && (
        <FormHelperText
          fontSize={textSize.helperSize}
          color={helperColor}
          mt={1}
        >
          {helperText}
        </FormHelperText>
      )}

      {error && (
        <FormErrorMessage
          fontSize={textSize.helperSize}
          color={errorColor}
          mt={1}
        >
          {error}
        </FormErrorMessage>
      )}
    </FormControl>
  );
};

export default MobileOptimizedInput;
