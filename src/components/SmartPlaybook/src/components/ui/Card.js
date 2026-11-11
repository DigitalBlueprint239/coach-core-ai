import React from 'react';
import { Box } from '@chakra-ui/react';

const Card = ({ 
  children, 
  variant = 'elevated',
  padding = 6,
  borderRadius = 'lg',
  shadow = 'base',
  bg = 'white',
  border,
  ...props 
}) => {
  return (
    <Box
      bg={bg}
      borderRadius={borderRadius}
      boxShadow={shadow}
      p={padding}
      border={border}
      {...props}
    >
      {children}
    </Box>
  );
};

export default Card; 