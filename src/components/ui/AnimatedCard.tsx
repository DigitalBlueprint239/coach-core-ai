import React from 'react';
import { Box, BoxProps } from '@chakra-ui/react';

interface AnimatedCardProps extends BoxProps {
  children: React.ReactNode;
  delay?: number;
}

const AnimatedCard: React.FC<AnimatedCardProps> = ({ 
  children, 
  delay = 0, 
  ...props 
}) => {
  return (
    <Box
      {...props}
      opacity={0}
      transform="translateY(20px)"
      animation={`fadeInUp 0.6s ease-out ${delay}s forwards`}
      _hover={{
        transform: 'translateY(-4px)',
        boxShadow: 'xl',
      }}
      transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
      sx={{
        '@keyframes fadeInUp': {
          '0%': {
            opacity: 0,
            transform: 'translateY(20px)',
          },
          '100%': {
            opacity: 1,
            transform: 'translateY(0)',
          },
        },
      }}
    >
      {children}
    </Box>
  );
};

export default AnimatedCard;

