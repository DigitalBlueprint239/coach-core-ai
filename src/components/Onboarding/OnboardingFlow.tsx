import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Button,
  Card,
  CardBody,
  CardHeader,
  Progress,
  Icon,
  useColorModeValue,
  Container,
  SimpleGrid,
  Badge,
  useToast,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
} from '@chakra-ui/react';
import {
  Play,
  Users,
  Brain,
  Trophy,
  Target,
  BookOpen,
  BarChart3,
  MessageSquare,
  ArrowRight,
  CheckCircle,
  Star,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  gradient: string;
  features: string[];
  demoPath: string;
}

const OnboardingFlow: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<OnboardingStep | null>(null);
  
  const navigate = useNavigate();
  const toast = useToast();
  const { user, profile } = useAuth();
  
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');

  const onboardingSteps: OnboardingStep[] = [
    {
      id: 'ai-play-generator',
      title: 'AI Play Generator',
      description: 'Create intelligent football plays with AI assistance',
      icon: Play,
      color: 'red',
      gradient: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
      features: [
        'Generate plays based on team strengths',
        'Customize formations and strategies',
        'AI-powered play recommendations',
        'Export plays to your playbook'
      ],
      demoPath: '/ai-play-generator'
    },
    {
      id: 'ai-brain',
      title: 'AI Brain',
      description: 'Get AI-powered coaching insights and recommendations',
      icon: Brain,
      color: 'orange',
      gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      features: [
        'Performance analysis',
        'Practice plan suggestions',
        'Player development insights',
        'Game strategy recommendations'
      ],
      demoPath: '/ai-brain'
    },
    {
      id: 'team-management',
      title: 'Team Management',
      description: 'Manage your roster, track attendance, and monitor progress',
      icon: Users,
      color: 'purple',
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      features: [
        'Player profiles and positions',
        'Attendance tracking',
        'Performance metrics',
        'Team communication tools'
      ],
      demoPath: '/team'
    },
    {
      id: 'practice-planner',
      title: 'Practice Planner',
      description: 'Design comprehensive practice sessions with AI assistance',
      icon: Target,
      color: 'blue',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      features: [
        'AI-generated practice plans',
        'Drill library and customization',
        'Time management tools',
        'Progress tracking'
      ],
      demoPath: '/practice'
    },
    {
      id: 'playbook',
      title: 'Digital Playbook',
      description: 'Create, organize, and share your team plays',
      icon: BookOpen,
      color: 'green',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      features: [
        'Visual play designer',
        'Play categorization',
        'Team sharing capabilities',
        'Mobile-friendly access'
      ],
      demoPath: '/playbook'
    },
    {
      id: 'analytics',
      title: 'Analytics & Progress',
      description: 'Track performance and get data-driven insights',
      icon: BarChart3,
      color: 'teal',
      gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      features: [
        'Player performance metrics',
        'Team statistics',
        'Progress tracking',
        'Goal setting and monitoring'
      ],
      demoPath: '/analytics'
    }
  ];

  const handleStepComplete = (stepId: string) => {
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps(prev => [...prev, stepId]);
      toast({
        title: 'Feature Explored! 🎉',
        description: 'Great job exploring this feature!',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleFeatureDemo = (step: OnboardingStep) => {
    setSelectedFeature(step);
    setIsDemoOpen(true);
  };

  const startFeatureDemo = () => {
    if (selectedFeature) {
      setIsDemoOpen(false);
      navigate(selectedFeature.demoPath);
    }
  };

  const skipOnboarding = () => {
    toast({
      title: 'Welcome to Coach Core AI! 🚀',
      description: 'You can always explore features from the dashboard',
      status: 'info',
      duration: 5000,
      isClosable: true,
    });
    navigate('/dashboard');
  };

  const completeOnboarding = () => {
    toast({
      title: 'Onboarding Complete! 🎯',
      description: 'You\'re ready to transform your coaching!',
      status: 'success',
      duration: 5000,
      isClosable: true,
    });
    navigate('/dashboard');
  };

  const progress = (completedSteps.length / onboardingSteps.length) * 100;

  return (
    <Box minH="100vh" bg={bgColor} py={8}>
      <Container maxW="6xl">
        <VStack spacing={8}>
          {/* Header */}
          <VStack spacing={4} textAlign="center">
            <Heading size="2xl" color="brand.600">
              Welcome to Coach Core AI! 🎉
            </Heading>
            <Text fontSize="lg" color="gray.600" maxW="2xl">
              Let's get you familiar with the powerful features that will transform your coaching experience.
              Explore each feature to unlock the full potential of Coach Core AI.
            </Text>
            
            {/* Progress */}
            <VStack spacing={2} w="full" maxW="md">
              <HStack justify="space-between" w="full">
                <Text fontSize="sm" color="gray.600">
                  Progress: {completedSteps.length}/{onboardingSteps.length}
                </Text>
                <Text fontSize="sm" color="gray.600">
                  {Math.round(progress)}%
                </Text>
              </HStack>
              <Progress value={progress} w="full" colorScheme="brand" size="lg" />
            </VStack>
          </VStack>

          {/* Feature Grid */}
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6} w="full">
            {onboardingSteps.map((step, index) => (
              <Card
                key={step.id}
                bg={cardBg}
                borderWidth={completedSteps.includes(step.id) ? 2 : 1}
                borderColor={completedSteps.includes(step.id) ? 'green.500' : 'gray.200'}
                _hover={{
                  transform: 'translateY(-4px)',
                  boxShadow: 'xl',
                }}
                transition="all 0.3s"
                cursor="pointer"
                onClick={() => handleFeatureDemo(step)}
              >
                <CardHeader textAlign="center" pb={2}>
                  <VStack spacing={3}>
                        {completedSteps.includes(step.id) ? (
                          <Box
                            w={12}
                            h={12}
                            bg="green.500"
                            borderRadius="full"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            color="white"
                            fontSize="xl"
                          >
                            <Icon as={CheckCircle} />
                          </Box>
                        ) : (
                          <Box
                            w={12}
                            h={12}
                            bg={step.color + '.100'}
                            borderRadius="full"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            color={step.color + '.600'}
                            fontSize="xl"
                          >
                            <Icon as={step.icon} />
                          </Box>
                        )}
                        
                        <VStack spacing={1}>
                          <Heading size="md" color="gray.800">
                            {step.title}
                          </Heading>
                          <Text fontSize="sm" color="gray.600" textAlign="center">
                            {step.description}
                          </Text>
                        </VStack>

                        {completedSteps.includes(step.id) && (
                          <Badge colorScheme="green" variant="subtle">
                            <Icon as={CheckCircle} mr={1} />
                            Explored
                          </Badge>
                        )}
                      </VStack>
                </CardHeader>

                <CardBody pt={0}>
                  <VStack spacing={3} align="stretch">
                    <Text fontSize="xs" color="gray.500" fontWeight="medium">
                      Key Features:
                    </Text>
                    {step.features.map((feature, featureIndex) => (
                      <HStack key={featureIndex} spacing={2}>
                        <Icon as={Star} color="yellow.400" boxSize={3} />
                        <Text fontSize="xs" color="gray.600">
                          {feature}
                        </Text>
                      </HStack>
                    ))}
                    
                    <Button
                      size="sm"
                      colorScheme={step.color}
                      variant="outline"
                      rightIcon={<ArrowRight />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFeatureDemo(step);
                      }}
                      mt={2}
                    >
                      Try Feature
                    </Button>
                  </VStack>
                </CardBody>
              </Card>
            ))}
          </SimpleGrid>

          {/* Action Buttons */}
          <HStack spacing={4} pt={4}>
            <Button
              variant="outline"
              size="lg"
              onClick={skipOnboarding}
            >
              Skip Onboarding
            </Button>
            <Button
              colorScheme="brand"
              size="lg"
              rightIcon={<ArrowRight />}
              onClick={completeOnboarding}
              isDisabled={completedSteps.length === 0}
            >
              Complete Onboarding
            </Button>
          </HStack>

          {/* Quick Tips */}
          <Card bg={cardBg} w="full" maxW="2xl">
            <CardHeader textAlign="center">
              <HStack justify="center" spacing={2}>
                <Icon as={Zap} color="yellow.500" />
                <Heading size="md" color="gray.800">
                  Pro Tips
                </Heading>
              </HStack>
            </CardHeader>
            <CardBody>
              <VStack spacing={3} align="stretch">
                <HStack spacing={3}>
                  <Icon as={Play} color="red.500" />
                  <Text fontSize="sm" color="gray.600">
                    Start with the AI Play Generator to see AI in action
                  </Text>
                </HStack>
                <HStack spacing={3}>
                  <Icon as={Brain} color="orange.500" />
                  <Text fontSize="sm" color="gray.600">
                    Use AI Brain for personalized coaching insights
                  </Text>
                </HStack>
                <HStack spacing={3}>
                  <Icon as={Users} color="purple.500" />
                  <Text fontSize="sm" color="gray.600">
                    Set up your team first for the best experience
                  </Text>
                </HStack>
              </VStack>
            </CardBody>
          </Card>
        </VStack>
      </Container>

      {/* Feature Demo Modal */}
      <Modal isOpen={isDemoOpen} onClose={() => setIsDemoOpen(false)} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack spacing={3}>
              <Icon as={selectedFeature?.icon} color={`${selectedFeature?.color}.500`} />
              <Text>Try {selectedFeature?.title}</Text>
            </HStack>
          </ModalHeader>
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Text fontSize="lg" color="gray.700">
                {selectedFeature?.description}
              </Text>
              
              <Box>
                <Text fontSize="sm" color="gray.600" fontWeight="medium" mb={2}>
                  What you'll experience:
                </Text>
                <VStack spacing={2} align="stretch">
                  {selectedFeature?.features.map((feature, index) => (
                    <HStack key={index} spacing={2}>
                      <Icon as={Star} color="yellow.400" boxSize={3} />
                      <Text fontSize="sm" color="gray.600">
                        {feature}
                      </Text>
                    </HStack>
                  ))}
                </VStack>
              </Box>

              <Box p={4} bg="blue.50" borderRadius="md">
                <Text fontSize="sm" color="blue.700">
                  💡 <strong>Tip:</strong> This will open the feature in a new view where you can explore 
                  all its capabilities and see how it integrates with your team data.
                </Text>
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => setIsDemoOpen(false)}>
              Cancel
            </Button>
            <Button
              colorScheme={selectedFeature?.color || 'brand'}
              onClick={startFeatureDemo}
              rightIcon={<ArrowRight />}
            >
              Start Demo
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default OnboardingFlow;
