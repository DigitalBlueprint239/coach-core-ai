import React from 'react';
import { Avatar, Box, Flex, List, ListItem, Stack, Text, useColorModeValue } from '@chakra-ui/react';

export interface ActivityEntry {
  id: string;
  title: string;
  description?: string;
  timestamp: Date;
  avatarUrl?: string;
}

interface ActivityFeedProps {
  items: ActivityEntry[];
  emptyState?: React.ReactNode;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ items, emptyState }) => {
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  if (!items.length) {
    return (
      <Box
        borderWidth="1px"
        borderColor={borderColor}
        borderRadius="lg"
        p={6}
        textAlign="center"
        color="gray.500"
      >
        {emptyState || 'No recent activity yet.'}
      </Box>
    );
  }

  return (
    <List spacing={4}>
      {items.map((item) => (
        <ListItem key={item.id}>
          <Flex align="flex-start" gap={3}>
            <Avatar size="sm" src={item.avatarUrl} name={item.title} />
            <Stack spacing={1} flex="1">
              <Text fontWeight="semibold" color="gray.800">
                {item.title}
              </Text>
              {item.description ? (
                <Text fontSize="sm" color="gray.600">
                  {item.description}
                </Text>
              ) : null}
              <Text fontSize="xs" color="gray.400">
                {item.timestamp.toLocaleString()}
              </Text>
            </Stack>
          </Flex>
        </ListItem>
      ))}
    </List>
  );
};

export default ActivityFeed;
