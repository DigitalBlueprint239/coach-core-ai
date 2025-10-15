import React from 'react';
import { Box, Text, HStack, Icon, keyframes } from '@chakra-ui/react';
import { CheckCircle, AlertCircle, Clock, Wifi } from 'lucide-react';

interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'loading' | 'error';
  message?: string;
  showIcon?: boolean;
}

const pulse = keyframes`
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
`;

const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  message,
  showIcon = true,
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'online':
        return {
          color: 'green.500',
          bg: 'green.50',
          borderColor: 'green.200',
          icon: CheckCircle,
          text: message || 'System Online',
        };
      case 'offline':
        return {
          color: 'gray.500',
          bg: 'gray.50',
          borderColor: 'gray.200',
          icon: Wifi,
          text: message || 'System Offline',
        };
      case 'loading':
        return {
          color: 'blue.500',
          bg: 'blue.50',
          borderColor: 'blue.200',
          icon: Clock,
          text: message || 'Loading...',
        };
      case 'error':
        return {
          color: 'red.500',
          bg: 'red.50',
          borderColor: 'red.200',
          icon: AlertCircle,
          text: message || 'System Error',
        };
      default:
        return {
          color: 'gray.500',
          bg: 'gray.50',
          borderColor: 'gray.200',
          icon: Clock,
          text: message || 'Unknown Status',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Box
      bg={config.bg}
      border="1px"
      borderColor={config.borderColor}
      borderRadius="lg"
      px={3}
      py={2}
      display="inline-flex"
      alignItems="center"
      animation={status === 'loading' ? `${pulse} 2s infinite` : 'none'}
    >
      <HStack spacing={2}>
        {showIcon && <Icon as={config.icon} color={config.color} boxSize={4} />}
        <Text fontSize="sm" color={config.color} fontWeight="medium">
          {config.text}
        </Text>
      </HStack>
    </Box>
  );
};

export default StatusIndicator;
