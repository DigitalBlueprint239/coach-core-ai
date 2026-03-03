import {
  Box,
  Button,
  Divider,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Select,
  Stack,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react';
import { RecruitingFeatureGate } from '@/features/recruiting/components';

const NeedForm = () => (
  <Box borderWidth="1px" borderRadius="lg" padding={5} bg="white" shadow="xs">
    <Heading size="sm" mb={4}>
      Program Needs
    </Heading>
    <Stack spacing={4}>
      <FormControl>
        <FormLabel>Position</FormLabel>
        <Select placeholder="Select position">
          <option value="wr">WR</option>
          <option value="qb">QB</option>
          <option value="rb">RB</option>
          <option value="db">DB</option>
        </Select>
      </FormControl>
      <FormControl>
        <FormLabel>Class Year</FormLabel>
        <Select placeholder="Select class year">
          <option value="2025">2025</option>
          <option value="2026">2026</option>
          <option value="2027">2027</option>
        </Select>
      </FormControl>
      <FormControl>
        <FormLabel>Archetype</FormLabel>
        <Textarea rows={3} placeholder="Prototype, scheme fit, must-have traits" />
      </FormControl>
      <FormControl>
        <FormLabel>Notes</FormLabel>
        <Textarea rows={3} placeholder="Roster needs, scholarship status, evaluation window" />
      </FormControl>
      <Button colorScheme="blue" size="sm">
        Save need
      </Button>
    </Stack>
  </Box>
);

const SuggestedAthletes = () => (
  <Box borderWidth="1px" borderRadius="lg" padding={5} bg="white" shadow="xs">
    <Heading size="sm" mb={3}>
      Suggested Athletes
    </Heading>
    <VStack align="stretch" spacing={3}>
      {Array.from({ length: 3 }).map((_, idx) => (
        <Box key={idx} borderWidth="1px" borderRadius="md" padding={4}>
          <Heading size="xs">Jordan Blake · WR · Readiness 82</Heading>
          <Text fontSize="sm" color="gray.600">
            Match rationale: route tree overlap, academic fit, geographic proximity.
          </Text>
          <Button size="xs" mt={2} colorScheme="blue" variant="outline">
            View profile
          </Button>
        </Box>
      ))}
    </VStack>
  </Box>
);

export const ProgramPortalPage = () => (
  <RecruitingFeatureGate fallbackPath="/dashboard">
    <VStack align="stretch" spacing={6}>
      <Box>
        <Heading size="lg" mb={2}>
          Program Portal
        </Heading>
        <Text color="gray.600">
          Manage roster needs, review suggested athletes, and generate recruiting packets.
        </Text>
      </Box>

      <Stack direction={{ base: 'column', xl: 'row' }} spacing={6}>
        <NeedForm />
        <SuggestedAthletes />
      </Stack>

      <Divider />

      <Box borderWidth="1px" borderRadius="lg" padding={5} bg="white" shadow="xs">
        <Heading size="sm" mb={3}>
          Recruiting Packet Download
        </Heading>
        <FormControl>
          <FormLabel>Need to export</FormLabel>
          <Select placeholder="Select need">
            <option value="wr2026">WR · 2026 · Slot</option>
          </Select>
        </FormControl>
        <Button mt={4} colorScheme="blue">
          Generate PDF packet
        </Button>
      </Box>
    </VStack>
  </RecruitingFeatureGate>
);

export default ProgramPortalPage;
