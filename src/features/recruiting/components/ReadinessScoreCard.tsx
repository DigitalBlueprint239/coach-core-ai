import { Badge, Box, Progress, Text, VStack } from '@chakra-ui/react';
import { Sparkles } from 'lucide-react';

export interface ReadinessScoreCardProps {
  score: number;
  summary?: string;
  nextSteps?: string[];
}

export const ReadinessScoreCard = ({ score, summary, nextSteps = [] }: ReadinessScoreCardProps) => {
  const clampedScore = Math.min(100, Math.max(0, score));
  const tone = clampedScore >= 80 ? 'green' : clampedScore >= 60 ? 'orange' : 'red';

  return (
    <VStack align="stretch" spacing={3} borderWidth="1px" borderRadius="lg" p={5} bg="white" shadow="sm">
      <Badge colorScheme={tone} w="fit-content" display="flex" alignItems="center" gap={2}>
        <Sparkles size={14} />
        Readiness {clampedScore}
      </Badge>
      <Progress value={clampedScore} colorScheme={tone} borderRadius="md" />
      {summary && (
        <Text fontSize="sm" color="gray.600">
          {summary}
        </Text>
      )}
      {nextSteps.length > 0 && (
        <VStack align="stretch" spacing={1} fontSize="sm" color="gray.700">
          {nextSteps.map((step) => (
            <Box key={step} as="span">
              • {step}
            </Box>
          ))}
        </VStack>
      )}
    </VStack>
  );
};

export default ReadinessScoreCard;
