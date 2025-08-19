import React from 'react';
import { Box, Spinner, Center, Text } from '@chakra-ui/react';

interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  minHeight?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'xl', 
  text = 'Loading your coaching dashboard...',
  minHeight = '400px'
}) => {
  return (
    <Center minH={minHeight}>
      <Box textAlign="center">
        <Spinner size={size} color="blue.500" mb={4} />
        <Text color="gray.600">{text}</Text>
      </Box>
    </Center>
  );
};

export default LoadingSpinner;


