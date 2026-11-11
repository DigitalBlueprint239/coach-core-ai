import React from 'react';
import { Input as ChakraInput, FormControl, FormLabel, FormErrorMessage } from '@chakra-ui/react';

const Input = ({ 
  label,
  error,
  isRequired = false,
  isInvalid = false,
  isDisabled = false,
  placeholder,
  value,
  onChange,
  type = 'text',
  size = 'md',
  ...props 
}) => {
  return (
    <FormControl isInvalid={isInvalid} isRequired={isRequired}>
      {label && <FormLabel>{label}</FormLabel>}
      <ChakraInput
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        isDisabled={isDisabled}
        size={size}
        {...props}
      />
      {error && <FormErrorMessage>{error}</FormErrorMessage>}
    </FormControl>
  );
};

export default Input; 