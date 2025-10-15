import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Container,
  SimpleGrid,
  Icon,
  Badge,
  Card,
  CardBody,
  CardHeader,
  Divider,
} from '@chakra-ui/react';
import { 
  Brain, 
  Users, 
  Calendar, 
  Target, 
  Zap, 
  Shield,
  CheckCircle,
  Star
} from 'lucide-react';
import WaitlistForm from './WaitlistForm';

const WaitlistPage: React.FC = () => {
  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Play Generation',
      description: 'Create custom plays with intelligent AI assistance',
      color: 'blue',
    },
    {
      icon: Calendar,
      title: 'Smart Practice Planning',
      description: 'Generate optimized practice sessions automatically',
      color: 'green',
    },
    {
      icon: Users,
      title: 'Team Management',
      description: 'Complete roster and attendance management',
      color: 'purple',
    },
    {
      icon: Target,
      title: 'Performance Analytics',
      description: 'Track progress with detailed insights',
      color: 'orange',
    },
    {
      icon: Zap,
      title: 'Real-time Collaboration',
      description: 'Work together with your coaching staff',
      color: 'yellow',
    },
    {
      icon: Shield,
      title: 'Offline Support',
      description: 'Works anywhere, even without internet',
      color: 'red',
    },
  ];

  const benefits = [
    'Save 10+ hours per week on planning',
    'Improve team performance by 25%',
    'Access to 1000+ professional drills',
    'Real-time collaboration tools',
    'Mobile-first design',
    'Enterprise-grade security',
  ];

  return (
    <Box minH="100vh" bg="gray.50">
      {/* Hero Section */}
      <Box bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)" color="white" py={20}>
        <Container maxW="6xl" px={6}>
          <VStack spacing={8} textAlign="center">
            <Badge colorScheme="yellow" px={4} py={2} borderRadius="full" fontSize="sm">
              🚀 Coming Soon
            </Badge>
            
            <Heading size="2xl" fontWeight="bold" lineHeight="shorter">
              The Future of Coaching is Here
            </Heading>
            
            <Text fontSize="xl" maxW="2xl" opacity={0.9}>
              Coach Core AI combines artificial intelligence with proven coaching methods 
              to revolutionize how you plan, manage, and optimize your team's performance.
            </Text>

            <HStack spacing={4} fontSize="sm" opacity={0.8}>
              <HStack>
                <Icon as={CheckCircle} boxSize={4} />
                <Text>Free to join</Text>
              </HStack>
              <HStack>
                <Icon as={CheckCircle} boxSize={4} />
                <Text>No spam, ever</Text>
              </HStack>
              <HStack>
                <Icon as={CheckCircle} boxSize={4} />
                <Text>Early access</Text>
              </HStack>
            </HStack>
          </VStack>
        </Container>
      </Box>

      {/* Features Section */}
      <Box py={20} bg="white">
        <Container maxW="6xl" px={6}>
          <VStack spacing={12}>
            <VStack spacing={4} textAlign="center">
              <Heading size="xl" color="gray.800">
                Everything You Need to Excel
              </Heading>
              <Text fontSize="lg" color="gray.600" maxW="2xl">
                Our comprehensive platform provides all the tools modern coaches need 
                to build winning teams and develop exceptional athletes.
              </Text>
            </VStack>

            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={8} w="full">
              {features.map((feature, index) => (
                <Card key={index} shadow="sm" border="1px" borderColor="gray.200" _hover={{ shadow: 'md' }}>
                  <CardBody textAlign="center" p={6}>
                    <Icon 
                      as={feature.icon} 
                      boxSize={10} 
                      color={`${feature.color}.500`} 
                      mb={4} 
                    />
                    <Heading size="md" color="gray.800" mb={2}>
                      {feature.title}
                    </Heading>
                    <Text color="gray.600" fontSize="sm">
                      {feature.description}
                    </Text>
                  </CardBody>
                </Card>
              ))}
            </SimpleGrid>
          </VStack>
        </Container>
      </Box>

      {/* Benefits Section */}
      <Box py={20} bg="gray.50">
        <Container maxW="4xl" px={6}>
          <VStack spacing={12}>
            <VStack spacing={4} textAlign="center">
              <Heading size="xl" color="gray.800">
                Why Coaches Choose Coach Core AI
              </Heading>
              <Text fontSize="lg" color="gray.600">
                Join thousands of coaches who are already transforming their programs
              </Text>
            </VStack>

            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} w="full">
              {benefits.map((benefit, index) => (
                <HStack key={index} spacing={3} align="start">
                  <Icon as={Star} boxSize={5} color="blue.500" mt={0.5} />
                  <Text color="gray.700" fontWeight="medium">
                    {benefit}
                  </Text>
                </HStack>
              ))}
            </SimpleGrid>
          </VStack>
        </Container>
      </Box>

      {/* Waitlist Section */}
      <Box py={20} bg="white">
        <Container maxW="4xl" px={6}>
          <VStack spacing={12}>
            <VStack spacing={4} textAlign="center">
              <Heading size="xl" color="gray.800">
                Ready to Get Started?
              </Heading>
              <Text fontSize="lg" color="gray.600" maxW="2xl">
                Join our waitlist to be among the first to experience the future of coaching. 
                Get early access, exclusive updates, and special launch pricing.
              </Text>
            </VStack>

            <WaitlistForm 
              onSuccess={() => {
                // Optional: Track conversion or redirect
                console.log('User joined waitlist successfully');
              }}
              onError={(error) => {
                console.error('Waitlist error:', error);
              }}
            />

            <VStack spacing={4} textAlign="center" maxW="2xl">
              <Text fontSize="sm" color="gray.500">
                <strong>What happens next?</strong>
              </Text>
              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} w="full">
                <VStack spacing={2}>
                  <Badge colorScheme="blue" px={3} py={1} borderRadius="full">1</Badge>
                  <Text fontSize="sm" color="gray.600">
                    Join our waitlist
                  </Text>
                </VStack>
                <VStack spacing={2}>
                  <Badge colorScheme="blue" px={3} py={1} borderRadius="full">2</Badge>
                  <Text fontSize="sm" color="gray.600">
                    Get early access
                  </Text>
                </VStack>
                <VStack spacing={2}>
                  <Badge colorScheme="blue" px={3} py={1} borderRadius="full">3</Badge>
                  <Text fontSize="sm" color="gray.600">
                    Start coaching smarter
                  </Text>
                </VStack>
              </SimpleGrid>
            </VStack>
          </VStack>
        </Container>
      </Box>

      {/* Footer */}
      <Box py={8} bg="gray.800" color="white">
        <Container maxW="6xl" px={6}>
          <VStack spacing={4} textAlign="center">
            <Heading size="md" color="white">
              Coach Core AI
            </Heading>
            <Text fontSize="sm" color="gray.400">
              © 2024 Coach Core AI. All rights reserved.
            </Text>
            <Text fontSize="xs" color="gray.500">
              Built with ❤️ for coaches everywhere
            </Text>
          </VStack>
        </Container>
      </Box>
    </Box>
  );
};

export default WaitlistPage;
