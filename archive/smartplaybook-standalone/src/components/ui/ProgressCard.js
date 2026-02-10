import React from 'react';
import { Box, VStack, HStack, Text, Progress, Badge, Icon } from '@chakra-ui/react';

const ProgressCard = ({ 
  title,
  currentValue,
  maxValue,
  unit = '',
  progressColor = 'blue',
  badgeText,
  badgeColor = 'green',
  icon,
  description,
  ...props 
}) => {
  const percentage = Math.min((currentValue / maxValue) * 100, 100);

  return (
    <Box
      bg="white"
      borderRadius="lg"
      boxShadow="base"
      p={6}
      border="1px solid"
      borderColor="gray.200"
      {...props}
    >
      <VStack spacing={4} align="stretch">
        <HStack justify="space-between">
          <HStack spacing={2}>
            {icon && <Icon as={icon} color={`${progressColor}.500`} />}
            <Text fontWeight="semibold" fontSize="lg">{title}</Text>
          </HStack>
          {badgeText && (
            <Badge colorScheme={badgeColor} variant="subtle">
              {badgeText}
            </Badge>
          )}
        </HStack>

        <Box>
          <HStack justify="space-between" mb={2}>
            <Text fontSize="2xl" fontWeight="bold" color={`${progressColor}.600`}>
              {currentValue}{unit}
            </Text>
            <Text fontSize="sm" color="gray.500">
              of {maxValue}{unit}
            </Text>
          </HStack>
          <Progress 
            value={percentage} 
            colorScheme={progressColor}
            size="lg"
            borderRadius="full"
          />
          <Text fontSize="sm" color="gray.600" mt={2}>
            {percentage.toFixed(1)}% Complete
          </Text>
        </Box>

        {description && (
          <Text fontSize="sm" color="gray.600">
            {description}
          </Text>
        )}
      </VStack>
    </Box>
  );
};

export default ProgressCard; 