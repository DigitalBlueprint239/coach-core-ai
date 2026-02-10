import React from 'react';
import { Button as ChakraButton } from '@chakra-ui/react';

const Button = ({ 
  children, 
  variant = 'solid', 
  size = 'md', 
  isLoading = false,
  loadingText,
  leftIcon,
  rightIcon,
  isDisabled = false,
  onClick,
  type = 'button',
  ...props 
}) => {
  return (
    <ChakraButton
      variant={variant}
      size={size}
      isLoading={isLoading}
      loadingText={loadingText}
      leftIcon={leftIcon}
      rightIcon={rightIcon}
      isDisabled={isDisabled}
      onClick={onClick}
      type={type}
      {...props}
    >
      {children}
    </ChakraButton>
  );
};

export default Button; 