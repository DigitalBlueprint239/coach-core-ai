import {
  Box,
  Button,
  Checkbox,
  Divider,
  Flex,
  Grid,
  Heading,
  Input,
  Select,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react';
import { AthleteResultCard, RecruitingFeatureGate } from '@/features/recruiting/components';

const FilterPanel = () => (
  <Box borderWidth="1px" borderRadius="lg" padding={5} bg="white" shadow="xs">
    <VStack align="stretch" spacing={4}>
      <Heading size="sm">Filters</Heading>
      <Select placeholder="Position">
        <option value="wr">Wide Receiver</option>
        <option value="qb">Quarterback</option>
        <option value="rb">Running Back</option>
        <option value="db">Defensive Back</option>
      </Select>
      <Select placeholder="Graduation Year">
        <option value="2025">2025</option>
        <option value="2026">2026</option>
        <option value="2027">2027</option>
      </Select>
      <Input placeholder="Zip or City" />
      <Select placeholder="Radius">
        <option value="100">100 miles</option>
        <option value="200">200 miles</option>
        <option value="nationwide">Nationwide</option>
      </Select>
      <Divider />
      <Heading size="xs" textTransform="uppercase" color="gray.500">
        Metrics
      </Heading>
      <Input placeholder="Min 40 yd (e.g. 4.60)" />
      <Input placeholder="Min GPA" />
      <Checkbox defaultChecked>Only verified transcripts</Checkbox>
      <Button colorScheme="blue" size="sm">
        Apply filters
      </Button>
    </VStack>
  </Box>
);

export const RecruitingDiscoverPage = () => (
  <RecruitingFeatureGate fallbackPath="/dashboard">
    <VStack align="stretch" spacing={6}>
      <Box>
        <Heading size="lg" mb={2}>
          Discover Athletes
        </Heading>
        <Text color="gray.600">
          Advanced filters with film previews, academic transparency, and AI readiness signals.
        </Text>
      </Box>

      <Grid templateColumns={{ base: '1fr', xl: '320px 1fr' }} gap={6}>
        <FilterPanel />
        <VStack align="stretch" spacing={4}>
          {Array.from({ length: 6 }).map((_, index) => (
            <AthleteResultCard
              key={index}
              name="Jordan Blake"
              position="WR"
              gradYear={2026}
              location="Houston, TX"
              readinessScore={82 - index}
              measurables={{
                forty: 4.51,
                gpa: 3.7,
                heightIn: 73,
                weightLb: 190,
              }}
              onViewProfile={() => window.open(`/u/seed-athlete-${index + 1}`, '_blank')}
              onBookmark={() => undefined}
            />
          ))}
        </VStack>
      </Grid>
    </VStack>
  </RecruitingFeatureGate>
);

export default RecruitingDiscoverPage;
