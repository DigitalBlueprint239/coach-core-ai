import React from 'react';
import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Icon,
  SimpleGrid,
  Stack,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { Brain, BarChart2, ClipboardList, Layers, ShieldCheck } from 'lucide-react';

interface FeatureDefinition {
  title: string;
  description: string;
  route: string;
  icon: LucideIcon;
  actionLabel?: string;
}

const FEATURES: FeatureDefinition[] = [
  {
    title: 'AI Brain Assistant',
    description: 'Generate scouting insights, practice adjustments, and game plans tailored to your team.',
    route: '/dashboard/ai-brain',
    icon: Brain,
    actionLabel: 'Launch AI Brain',
  },
  {
    title: 'Practice Planner',
    description: 'Design high-impact sessions with drills, load management, and conflict detection built in.',
    route: '/dashboard/practice-planner',
    icon: ClipboardList,
    actionLabel: 'Open Planner',
  },
  {
    title: 'Playbook Designer',
    description: 'Craft plays with drag-and-drop tools, collaboration, and instant AI feedback.',
    route: '/dashboard/playbook',
    icon: Layers,
    actionLabel: 'Design Plays',
  },
  {
    title: 'Performance Analytics',
    description: 'Track KPIs, surface trends, and share live dashboards with staff and stakeholders.',
    route: '/dashboard/analytics',
    icon: BarChart2,
    actionLabel: 'View Analytics',
  },
  {
    title: 'Administration',
    description: 'Manage roles, invitations, billing, and team governance policies.',
    route: '/admin',
    icon: ShieldCheck,
    actionLabel: 'Manage Admin',
  },
];

const DashboardFeatureCard = ({
  title,
  description,
  route,
  icon: IconComponent,
  actionLabel = 'Open',
}: FeatureDefinition) => {
  const navigate = useNavigate();
  const bg = useColorModeValue('white', 'gray.800');
  const border = useColorModeValue('gray.200', 'gray.700');

  return (
    <Box
      borderWidth="1px"
      borderColor={border}
      rounded="xl"
      p={6}
      bg={bg}
      shadow="md"
      display="flex"
      flexDirection="column"
      justifyContent="space-between"
    >
      <Stack spacing={4}>
        <HStack spacing={3}>
          <Flex
            boxSize={12}
            align="center"
            justify="center"
            rounded="lg"
            bg="blue.50"
            color="blue.500"
          >
            <Icon as={IconComponent} boxSize={6} />
          </Flex>
          <Heading size="md">{title}</Heading>
        </HStack>
        <Text color="gray.600">{description}</Text>
      </Stack>
      <Button mt={6} colorScheme="blue" variant="solid" onClick={() => navigate(route)}>
        {actionLabel}
      </Button>
    </Box>
  );
};

export const MainDashboard: React.FC = () => {
  const pageBg = useColorModeValue('gray.100', 'gray.900');

  return (
    <Box minH="100vh" bg={pageBg} py={{ base: 10, md: 16 }} px={{ base: 4, md: 10 }}>
      <VStack align="stretch" spacing={10} maxW="7xl" mx="auto">
        <Stack spacing={3}>
          <Heading size="lg">Coach Core Command Center</Heading>
          <Text color="gray.600" maxW="3xl">
            Access the full suite of AI-driven coaching tools. Select a feature below to begin planning,
            analysing, or coordinating your next competitive edge.
          </Text>
        </Stack>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8}>
          {FEATURES.map((feature) => (
            <DashboardFeatureCard key={feature.route} {...feature} />
          ))}
        </SimpleGrid>
      </VStack>
    </Box>
  );
};

export default MainDashboard;
