import {
  Badge,
  Box,
  Button,
  Divider,
  Grid,
  GridItem,
  Heading,
  HStack,
  Stat,
  StatLabel,
  StatNumber,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  VStack,
} from '@chakra-ui/react';
import { useParams } from 'react-router-dom';
import { RecruitingFeatureGate } from '@/features/recruiting/components';

const StatRow = ({ label, value }: { label: string; value: string }) => (
  <Stat>
    <StatLabel fontSize="xs" color="gray.500" textTransform="uppercase">
      {label}
    </StatLabel>
    <StatNumber fontSize="lg">{value}</StatNumber>
  </Stat>
);

export const RecruitingAthleteDetailPage = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <RecruitingFeatureGate fallbackPath="/dashboard">
      <VStack align="stretch" spacing={6}>
        <Box borderWidth="1px" borderRadius="lg" padding={6} bg="white" shadow="sm">
          <HStack justify="space-between" align="flex-start">
            <Box>
              <Heading size="lg">Jordan Blake</Heading>
              <Text color="gray.600">WR · Class of 2026 · Houston, TX</Text>
              <HStack spacing={3} mt={2}>
                <Badge colorScheme="green">Readiness 82</Badge>
                <Badge colorScheme="purple">AI Verified</Badge>
                <Badge colorScheme="blue">Handle: @{id}</Badge>
              </HStack>
            </Box>
            <HStack spacing={3}>
              <Button size="sm" colorScheme="blue">
                Download packet
              </Button>
              <Button size="sm" variant="outline">
                Add endorsement
              </Button>
              <Button size="sm" variant="ghost">
                Export CSV
              </Button>
            </HStack>
          </HStack>
        </Box>

        <Grid templateColumns={{ base: '1fr', xl: '2fr 1fr' }} gap={6}>
          <GridItem>
            <Tabs variant="enclosed" colorScheme="blue">
              <TabList overflowX="auto">
                <Tab>Profile</Tab>
                <Tab>Film Summary</Tab>
                <Tab>Notes</Tab>
                <Tab>Contact</Tab>
              </TabList>
              <TabPanels>
                <TabPanel>
                  <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={6}>
                    <StatRow label="Height" value="6'1&quot;" />
                    <StatRow label="Weight" value="190 lbs" />
                    <StatRow label="40 yd" value="4.51" />
                    <StatRow label="Shuttle" value="4.21" />
                    <StatRow label="Vertical" value="35 in" />
                    <StatRow label="GPA" value="3.7" />
                  </Grid>
                  <Divider my={6} />
                  <Heading size="sm" mb={2}>
                    Academics
                  </Heading>
                  <Text fontSize="sm" color="gray.600">
                    Honors curriculum with AP Calculus and Physics. Transcript verified April 2025.
                  </Text>
                </TabPanel>
                <TabPanel>
                  <Heading size="sm" mb={2}>
                    AI Film Summary
                  </Heading>
                  <Text fontSize="sm" color="gray.700">
                    Burst off the line with accelerated top speed. Demonstrates body control on back shoulder throws, tracks deep
                    balls over either shoulder, and consistently separates against press coverage. Top clips tagged from Hudl and
                    YouTube sync.
                  </Text>
                </TabPanel>
                <TabPanel>
                  <Heading size="sm" mb={2}>
                    Verified Notes
                  </Heading>
                  <VStack align="stretch" spacing={4}>
                    <Box>
                      <Text fontWeight="semibold">Coach Martinez · May 2025</Text>
                      <Text fontSize="sm" color="gray.600">
                        Team leader with pro-level work ethic. Versatile in slot or wide alignments. Elite catch radius.
                      </Text>
                    </Box>
                    <Box>
                      <Text fontWeight="semibold">Coach Allen · March 2025</Text>
                      <Text fontSize="sm" color="gray.600">
                        Strong special teams contributor. Immediate impact on return units.
                      </Text>
                    </Box>
                  </VStack>
                </TabPanel>
                <TabPanel>
                  <Heading size="sm" mb={2}>
                    Contact Workflow
                  </Heading>
                  <Text fontSize="sm" color="gray.600" mb={4}>
                    NCAA/NAIA compliance: initial outreach templates require manual review before sending.
                  </Text>
                  <Button colorScheme="blue" size="sm">
                    Generate intro template
                  </Button>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </GridItem>

          <GridItem>
            <VStack align="stretch" spacing={4}>
              <Box borderWidth="1px" borderRadius="lg" padding={5} bg="white" shadow="xs">
                <Heading size="sm" mb={2}>
                  Match Insights
                </Heading>
                <Text fontSize="sm" color="gray.600">
                  Fit: West Coast · Academic match · Roster need priority 1
                </Text>
              </Box>
              <Box borderWidth="1px" borderRadius="lg" padding={5} bg="white" shadow="xs">
                <Heading size="sm" mb={2}>
                  Linked Media
                </Heading>
                <VStack align="stretch" spacing={2}>
                  <Text fontSize="sm">YouTube: Spring Highlights</Text>
                  <Text fontSize="sm">Hudl: Season 2024 reel</Text>
                  <Text fontSize="sm">Instagram: Training clips</Text>
                </VStack>
              </Box>
            </VStack>
          </GridItem>
        </Grid>
      </VStack>
    </RecruitingFeatureGate>
  );
};

export default RecruitingAthleteDetailPage;
