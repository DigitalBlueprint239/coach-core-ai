import React from 'react';
import { 
  Box, 
  VStack, 
  HStack, 
  Text, 
  Button, 
  Badge, 
  Alert, 
  AlertIcon,
  SimpleGrid,
  Card,
  CardBody,
  CardHeader
} from '@chakra-ui/react';

// Integration Status Types
export type IntegrationStatus = 'connected' | 'disconnected' | 'error' | 'mock';

export interface Integration {
  id: string;
  name: string;
  type: 'wearable' | 'video' | 'analytics' | 'communication';
  status: IntegrationStatus;
  lastSync?: Date;
  description: string;
}

// Mock Integration Service
export class IntegrationService {
  private integrations: Integration[] = [
    {
      id: 'hudl',
      name: 'Hudl Video Analysis',
      type: 'video',
      status: 'mock',
      description: 'Video analysis and play breakdown'
    },
    {
      id: 'polar',
      name: 'Polar Heart Rate',
      type: 'wearable', 
      status: 'mock',
      description: 'Player heart rate monitoring'
    },
    {
      id: 'gps-tracking',
      name: 'GPS Player Tracking',
      type: 'analytics',
      status: 'mock',
      description: 'Real-time player positioning'
    },
    {
      id: 'team-communication',
      name: 'Team Communication',
      type: 'communication',
      status: 'mock',
      description: 'Team messaging and notifications'
    }
  ];

  async getIntegrations(): Promise<Integration[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return this.integrations;
  }

  async connectIntegration(id: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const integration = this.integrations.find(i => i.id === id);
    if (integration) {
      integration.status = 'connected';
      integration.lastSync = new Date();
      return true;
    }
    return false;
  }

  async disconnectIntegration(id: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const integration = this.integrations.find(i => i.id === id);
    if (integration) {
      integration.status = 'disconnected';
      return true;
    }
    return false;
  }
}

// Integration Card Component
const IntegrationCard: React.FC<{ integration: Integration; onToggle: (id: string) => void }> = ({
  integration,
  onToggle
}) => {
  const getStatusColor = (status: IntegrationStatus) => {
    switch (status) {
      case 'connected': return 'green';
      case 'disconnected': return 'gray';
      case 'error': return 'red';
      case 'mock': return 'yellow';
      default: return 'gray';
    }
  };

  const getStatusText = (status: IntegrationStatus) => {
    switch (status) {
      case 'connected': return 'Connected';
      case 'disconnected': return 'Disconnected';
      case 'error': return 'Error';
      case 'mock': return 'Mock Mode';
      default: return 'Unknown';
    }
  };

  return (
    <Card>
      <CardHeader pb={2}>
        <HStack justify="space-between">
          <Text fontWeight="bold">{integration.name}</Text>
          <Badge colorScheme={getStatusColor(integration.status)}>
            {getStatusText(integration.status)}
          </Badge>
        </HStack>
      </CardHeader>
      <CardBody pt={0}>
        <VStack align="start" spacing={3}>
          <Text fontSize="sm" color="gray.600">
            {integration.description}
          </Text>
          
          {integration.lastSync && (
            <Text fontSize="xs" color="gray.500">
              Last sync: {integration.lastSync.toLocaleString()}
            </Text>
          )}
          
          <Button
            size="sm"
            colorScheme={integration.status === 'connected' ? 'red' : 'blue'}
            onClick={() => onToggle(integration.id)}
          >
            {integration.status === 'connected' ? 'Disconnect' : 'Connect'}
          </Button>
        </VStack>
      </CardBody>
    </Card>
  );
};

// Main Integration Dashboard
export const CoachCoreIntegration: React.FC = () => {
  const [integrations, setIntegrations] = React.useState<Integration[]>([]);
  const [loading, setLoading] = React.useState(false);

  const integrationService = React.useMemo(() => new IntegrationService(), []);

  React.useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    setLoading(true);
    try {
      const data = await integrationService.getIntegrations();
      setIntegrations(data);
    } catch (error) {
      console.error('Failed to load integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleIntegration = async (id: string) => {
    const integration = integrations.find(i => i.id === id);
    if (!integration) return;

    try {
      if (integration.status === 'connected') {
        await integrationService.disconnectIntegration(id);
      } else {
        await integrationService.connectIntegration(id);
      }
      await loadIntegrations();
    } catch (error) {
      console.error('Failed to toggle integration:', error);
    }
  };

  return (
    <VStack spacing={6} align="stretch" p={4}>
      <Alert status="info">
        <AlertIcon />
        Integrations are in recovery mode - all connections are simulated
      </Alert>

      <Text fontSize="2xl" fontWeight="bold">
        Coach Core Integrations
      </Text>

      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
        {integrations.map((integration) => (
          <IntegrationCard
            key={integration.id}
            integration={integration}
            onToggle={handleToggleIntegration}
          />
        ))}
      </SimpleGrid>

      {loading && (
        <Text textAlign="center" color="gray.500">
          Loading integrations...
        </Text>
      )}
    </VStack>
  );
};

export default CoachCoreIntegration; 