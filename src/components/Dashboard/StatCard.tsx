import React from 'react';
import { Box, Flex, Stack, Text, useColorModeValue } from '@chakra-ui/react';

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  helperText?: string;
  accentColor?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, helperText, accentColor }) => {
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const bg = useColorModeValue('white', 'gray.800');

  return (
    <Box
      bg={bg}
      borderWidth="1px"
      borderColor={borderColor}
      borderRadius="xl"
      p={5}
      shadow="sm"
      transition="transform 0.2s ease"
      _hover={{ transform: 'translateY(-2px)', shadow: 'md' }}
    >
      <Flex align="center" justify="space-between" mb={3}>
        <Text fontSize="sm" fontWeight="medium" color="gray.500">
          {label}
        </Text>
        {icon ? (
          <Box
            bg={accentColor || 'blue.500'}
            color="white"
            borderRadius="full"
            p={2}
            display="inline-flex"
            alignItems="center"
            justifyContent="center"
          >
            {icon}
          </Box>
        ) : null}
      </Flex>
      <Stack spacing={1}>
        <Text fontSize="2xl" fontWeight="bold" color="gray.800">
          {value}
        </Text>
        {helperText ? (
          <Text fontSize="sm" color="gray.500">
            {helperText}
          </Text>
        ) : null}
      </Stack>
    </Box>
  );
};

export default StatCard;
