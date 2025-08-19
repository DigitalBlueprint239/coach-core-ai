import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Button,
  Progress,
  Card,
  CardBody,
  CardHeader,
  Icon,
  useToast,
  Input,
  FormControl,
  FormLabel,
  FormHelperText,
  Select,
  Textarea,
  Badge,
  Flex,
  Spacer,
  Grid,
} from '@chakra-ui/react';
import {
  Users,
  Trophy,
  Target,
  CheckCircle,
  ArrowRight,
  Star,
  Heart,
  Zap,
  Brain,
  Globe,
  Settings,
  Play,
  BookOpen,
  BarChart3,
} from 'lucide-react';

interface WelcomeWorkflowProps {
  userProfile: any;
  onComplete: () => void;
}

interface TeamSetup {
  teamName: string;
  sport: string;
  ageGroup: string;
  division: string;
  teamColors: {
    primary: string;
    secondary: string;
  };
  homeField: string;
  practiceSchedule: string[];
  motto: string;
}

const WelcomeWorkflow: React.FC<WelcomeWorkflowProps> = ({ userProfile, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [teamSetup, setTeamSetup] = useState<TeamSetup>({
    teamName: '',
    sport: '',
    ageGroup: '',
    division: '',
    teamColors: {
      primary: '#00cccc',
      secondary: '#ffffff',
    },
    homeField: '',
    practiceSchedule: [],
    motto: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    
    try {
      // Simulate saving team setup
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: 'Team Setup Complete!',
        description: `Welcome to ${teamSetup.teamName}! Your team is ready to go.`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      onComplete();
    } catch (error) {
      toast({
        title: 'Setup Failed',
        description: 'Please try again or contact support.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateTeamSetup = (field: keyof TeamSetup, value: any) => {
    setTeamSetup(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const renderStep1 = () => (
    <VStack spacing={6} align="stretch">
      <Box textAlign="center" mb={6}>
        <Icon as={Users} boxSize={16} color="primary.500" mb={4} />
        <Heading size="lg" color="dark.800" mb={2}>
          Welcome to Coach Core!
        </Heading>
        <Text color="dark.600" fontSize="lg">
          Let's set up your team and get you started with the ultimate coaching platform.
        </Text>
      </Box>

      <Card>
        <CardHeader>
          <Heading size="md" color="dark.800">
            Personal Information
          </Heading>
        </CardHeader>
        <CardBody>
          <VStack spacing={4}>
            <FormControl>
              <FormLabel color="dark.700" fontWeight="600">
                Coach Name
              </FormLabel>
              <Input
                value={userProfile?.displayName || ''}
                isReadOnly
                bg="gray.50"
                borderColor="gray.200"
              />
              <FormHelperText color="gray.500">
                This will be displayed to your team and other coaches
              </FormHelperText>
            </FormControl>

            <FormControl>
              <FormLabel color="dark.700" fontWeight="600">
                Email Address
              </FormLabel>
              <Input
                value={userProfile?.email || ''}
                isReadOnly
                bg="gray.50"
                borderColor="gray.200"
              />
            </FormControl>
          </VStack>
        </CardBody>
      </Card>

      <HStack justify="center" spacing={4}>
        <Button
          variant="outline"
          size="lg"
          onClick={() => onComplete()}
          color="dark.600"
          borderColor="dark.300"
        >
          Skip Setup
        </Button>
        <Button
          variant="brand-primary"
          size="lg"
          onClick={handleNext}
          rightIcon={<Icon as={ArrowRight} />}
          boxShadow="brand-glow"
        >
          Get Started
        </Button>
      </HStack>
    </VStack>
  );

  const renderStep2 = () => (
    <VStack spacing={6} align="stretch">
      <Box textAlign="center" mb={6}>
        <Icon as={Trophy} boxSize={16} color="primary.500" mb={4} />
        <Heading size="lg" color="dark.800" mb={2}>
          Team Information
        </Heading>
        <Text color="dark.600" fontSize="lg">
          Tell us about your team so we can customize your experience.
        </Text>
      </Box>

      <Card>
        <CardHeader>
          <Heading size="md" color="dark.800">
            Basic Team Details
          </Heading>
        </CardHeader>
        <CardBody>
          <VStack spacing={4}>
            <FormControl isRequired>
              <FormLabel color="dark.700" fontWeight="600">
                Team Name
              </FormLabel>
              <Input
                value={teamSetup.teamName}
                onChange={(e) => updateTeamSetup('teamName', e.target.value)}
                placeholder="e.g., Wildcats, Eagles, Lions"
                size="lg"
                borderRadius="xl"
                border="2px solid"
                borderColor="dark.300"
                _focus={{
                  borderColor: 'primary.500',
                  boxShadow: 'brand-glow',
                }}
              />
            </FormControl>

            <HStack spacing={4} w="full">
              <FormControl isRequired>
                <FormLabel color="dark.700" fontWeight="600">
                  Sport
                </FormLabel>
                <Select
                  value={teamSetup.sport}
                  onChange={(e) => updateTeamSetup('sport', e.target.value)}
                  placeholder="Select sport"
                  size="lg"
                  borderRadius="xl"
                  border="2px solid"
                  borderColor="dark.300"
                  _focus={{
                    borderColor: 'primary.500',
                    boxShadow: 'brand-glow',
                  }}
                >
                  <option value="Football">🏈 Football</option>
                  <option value="Basketball">🏀 Basketball</option>
                  <option value="Soccer">⚽ Soccer</option>
                  <option value="Baseball">⚾ Baseball</option>
                  <option value="Volleyball">🏐 Volleyball</option>
                  <option value="Tennis">🎾 Tennis</option>
                  <option value="Track">🏃 Track & Field</option>
                  <option value="Swimming">🏊 Swimming</option>
                  <option value="Other">🏆 Other</option>
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel color="dark.700" fontWeight="600">
                  Age Group
                </FormLabel>
                <Select
                  value={teamSetup.ageGroup}
                  onChange={(e) => updateTeamSetup('ageGroup', e.target.value)}
                  placeholder="Select age group"
                  size="lg"
                  borderRadius="xl"
                  border="2px solid"
                  borderColor="dark.300"
                  _focus={{
                    borderColor: 'primary.500',
                    boxShadow: 'brand-glow',
                  }}
                >
                  <option value="8-10">8-10 years</option>
                  <option value="11-13">11-13 years</option>
                  <option value="14-16">14-16 years</option>
                  <option value="17-18">17-18 years</option>
                  <option value="19+">19+ years</option>
                </Select>
              </FormControl>
            </HStack>

            <FormControl>
              <FormLabel color="dark.700" fontWeight="600">
                Division
              </FormLabel>
              <Select
                value={teamSetup.division}
                onChange={(e) => updateTeamSetup('division', e.target.value)}
                placeholder="Select division"
                size="lg"
                borderRadius="xl"
                border="2px solid"
                borderColor="dark.300"
                _focus={{
                  borderColor: 'primary.500',
                  boxShadow: 'brand-glow',
                }}
              >
                <option value="Recreation">Recreation</option>
                <option value="Competitive">Competitive</option>
                <option value="Elite">Elite</option>
                <option value="Premier">Premier</option>
                <option value="Varsity">Varsity</option>
                <option value="JV">JV</option>
                <option value="Freshman">Freshman</option>
              </Select>
            </FormControl>
          </VStack>
        </CardBody>
      </Card>

      <HStack justify="center" spacing={4}>
        <Button
          variant="outline"
          size="lg"
          onClick={handleBack}
          color="dark.600"
          borderColor="dark.300"
        >
          Back
        </Button>
        <Button
          variant="brand-primary"
          size="lg"
          onClick={handleNext}
          rightIcon={<Icon as={ArrowRight} />}
          isDisabled={!teamSetup.teamName || !teamSetup.sport || !teamSetup.ageGroup}
          boxShadow="brand-glow"
        >
          Continue
        </Button>
      </HStack>
    </VStack>
  );

  const renderStep3 = () => (
    <VStack spacing={6} align="stretch">
      <Box textAlign="center" mb={6}>
        <Icon as={Target} boxSize={16} color="primary.500" mb={4} />
        <Heading size="lg" color="dark.800" mb={2}>
          Team Identity
        </Heading>
        <Text color="dark.600" fontSize="lg">
          Customize your team's look and feel.
        </Text>
      </Box>

      <Card>
        <CardHeader>
          <Heading size="md" color="dark.800">
            Team Branding
          </Heading>
        </CardHeader>
        <CardBody>
          <VStack spacing={4}>
            <FormControl>
              <FormLabel color="dark.700" fontWeight="600">
                Home Field
              </FormLabel>
              <Input
                value={teamSetup.homeField}
                onChange={(e) => updateTeamSetup('homeField', e.target.value)}
                placeholder="e.g., Central Park Field A, High School Stadium"
                size="lg"
                borderRadius="xl"
                border="2px solid"
                borderColor="dark.300"
                _focus={{
                  borderColor: 'primary.500',
                  boxShadow: 'brand-glow',
                }}
              />
            </FormControl>

            <FormControl>
              <FormLabel color="dark.700" fontWeight="600">
                Team Motto
              </FormLabel>
              <Textarea
                value={teamSetup.motto}
                onChange={(e) => updateTeamSetup('motto', e.target.value)}
                placeholder="e.g., Unity, Strength, Victory"
                size="lg"
                borderRadius="xl"
                border="2px solid"
                borderColor="dark.300"
                _focus={{
                  borderColor: 'primary.500',
                  boxShadow: 'brand-glow',
                }}
              />
            </FormControl>

            <FormControl>
              <FormLabel color="dark.700" fontWeight="600">
                Practice Schedule
              </FormLabel>
              <VStack spacing={2} align="stretch">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                  <HStack key={day} justify="space-between">
                    <Text color="dark.600" fontWeight="500">{day}</Text>
                    <Button
                      size="sm"
                      variant={teamSetup.practiceSchedule.includes(day) ? 'brand-primary' : 'outline'}
                      onClick={() => {
                        const newSchedule = teamSetup.practiceSchedule.includes(day)
                          ? teamSetup.practiceSchedule.filter(d => d !== day)
                          : [...teamSetup.practiceSchedule, day];
                        updateTeamSetup('practiceSchedule', newSchedule);
                      }}
                      borderRadius="lg"
                    >
                      {teamSetup.practiceSchedule.includes(day) ? 'Scheduled' : 'Add'}
                    </Button>
                  </HStack>
                ))}
              </VStack>
            </FormControl>
          </VStack>
        </CardBody>
      </Card>

      <HStack justify="center" spacing={4}>
        <Button
          variant="outline"
          size="lg"
          onClick={handleBack}
          color="dark.600"
          borderColor="dark.300"
        >
          Back
        </Button>
        <Button
          variant="brand-primary"
          size="lg"
          onClick={handleNext}
          rightIcon={<Icon as={ArrowRight} />}
          boxShadow="brand-glow"
        >
          Continue
        </Button>
      </HStack>
    </VStack>
  );

  const renderStep4 = () => (
    <VStack spacing={6} align="stretch">
      <Box textAlign="center" mb={6}>
        <Icon as={CheckCircle} boxSize={16} color="accent.success" mb={4} />
        <Heading size="lg" color="dark.800" mb={2}>
          You're All Set!
        </Heading>
        <Text color="dark.600" fontSize="lg">
          Your team is configured and ready to go. Let's start building champions!
        </Text>
      </Box>

      <Card>
        <CardHeader>
          <Heading size="md" color="dark.800">
            Team Summary
          </Heading>
        </CardHeader>
        <CardBody>
          <VStack spacing={4} align="stretch">
            <HStack justify="space-between">
              <Text color="dark.600" fontWeight="500">Team Name:</Text>
              <Badge colorScheme="primary" fontSize="md" px={3} py={1}>
                {teamSetup.teamName}
              </Badge>
            </HStack>
            <HStack justify="space-between">
              <Text color="dark.600" fontWeight="500">Sport:</Text>
              <Text color="dark.800" fontWeight="600">{teamSetup.sport}</Text>
            </HStack>
            <HStack justify="space-between">
              <Text color="dark.600" fontWeight="500">Age Group:</Text>
              <Text color="dark.800" fontWeight="600">{teamSetup.ageGroup}</Text>
            </HStack>
            <HStack justify="space-between">
              <Text color="dark.600" fontWeight="500">Division:</Text>
              <Text color="dark.800" fontWeight="600">{teamSetup.division}</Text>
            </HStack>
            {teamSetup.homeField && (
              <HStack justify="space-between">
                <Text color="dark.600" fontWeight="500">Home Field:</Text>
                <Text color="dark.800" fontWeight="600">{teamSetup.homeField}</Text>
              </HStack>
            )}
            {teamSetup.motto && (
              <HStack justify="space-between">
                <Text color="dark.600" fontWeight="500">Motto:</Text>
                <Text color="dark.800" fontWeight="600" fontStyle="italic">"{teamSetup.motto}"</Text>
              </HStack>
            )}
          </VStack>
        </CardBody>
      </Card>

      <Box textAlign="center" p={6} bg="primary.50" borderRadius="xl" border="1px solid" borderColor="primary.200">
        <VStack spacing={3}>
          <Text color="primary.800" fontWeight="600" fontSize="lg">
            🎉 Ready to get started?
          </Text>
          <Text color="primary.700" fontSize="sm">
            You can now access all Coach Core features including practice planning, playbook design, team management, and AI-powered insights.
          </Text>
        </VStack>
      </Box>

      <HStack justify="center" spacing={4}>
        <Button
          variant="outline"
          size="lg"
          onClick={handleBack}
          color="dark.600"
          borderColor="dark.300"
        >
          Back
        </Button>
        <Button
          variant="brand-primary"
          size="lg"
          onClick={handleComplete}
          isLoading={isLoading}
          loadingText="Setting up..."
          rightIcon={<Icon as={CheckCircle} />}
          px={8}
          boxShadow="brand-glow"
          _hover={{
            transform: 'translateY(-2px)',
            boxShadow: 'brand-glow-lg',
          }}
        >
          Complete Setup
        </Button>
      </HStack>
    </VStack>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      default:
        return renderStep1();
    }
  };

  return (
    <Box minH="100vh" bg="dark.50" p={6}>
      {/* Progress Header */}
      <Box mb={8}>
        <VStack spacing={4}>
          <Heading size="xl" color="dark.800" textAlign="center">
            Welcome to Coach Core
          </Heading>
          <Text color="dark.600" textAlign="center" fontSize="lg">
            Step {currentStep} of {totalSteps}
          </Text>
          <Progress
            value={progress}
            size="lg"
            colorScheme="primary"
            borderRadius="full"
            w="full"
            maxW="600px"
            bg="dark.200"
          />
        </VStack>
      </Box>

      {/* Step Content */}
      <Box maxW="800px" mx="auto">
        {renderCurrentStep()}
      </Box>

      {/* Feature Preview */}
      {currentStep === 1 && (
        <Box mt={12} maxW="1000px" mx="auto">
          <Heading size="lg" color="dark.800" textAlign="center" mb={6}>
            What You'll Get
          </Heading>
          <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} gap={6}>
            <Card className="card-brand">
              <CardBody textAlign="center">
                <Icon as={Brain} boxSize={8} color="primary.500" mb={3} />
                <Heading size="md" color="dark.800" mb={2}>
                  AI-Powered Planning
                </Heading>
                <Text color="dark.600" fontSize="sm">
                  Generate practice plans and get insights in seconds
                </Text>
              </CardBody>
            </Card>

            <Card className="card-brand">
              <CardBody textAlign="center">
                <Icon as={Play} boxSize={8} color="inclusive.blue" mb={3} />
                <Heading size="md" color="dark.800" mb={2}>
                  Visual Play Design
                </Heading>
                <Text color="dark.600" fontSize="sm">
                  Create and share plays with drag & drop tools
                </Text>
              </CardBody>
            </Card>

            <Card className="card-brand">
              <CardBody textAlign="center">
                <Icon as={Users} boxSize={8} color="inclusive.green" mb={3} />
                <Heading size="md" color="dark.800" mb={2}>
                  Team Management
                </Heading>
                <Text color="dark.600" fontSize="sm">
                  Track players, attendance, and performance
                </Text>
              </CardBody>
            </Card>

            <Card className="card-brand">
              <CardBody textAlign="center">
                <Icon as={BarChart3} boxSize={8} color="inclusive.purple" mb={3} />
                <Heading size="md" color="dark.800" mb={2}>
                  Analytics & Insights
                </Heading>
                <Text color="dark.600" fontSize="sm">
                  Data-driven coaching decisions
                </Text>
              </CardBody>
            </Card>

            <Card className="card-brand">
              <CardBody textAlign="center">
                <Icon as={Globe} boxSize={8} color="inclusive.orange" mb={3} />
                <Heading size="md" color="dark.800" mb={2}>
                  Global Community
                </Heading>
                <Text color="dark.600" fontSize="sm">
                  Connect with coaches worldwide
                </Text>
              </CardBody>
            </Card>

            <Card className="card-brand">
              <CardBody textAlign="center">
                <Icon as={Zap} boxSize={8} color="inclusive.pink" mb={3} />
                <Heading size="md" color="dark.800" mb={2}>
                  Lightning Fast
                </Heading>
                <Text color="dark.600" fontSize="sm">
                  Modern, responsive design for any device
                </Text>
              </CardBody>
            </Card>
          </Grid>
        </Box>
      )}
    </Box>
  );
};

export default WelcomeWorkflow;

