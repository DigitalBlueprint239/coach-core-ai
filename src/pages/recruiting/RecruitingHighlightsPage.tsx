import {
  Box,
  Button,
  Flex,
  Grid,
  Heading,
  Icon,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react';
import { FiUploadCloud, FiVideo, FiScissors } from 'react-icons/fi';

const StepCard = ({
  icon,
  title,
  description,
}: {
  icon: typeof FiUploadCloud;
  title: string;
  description: string;
}) => (
  <Box
    borderWidth="1px"
    borderRadius="lg"
    padding={5}
    bg="white"
    shadow="xs"
    position="relative"
  >
    <Flex align="center" gap={4}>
      <Icon as={icon} boxSize={8} color="blue.500" />
      <Box>
        <Heading size="sm">{title}</Heading>
        <Text fontSize="sm" color="gray.600">
          {description}
        </Text>
      </Box>
    </Flex>
  </Box>
);

export const RecruitingHighlightsPage = () => (
  <VStack align="stretch" spacing={6}>
    <Box>
      <Heading size="lg" mb={2}>
        AI Highlight Builder
      </Heading>
      <Text color="gray.600">
        Import clips, let AI tag the best moments, reorder the timeline, and export as MP4 or JSON playlist.
      </Text>
    </Box>

    <Box borderWidth="1px" borderRadius="lg" padding={6} bg="white" shadow="sm">
      <Stack spacing={6}>
        <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={4}>
          <StepCard
            icon={FiUploadCloud}
            title="Upload or Import"
            description="Add videos from device or linked YouTube/Hudl accounts."
          />
          <StepCard
            icon={FiVideo}
            title="AI Tags Top Plays"
            description="VideoTagger surfaces 6–12 moments with route, burst, and tackle tags."
          />
          <StepCard
            icon={FiScissors}
            title="Compose Reel"
            description="Reorder timeline, add titles, and export MP4 or shareable JSON."
          />
        </Grid>

        <VStack align="stretch" spacing={4}>
          <Button alignSelf="flex-start" colorScheme="blue">
            Start New Highlight Reel
          </Button>
          <Text fontSize="sm" color="gray.500">
            Coming soon: drag-and-drop timeline, AI narration, and template exports.
          </Text>
        </VStack>
      </Stack>
    </Box>
  </VStack>
);

export default RecruitingHighlightsPage;
