import React from 'react';
import { Box, Button, Flex, Heading, Stack, Text, useColorModeValue } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';

interface FeatureCardProps {
  title: string;
  description?: string;
  actionLabel?: string;
  to?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  description,
  actionLabel = 'Open',
  to,
  icon,
  onClick,
}) => {
  const bg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  return (
    <Box
      borderRadius="xl"
      borderWidth="1px"
      borderColor={borderColor}
      bg={bg}
      p={5}
      shadow="sm"
      transition="transform 0.2s ease"
      _hover={{ transform: 'translateY(-2px)', shadow: 'md' }}
    >
      <Stack spacing={4}>
        <Flex align="center" gap={3}>
          {icon ? (
            <Box
              bg="blue.500"
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
          <Heading size="md" color="gray.800">
            {title}
          </Heading>
        </Flex>
        {description ? (
          <Text color="gray.600" fontSize="sm">
            {description}
          </Text>
        ) : null}
        <Box>
          <Button
            as={to ? RouterLink : undefined}
            to={to}
            onClick={onClick}
            colorScheme="blue"
            variant="solid"
          >
            {actionLabel}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
};

export default FeatureCard;
