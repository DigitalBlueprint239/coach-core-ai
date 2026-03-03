import {
  Badge,
  Box,
  Flex,
  Grid,
  Heading,
  Stack,
  Text,
  VStack,
  Button,
  Divider,
} from '@chakra-ui/react';

const OpportunityCard = ({
  title,
  subtitle,
  meta,
  action,
}: {
  title: string;
  subtitle: string;
  meta: string;
  action: string;
}) => (
  <Box borderWidth="1px" borderRadius="lg" padding={5} bg="white" shadow="xs">
    <VStack align="stretch" spacing={3}>
      <Box>
        <Heading size="sm">{title}</Heading>
        <Text fontSize="sm" color="gray.600">
          {subtitle}
        </Text>
      </Box>
      <Flex justify="space-between" align="center">
        <Badge colorScheme="blue" variant="subtle">
          {meta}
        </Badge>
        <Button size="sm" variant="outline" colorScheme="blue">
          {action}
        </Button>
      </Flex>
    </VStack>
  </Box>
);

export const RecruitingOpportunitiesPage = () => (
  <VStack align="stretch" spacing={6}>
    <Box>
      <Heading size="lg" mb={2}>
        Opportunities & Events
      </Heading>
      <Text color="gray.600">
        Programs actively looking for your position and verified camps/combines nearby.
      </Text>
    </Box>

    <Grid templateColumns={{ base: '1fr', xl: 'repeat(2, 1fr)' }} gap={6}>
      <Box>
        <Heading size="md" mb={3}>
          Program Needs
        </Heading>
        <Stack spacing={4}>
          {Array.from({ length: 4 }).map((_, idx) => (
            <OpportunityCard
              key={idx}
              title="Coastal State University"
              subtitle="D2 · Needs 2026 WR with 10.7 100m · West Coast offense"
              meta="Updated 2 days ago"
              action="Review program"
            />
          ))}
        </Stack>
      </Box>
      <Box>
        <Heading size="md" mb={3}>
          Camps & Combines Near You
        </Heading>
        <Stack spacing={4}>
          {Array.from({ length: 3 }).map((_, idx) => (
            <OpportunityCard
              key={idx}
              title="Elite Skills Showcase"
              subtitle="July 20 · Dallas, TX · Verified college staff"
              meta="200 miles"
              action="RSVP template"
            />
          ))}
        </Stack>
      </Box>
    </Grid>

    <Divider />

    <Box>
      <Heading size="sm" mb={2}>
        Coach-safe Outreach Templates
      </Heading>
      <Text fontSize="sm" color="gray.600">
        Generate NCAA/NAIA compliant introductions. Automation stays off until approved.
      </Text>
    </Box>
  </VStack>
);

export default RecruitingOpportunitiesPage;
