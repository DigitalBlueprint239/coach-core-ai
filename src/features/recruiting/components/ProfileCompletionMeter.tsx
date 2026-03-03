import { Box, Button, Flex, HStack, Progress, Text, Tooltip, VStack } from '@chakra-ui/react';
import { CheckCircle, Clock, Sparkles } from 'lucide-react';

export interface ProfileCompletionMeterProps {
  completion: number;
  readinessScore: number;
  saveStatus: 'idle' | 'saving' | 'saved';
  nextActions?: string[];
  onViewPublicProfile?: () => void;
}

const statusCopy: Record<'idle' | 'saving' | 'saved', string> = {
  idle: 'All changes saved',
  saving: 'Saving changes…',
  saved: 'Saved just now',
};

export const ProfileCompletionMeter = ({
  completion,
  readinessScore,
  saveStatus,
  nextActions = [],
  onViewPublicProfile,
}: ProfileCompletionMeterProps) => {
  const clampedCompletion = Math.min(100, Math.max(0, completion));
  const clampedReadiness = Math.min(100, Math.max(0, readinessScore));

  return (
    <VStack align="stretch" spacing={4} borderWidth="1px" borderRadius="lg" p={5} bg="white" shadow="sm">
      <Flex justify="space-between" align={{ base: 'flex-start', md: 'center' }} direction={{ base: 'column', md: 'row' }} gap={3}>
        <Box>
          <Text fontSize="lg" fontWeight="semibold">
            Profile completeness
          </Text>
          <Text fontSize="sm" color="gray.600">
            Keep your recruiting profile at 100% for maximum visibility.
          </Text>
        </Box>
        <HStack spacing={2} color={saveStatus === 'saving' ? 'orange.500' : 'green.500'}>
          {saveStatus === 'saving' ? <Clock size={16} /> : <CheckCircle size={16} />}
          <Text fontSize="xs" fontWeight="medium">
            {statusCopy[saveStatus]}
          </Text>
        </HStack>
      </Flex>

      <VStack align="stretch" spacing={2}>
        <Progress value={clampedCompletion} colorScheme="blue" borderRadius="md" />
        <Flex justify="space-between" fontSize="sm" color="gray.600">
          <Text>{clampedCompletion}% complete</Text>
          <Tooltip label="Readiness blends academics, measurables, and media health" hasArrow placement="top">
            <HStack spacing={1} color="purple.500">
              <Sparkles size={14} />
              <Text>Readiness {clampedReadiness}</Text>
            </HStack>
          </Tooltip>
        </Flex>
      </VStack>

      {nextActions.length > 0 && (
        <VStack align="stretch" spacing={2}>
          <Text fontSize="sm" fontWeight="semibold">
            Next steps
          </Text>
          <VStack align="stretch" spacing={1} fontSize="sm" color="gray.700">
            {nextActions.map((action) => (
              <Text key={action}>• {action}</Text>
            ))}
          </VStack>
        </VStack>
      )}

      {onViewPublicProfile && (
        <Button
          onClick={onViewPublicProfile}
          colorScheme="blue"
          size="sm"
          alignSelf={{ base: 'stretch', md: 'flex-end' }}
        >
          View public page
        </Button>
      )}
    </VStack>
  );
};

export default ProfileCompletionMeter;
