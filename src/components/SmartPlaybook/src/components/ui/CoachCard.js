import React from 'react';

import { Box, VStack, HStack, Text, Badge, Avatar, Button } from '@chakra-ui/react';

const CoachCard = ({ 
  coach,
  onViewProfile,
  onContact,
  variant = 'default',
  ...props 
}) => {
  const { name, sport, experience, rating, avatar, isOnline, specialties } = coach;

  return (
    <Box
      bg="white"
      borderRadius="lg"
      boxShadow="base"
      p={6}
      border="1px solid"
      borderColor="gray.200"
      _hover={{ boxShadow: 'md', transform: 'translateY(-2px)' }}
      transition="all 0.2s"
      {...props}
    >
      <VStack spacing={4} align="stretch">
        <HStack justify="space-between">
          <HStack spacing={3}>
            <Avatar 
              size="md" 
              src={avatar} 
              name={name}
              bg={isOnline ? 'green.500' : 'gray.300'}
            />
            <Box>
              <Text fontWeight="semibold" fontSize="lg">{name}</Text>
              <Text color="gray.600" fontSize="sm">{sport} Coach</Text>
            </Box>
          </HStack>
          <Badge 
            colorScheme={isOnline ? 'green' : 'gray'} 
            variant="subtle"
          >
            {isOnline ? 'Online' : 'Offline'}
          </Badge>
        </HStack>

        <Box>
          <Text fontSize="sm" color="gray.600" mb={2}>
            Experience: {experience} years
          </Text>
          <Text fontSize="sm" color="gray.600" mb={2}>
            Rating: {rating}/5 ⭐
          </Text>
          {specialties && (
            <Box>
              <Text fontSize="sm" color="gray.600" mb={1}>
                Specialties:
              </Text>
              <HStack spacing={1} flexWrap="wrap">
                {specialties.map((specialty, index) => (
                  <Badge key={index} size="sm" colorScheme="blue" variant="subtle">
                    {specialty}
                  </Badge>
                ))}
              </HStack>
            </Box>
          )}
        </Box>

        <HStack spacing={3}>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={onViewProfile}
            flex={1}
          >
            View Profile
          </Button>
          <Button 
            size="sm" 
            variant="solid" 
            onClick={onContact}
            flex={1}
          >
            Contact
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
};

export default CoachCard; 