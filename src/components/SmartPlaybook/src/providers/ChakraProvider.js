import React from 'react';
import { ChakraProvider as ChakraUIProvider } from '@chakra-ui/react';
import theme from '../theme';

const ChakraProvider = ({ children }) => {
  return (
    <ChakraUIProvider theme={theme}>
      {children}
    </ChakraUIProvider>
  );
};

export default ChakraProvider; 