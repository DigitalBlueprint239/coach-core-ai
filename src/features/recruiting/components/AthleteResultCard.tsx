import { Badge, Box, Button, Grid, GridItem, HStack, Stack, Text, VStack } from '@chakra-ui/react';
import { GraduationCap, MapPin, Sparkles } from 'lucide-react';

export interface AthleteResultCardProps {
  name: string;
  position: string;
  gradYear: number;
  location?: string;
  readinessScore?: number;
  measurables?: {
    forty?: number;
    gpa?: number;
    heightIn?: number;
    weightLb?: number;
  };
  onViewProfile?: () => void;
  onBookmark?: () => void;
}

const formatHeight = (heightIn?: number) => {
  if (!heightIn) return '—';
  const feet = Math.floor(heightIn / 12);
  const inches = heightIn % 12;
  return `${feet}'${inches}"`;
};

export const AthleteResultCard = ({
  name,
  position,
  gradYear,
  location,
  readinessScore,
  measurables,
  onViewProfile,
  onBookmark,
}: AthleteResultCardProps) => (
  <VStack align="stretch" spacing={3} borderWidth="1px" borderRadius="lg" p={5} bg="white" shadow="sm">
    <HStack justify="space-between" align="flex-start">
      <Box>
        <Text fontSize="lg" fontWeight="bold">
          {name}
        </Text>
        <HStack spacing={2} color="gray.600" fontSize="sm">
          <Badge colorScheme="blue">{position}</Badge>
          <HStack spacing={1}>
            <GraduationCap size={14} />
            <Text>Class of {gradYear}</Text>
          </HStack>
          {location && (
            <HStack spacing={1}>
              <MapPin size={14} />
              <Text>{location}</Text>
            </HStack>
          )}
        </HStack>
      </Box>
      {readinessScore !== undefined && (
        <Badge colorScheme={readinessScore >= 80 ? 'green' : readinessScore >= 60 ? 'orange' : 'gray'}>
          <HStack spacing={1}>
            <Sparkles size={14} />
            <Text>Readiness {readinessScore}</Text>
          </HStack>
        </Badge>
      )}
    </HStack>

    <Grid templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }} gap={3} fontSize="sm">
      <GridItem>
        <Text fontWeight="medium">40 Yard</Text>
        <Text color="gray.600">{measurables?.forty ? `${measurables.forty.toFixed(2)}s` : '—'}</Text>
      </GridItem>
      <GridItem>
        <Text fontWeight="medium">GPA</Text>
        <Text color="gray.600">{measurables?.gpa ? measurables.gpa.toFixed(2) : '—'}</Text>
      </GridItem>
      <GridItem>
        <Text fontWeight="medium">Height</Text>
        <Text color="gray.600">{formatHeight(measurables?.heightIn)}</Text>
      </GridItem>
      <GridItem>
        <Text fontWeight="medium">Weight</Text>
        <Text color="gray.600">{measurables?.weightLb ? `${measurables.weightLb} lbs` : '—'}</Text>
      </GridItem>
    </Grid>

    <Stack direction={{ base: 'column', md: 'row' }} spacing={3}>
      {onViewProfile && (
        <Button colorScheme="blue" flex={1} onClick={onViewProfile}>
          View profile
        </Button>
      )}
      {onBookmark && (
        <Button variant="outline" flex={{ base: 1, md: 'initial' }} onClick={onBookmark}>
          Bookmark
        </Button>
      )}
    </Stack>
  </VStack>
);

export default AthleteResultCard;
