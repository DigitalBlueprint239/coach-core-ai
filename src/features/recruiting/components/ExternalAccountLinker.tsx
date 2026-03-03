import { Badge, Box, Button, HStack, Icon, Stack, Text, VStack } from '@chakra-ui/react';
import { CheckCircle, Link as LinkIcon, Plug, RefreshCw, Unplug } from 'lucide-react';

export type ExternalAccountStatus = 'connected' | 'manual' | 'not_linked';

export interface ExternalAccountDescriptor {
  key: 'youtube' | 'hudl' | 'instagram' | 'maxpreps' | 'twitter';
  label: string;
  status: ExternalAccountStatus;
  url?: string;
  helperText?: string;
  lastSyncedAt?: string;
  isLoading?: boolean;
  onConnect?: () => void;
  onManualLink?: () => void;
  onDisconnect?: () => void;
}

const statusConfig: Record<ExternalAccountStatus, { color: string; label: string; icon: typeof CheckCircle }> = {
  connected: { color: 'green', label: 'Connected', icon: CheckCircle },
  manual: { color: 'orange', label: 'Manual', icon: Plug },
  not_linked: { color: 'gray', label: 'Not Linked', icon: Unplug },
};

export interface ExternalAccountLinkerProps {
  title?: string;
  description?: string;
  providers: ExternalAccountDescriptor[];
}

export const ExternalAccountLinker = ({
  title = 'Linked accounts',
  description = 'Connect highlight sources so we can keep your film and stats current.',
  providers,
}: ExternalAccountLinkerProps) => (
  <VStack align="stretch" spacing={4} borderWidth="1px" borderRadius="lg" p={5} bg="white" shadow="sm">
    <Box>
      <Text fontSize="lg" fontWeight="semibold">
        {title}
      </Text>
      <Text fontSize="sm" color="gray.600">
        {description}
      </Text>
    </Box>

    <Stack spacing={4}>
      {providers.map((provider) => {
        const status = statusConfig[provider.status];
        return (
          <HStack key={provider.key} align="flex-start" justify="space-between" spacing={4}>
            <VStack align="stretch" spacing={1} flex={1}>
              <HStack spacing={2}>
                <Text fontWeight="semibold">{provider.label}</Text>
                <Badge colorScheme={status.color} display="flex" alignItems="center" gap={1}>
                  <Icon as={status.icon} boxSize={3} />
                  <Text fontSize="xs">{status.label}</Text>
                </Badge>
              </HStack>
              {provider.url && (
                <HStack fontSize="xs" color="gray.500" spacing={1}>
                  <Icon as={LinkIcon} boxSize={3} />
                  <Text noOfLines={1}>{provider.url}</Text>
                </HStack>
              )}
              {provider.helperText && (
                <Text fontSize="xs" color="gray.500">
                  {provider.helperText}
                </Text>
              )}
              {provider.lastSyncedAt && (
                <Text fontSize="xs" color="gray.500">
                  Last synced {new Date(provider.lastSyncedAt).toLocaleString()}
                </Text>
              )}
            </VStack>
            <HStack spacing={2}>
              {provider.onManualLink && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={provider.onManualLink}
                  leftIcon={<Plug size={14} />}
                >
                  Manual link
                </Button>
              )}
              {provider.status !== 'connected' && provider.onConnect && (
                <Button
                  colorScheme="blue"
                  size="sm"
                  isLoading={provider.isLoading}
                  onClick={provider.onConnect}
                  leftIcon={<RefreshCw size={14} />}
                >
                  Connect
                </Button>
              )}
              {provider.status === 'connected' && provider.onDisconnect && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={provider.onDisconnect}
                  leftIcon={<Unplug size={14} />}
                >
                  Disconnect
                </Button>
              )}
            </HStack>
          </HStack>
        );
      })}
    </Stack>
  </VStack>
);

export default ExternalAccountLinker;
