import React, { useState, useEffect } from 'react';
import {
  ChakraProvider,
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Card,
  CardHeader,
  CardBody,
  Badge,
  Icon,
  SimpleGrid,
  Heading,
  Container,
  useColorModeValue,
  Flex,
  Spacer,
  Avatar,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton
} from '@chakra-ui/react';
import {
  User,
  Calendar,
  Target,
  BarChart3,
  BookOpen,
  MessageCircle,
  Settings,
  Search,
  MoreVertical,
  // Football doesn't exist in lucide-react - use a different icon
  CirclePlay, // Alternative for football/sports
  Zap,
  Brain,
  Shield,
  Clock,
  Users,
  TrendingUp,
  CheckCircle,
  Bell
} from 'lucide-react';

function App() {
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');

  const features = [
    {
      title: 'AI Practice Planner',
      description: 'Generate intelligent practice plans',
      icon: Brain,
      color: 'blue',
      action: 'Generate Practice Plan'
    },
    {
      title: 'Team Management',
      description: 'Manage player rosters',
      icon: Users,
      color: 'green',
      action: 'Manage Team'
    },
    {
      title: 'Smart Playbook',
      description: 'Design plays with AI',
      icon: CirclePlay, // Using CirclePlay instead of Football
      color: 'purple',
      action: 'Design Plays'
    },
    {
      title: 'Analytics',
      description: 'Track performance metrics',
      icon: BarChart3,
      color: 'orange',
      action: 'View Analytics'
    },
    {
      title: 'Drill Library',
      description: 'Browse coaching drills',
      icon: BookOpen,
      color: 'red',
      action: 'Browse Drills'
    },
    {
      title: 'AI Assistant',
      description: 'Get coaching advice',
      icon: MessageCircle,
      color: 'purple',
      action: 'Ask AI'
    }
  ];

  return (
    <ChakraProvider>
      <Box minH="100vh" bg={bgColor}>
        {/* Header */}
        <Box bg={cardBg} borderBottom="1px" borderColor="gray.200" px={6} py={4}>
          <Flex align="center">
            <HStack spacing={3}>
              <Icon as={CirclePlay} boxSize={8} color="blue.500" />
              <VStack align="start" spacing={0}>
                <Heading size="lg" color="gray.800">Coach Core AI</Heading>
                <Text fontSize="sm" color="gray.500">The Ultimate Sports Coaching Platform</Text>
              </VStack>
            </HStack>
            <Spacer />
            <HStack spacing={4}>
              <IconButton
                aria-label="Search"
                icon={<Search />}
                variant="ghost"
                colorScheme="gray"
              />
              <IconButton
                aria-label="Notifications"
                icon={<Bell />}
                variant="ghost"
                colorScheme="gray"
              />
              <Menu>
                <MenuButton as={Button} variant="ghost" p={0}>
                  <Avatar size="sm" name="Coach" />
                </MenuButton>
                <MenuList>
                  <MenuItem icon={<User />}>Profile</MenuItem>
                  <MenuItem icon={<Settings />}>Settings</MenuItem>
                </MenuList>
              </Menu>
            </HStack>
          </Flex>
        </Box>

        {/* Main Content */}
        <Container maxW="7xl" py={8}>
          <VStack spacing={8} align="stretch">
            {/* Welcome Section */}
            <Box textAlign="center">
              <Heading size="xl" mb={4}>
                Experience the future of sports coaching with AI-powered practice planning,
              </Heading>
              <Text fontSize="lg" color="gray.600" maxW="4xl" mx="auto">
                intelligent play design, and comprehensive team management.
              </Text>
            </Box>

            {/* Feature Grid */}
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
              {features.map((feature, index) => (
                <Card key={index} bg={cardBg} shadow="md" borderRadius="lg" overflow="hidden">
                  <CardHeader pb={3}>
                    <HStack justify="space-between" align="start">
                      <HStack spacing={3} align="center">
                        <Icon
                          as={feature.icon}
                          boxSize={6}
                          color={`${feature.color}.500`}
                        />
                        <VStack align="start" spacing={1}>
                          <Heading size="md" color="gray.800">
                            {feature.title}
                          </Heading>
                          <Text fontSize="sm" color="gray.500">
                            {feature.description}
                          </Text>
                        </VStack>
                      </HStack>
                      <Badge colorScheme="blue">Interactive</Badge>
                    </HStack>
                  </CardHeader>
                  <CardBody>
                    <VStack spacing={4}>
                      <Button
                        colorScheme={feature.color}
                        size="md"
                        width="full"
                        leftIcon={<Icon as={feature.icon} />}
                      >
                        {feature.action}
                      </Button>
                      <Text fontSize="xs" color="gray.400" textAlign="center">
                        Click to access {feature.title.toLowerCase()} features
                      </Text>
                    </VStack>
                  </CardBody>
                </Card>
              ))}
            </SimpleGrid>

            {/* Demo Information Section */}
            <Card bg={cardBg} p={6} borderRadius="lg">
              <VStack spacing={4} align="center">
                <Heading size="lg" color="gray.800">Demo Information</Heading>
                <Text fontSize="md" color="gray.600" textAlign="center" maxW="3xl">
                  This is a demonstration of the Coach Core AI platform. Each feature card above
                  represents a core module of the coaching system. Click any button to explore
                  the AI-powered coaching tools designed to help you train better, plan smarter,
                  and achieve more with your team.
                </Text>
                <HStack spacing={4} wrap="wrap" justify="center">
                  <Badge colorScheme="green" p={2}>
                    <Icon as={CheckCircle} mr={1} />
                    AI-Powered
                  </Badge>
                  <Badge colorScheme="blue" p={2}>
                    <Icon as={Shield} mr={1} />
                    Secure
                  </Badge>
                  <Badge colorScheme="purple" p={2}>
                    <Icon as={TrendingUp} mr={1} />
                    Analytics
                  </Badge>
                  <Badge colorScheme="orange" p={2}>
                    <Icon as={Clock} mr={1} />
                    Real-time
                  </Badge>
                </HStack>
              </VStack>
            </Card>
          </VStack>
        </Container>
      </Box>
    </ChakraProvider>
  );
}

export default App;

