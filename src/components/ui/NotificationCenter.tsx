import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Icon,
  IconButton,
  Badge,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  PopoverHeader,
  PopoverCloseButton,
  useColorModeValue,
} from '@chakra-ui/react';
import { Bell, X, CheckCircle, AlertCircle, Info } from 'lucide-react';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

interface NotificationCenterProps {
  notifications?: Notification[];
  onNotificationClick?: (notification: Notification) => void;
  onMarkAsRead?: (notificationId: string) => void;
  onClearAll?: () => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications = [],
  onNotificationClick,
  onMarkAsRead,
  onClearAll,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return CheckCircle;
      case 'error':
        return AlertCircle;
      case 'warning':
        return AlertCircle;
      case 'info':
        return Info;
      default:
        return Info;
    }
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'green.500';
      case 'error':
        return 'red.500';
      case 'warning':
        return 'orange.500';
      case 'info':
        return 'blue.500';
      default:
        return 'gray.500';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
    if (onNotificationClick) {
      onNotificationClick(notification);
    }
    setIsOpen(false);
  };

  return (
    <Popover
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      placement="bottom-end"
    >
      <PopoverTrigger>
        <Box position="relative">
          <IconButton
            aria-label="Notifications"
            icon={<Icon as={Bell} />}
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
          />
          {unreadCount > 0 && (
            <Badge
              position="absolute"
              top="-1"
              right="-1"
              colorScheme="red"
              variant="solid"
              fontSize="xs"
              borderRadius="full"
              minW="20px"
              h="20px"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Box>
      </PopoverTrigger>
      <PopoverContent
        bg={bgColor}
        borderColor={borderColor}
        boxShadow="xl"
        w="400px"
        maxH="500px"
        overflow="hidden"
      >
        <PopoverHeader
          borderBottom="1px"
          borderColor={borderColor}
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          py={3}
        >
          <Text fontWeight="semibold">Notifications</Text>
          <HStack spacing={2}>
            {unreadCount > 0 && (
              <Text fontSize="sm" color="gray.500">
                {unreadCount} unread
              </Text>
            )}
            {onClearAll && (
              <IconButton
                aria-label="Clear all"
                icon={<Icon as={X} />}
                size="xs"
                variant="ghost"
                onClick={onClearAll}
              />
            )}
            <PopoverCloseButton position="static" />
          </HStack>
        </PopoverHeader>
        <PopoverBody p={0} maxH="400px" overflowY="auto">
          {notifications.length === 0 ? (
            <Box p={6} textAlign="center">
              <Icon as={Bell} boxSize={8} color="gray.400" mb={2} />
              <Text color="gray.500" fontSize="sm">
                No notifications
              </Text>
            </Box>
          ) : (
            <VStack spacing={0} align="stretch">
              {notifications.map(notification => (
                <Box
                  key={notification.id}
                  p={4}
                  borderBottom="1px"
                  borderColor={borderColor}
                  cursor="pointer"
                  bg={notification.read ? 'transparent' : 'blue.50'}
                  _hover={{ bg: useColorModeValue('gray.50', 'gray.700') }}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <HStack spacing={3} align="start">
                    <Icon
                      as={getNotificationIcon(notification.type)}
                      color={getNotificationColor(notification.type)}
                      boxSize={5}
                      mt={0.5}
                    />
                    <VStack align="start" spacing={1} flex={1}>
                      <Text fontSize="sm" fontWeight="medium">
                        {notification.title}
                      </Text>
                      <Text fontSize="xs" color="gray.600" lineHeight="1.4">
                        {notification.message}
                      </Text>
                      <Text fontSize="xs" color="gray.400">
                        {formatTimestamp(notification.timestamp)}
                      </Text>
                    </VStack>
                    {!notification.read && (
                      <Box
                        w={2}
                        h={2}
                        bg="blue.500"
                        borderRadius="full"
                        flexShrink={0}
                      />
                    )}
                  </HStack>
                </Box>
              ))}
            </VStack>
          )}
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationCenter;
