import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import WaitlistLandingPage from './pages/WaitlistLandingPage';

function App() {
  return (
    <ChakraProvider>
      <WaitlistLandingPage />
    </ChakraProvider>
  );
}

export default App;
