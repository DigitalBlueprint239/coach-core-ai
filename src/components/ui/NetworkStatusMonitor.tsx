import React, { useState, useEffect } from 'react';
import {
  Box,
  HStack,
  VStack,
  Text,
  Badge,
  Icon,
  useColorModeValue,
  useToast,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Button,
  useDisclosure,
  Collapse,
  Progress,
} from '@chakra-ui/react';
import { Wifi, WifiOff, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { useAppStore } from '../../services/state/app-store';

interface NetworkStatus {
  isOnline: boolean;
  connectionType?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  lastUpdated: Date;
}

interface NetworkStatusMonitorProps {
  showDetails?: boolean;
  showToast?: boolean;
  autoSync?: boolean;
}

const NetworkStatusMonitor: React.FC<NetworkStatusMonitorProps> = ({
  showDetails = false,
  showToast = true,
  autoSync = true,
}) => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    lastUpdated: new Date(),
  });
  
  const [isExpanded, setIsExpanded] = useState(false);
  const { isOpen, onToggle } = useDisclosure();
  const toast = useToast();
  
  const { offlineQueue, syncStatus, syncOfflineData } = useAppStore();
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const onlineColor = useColorModeValue('green.500', 'green.400');
  const offlineColor = useColorModeValue('red.500', 'red.400');
  const warningColor = useColorModeValue('orange.500', 'orange.400');

  // Get network information if available
  const getNetworkInfo = async (): Promise<Partial<NetworkStatus>> => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return {
        connectionType: connection.effectiveType || connection.type,
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
      };
    }
    return {};
  };

  // Update network status
  const updateNetworkStatus = async () => {
    const networkInfo = await getNetworkInfo();
    const newStatus: NetworkStatus = {
      isOnline: navigator.onLine,
      lastUpdated: new Date(),
      ...networkInfo,
    };
    
    setNetworkStatus(newStatus);
    
    // Show toast notification if enabled
    if (showToast) {
      if (newStatus.isOnline && !networkStatus.isOnline) {
        toast({
          title: 'Connection Restored',
          description: 'You are back online. Syncing offline data...',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else if (!newStatus.isOnline && networkStatus.isOnline) {
        toast({
          title: 'Connection Lost',
          description: 'You are currently offline. Changes will be saved locally.',
          status: 'warning',
          duration: 5000,
          isClosable: true,
        });
      }
    }
  };

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => updateNetworkStatus();
    const handleOffline = () => updateNetworkStatus();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial network info
    updateNetworkStatus();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (networkStatus.isOnline && autoSync && offlineQueue.length > 0) {
      syncOfflineData();
    }
  }, [networkStatus.isOnline, offlineQueue.length, autoSync, syncOfflineData]);

  // Get status badge color
  const getStatusColor = () => {
    if (!networkStatus.isOnline) return 'red';
    if (offlineQueue.length > 0) return 'orange';
    return 'green';
  };

  // Get status text
  const getStatusText = () => {
    if (!networkStatus.isOnline) return 'Offline';
    if (offlineQueue.length > 0) return 'Syncing';
    return 'Online';
  };

  // Get status icon
  const getStatusIcon = () => {
    if (!networkStatus.isOnline) return WifiOff;
    if (offlineQueue.length > 0) return AlertTriangle;
    return Wifi;
  };

  // Format connection speed
  const formatSpeed = (downlink?: number) => {
    if (!downlink) return 'Unknown';
    if (downlink < 1) return `${(downlink * 1000).toFixed(0)} Kbps`;
    return `${downlink.toFixed(1)} Mbps`;
  };

  // Format latency
  const formatLatency = (rtt?: number) => {
    if (!rtt) return 'Unknown';
    return `${rtt}ms`;
  };

  // Get connection quality
  const getConnectionQuality = () => {
    if (!networkStatus.effectiveType) return 'Unknown';
    
    const qualityMap: Record<string, { label: string; color: string }> = {
      'slow-2g': { label: 'Very Slow', color: 'red' },
      '2g': { label: 'Slow', color: 'orange' },
      '3g': { label: 'Moderate', color: 'yellow' },
      '4g': { label: 'Fast', color: 'green' },
    };
    
    return qualityMap[networkStatus.effectiveType] || { label: 'Unknown', color: 'gray' };
  };

  const connectionQuality = getConnectionQuality();

  return (
    <Box>
      {/* Main Status Bar */}
      <Box
        bg={bgColor}
        borderWidth="1px"
        borderColor={borderColor}
        borderRadius="lg"
        p={3}
        cursor="pointer"
        onClick={onToggle}
        _hover={{ bg: useColorModeValue('gray.50', 'gray.700') }}
        transition="all 0.2s"
      >
        <HStack justify="space-between" align="center">
          <HStack spacing={3}>
            <Icon
              as={getStatusIcon()}
              boxSize={5}
              color={networkStatus.isOnline ? onlineColor : offlineColor}
            />
            <VStack spacing={0} align="start">
              <Text fontSize="sm" fontWeight="medium">
                Network Status
              </Text>
              <Text fontSize="xs" color={useColorModeValue('gray.600', 'gray.400')}>
                {getStatusText()}
              </Text>
            </VStack>
          </HStack>

          <HStack spacing={2}>
            <Badge colorScheme={getStatusColor()} variant="subtle" fontSize="xs">
              {getStatusText()}
            </Badge>
            
            {offlineQueue.length > 0 && (
              <Badge colorScheme="orange" variant="solid" fontSize="xs">
                {offlineQueue.length} pending
              </Badge>
            )}
          </HStack>
        </HStack>
      </Box>

      {/* Expandable Details */}
      <Collapse in={isOpen} animateOpacity>
        <Box
          bg={bgColor}
          borderWidth="1px"
          borderColor={borderColor}
          borderTop="none"
          borderRadius="0 0 lg lg"
          p={4}
        >
          <VStack spacing={4} align="stretch">
            {/* Connection Details */}
            {showDetails && (
              <VStack spacing={3} align="stretch">
                <Text fontSize="sm" fontWeight="semibold" color={useColorModeValue('gray.700', 'gray.200')}>
                  Connection Details
                </Text>
                
                <HStack justify="space-between">
                  <Text fontSize="sm" color={useColorModeValue('gray.600', 'gray.400')}>
                    Connection Type:
                  </Text>
                  <Text fontSize="sm" fontWeight="medium">
                    {networkStatus.connectionType || 'Unknown'}
                  </Text>
                </HStack>

                <HStack justify="space-between">
                  <Text fontSize="sm" color={useColorModeValue('gray.600', 'gray.400')}>
                    Speed:
                  </Text>
                  <Text fontSize="sm" fontWeight="medium">
                    {formatSpeed(networkStatus.downlink)}
                  </Text>
                </HStack>

                <HStack justify="space-between">
                  <Text fontSize="sm" color={useColorModeValue('gray.600', 'gray.400')}>
                    Latency:
                  </Text>
                  <Text fontSize="sm" fontWeight="medium">
                    {formatLatency(networkStatus.rtt)}
                  </Text>
                </HStack>

                <HStack justify="space-between">
                  <Text fontSize="sm" color={useColorModeValue('gray.600', 'gray.400')}>
                    Quality:
                  </Text>
                  <Badge colorScheme={connectionQuality.color} variant="subtle" fontSize="xs">
                    {connectionQuality.label}
                  </Badge>
                </HStack>
              </VStack>
            )}

            {/* Offline Queue Status */}
            {offlineQueue.length > 0 && (
              <VStack spacing={3} align="stretch">
                <HStack justify="space-between" align="center">
                  <Text fontSize="sm" fontWeight="semibold" color={useColorModeValue('gray.700', 'gray.200')}>
                    Offline Queue
                  </Text>
                  <Badge colorScheme="orange" variant="solid" fontSize="xs">
                    {offlineQueue.length} items
                  </Badge>
                </HStack>

                <Progress
                  value={syncStatus === 'syncing' ? 50 : 0}
                  colorScheme="orange"
                  size="sm"
                  borderRadius="full"
                  isIndeterminate={syncStatus === 'syncing'}
                />

                <HStack justify="space-between">
                  <Text fontSize="xs" color={useColorModeValue('gray.600', 'gray.400')}>
                    Status: {syncStatus}
                  </Text>
                  <Button
                    size="xs"
                    leftIcon={<RefreshCw />}
                    onClick={syncOfflineData}
                    isDisabled={syncStatus === 'syncing'}
                    colorScheme="orange"
                    variant="outline"
                  >
                    Sync Now
                  </Button>
                </HStack>
              </VStack>
            )}

            {/* Last Updated */}
            <Text fontSize="xs" color={useColorModeValue('gray.500', 'gray.500')} textAlign="center">
              Last updated: {networkStatus.lastUpdated.toLocaleTimeString()}
            </Text>
          </VStack>
        </Box>
      </Collapse>
    </Box>
  );
};

export default NetworkStatusMonitor;
