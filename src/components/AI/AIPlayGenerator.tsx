import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  useToast,
  Card,
  CardBody,
  CardHeader,
  FormControl,
  FormLabel,
  Select,
  Input,
  Checkbox,
  CheckboxGroup,
  Stack,
  Badge,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Icon,
  Step,
  StepDescription,
  StepIcon,
  StepIndicator,
  StepNumber,
  StepSeparator,
  StepStatus,
  StepTitle,
  Stepper,
  SimpleGrid,
  List,
  ListItem,
  ListIcon,
  Container,
} from '@chakra-ui/react';
import { 
  Brain, 
  Play, 
  Users, 
  Target, 
  Clock, 
  Trophy, 
  Zap,
  Sparkles,
  Lightbulb,
  BookOpen,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Flag,
  Download,
} from 'lucide-react';
import { aiService } from '../../services/ai/ai-service';
import AIService from '../../services/ai/ai-service';
import { useAuth } from '../../hooks/useAuth';
import { UserProfile } from '../../types/user';
import { 
  TeamProfile, 
  PlayRequirements, 
  GeneratedPlay 
} from '../../services/ai/types';
import TagInput from '../../components/TagInput';
import { Link } from 'react-router-dom';
import { SUBSCRIPTION_PLANS } from '../../constants/subscription';
import { subscriptionService } from '../../services/subscription/subscription-service';

const AIPlayGenerator: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlay, setGeneratedPlay] = useState<GeneratedPlay | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const toast = useToast();
  const { user, profile } = useAuth();
  const [subscriptionLimit, setSubscriptionLimit] = useState<string | null>(null);

  // Onboarding steps
  const onboardingSteps = [
    {
      title: 'Team Basics',
      description: 'Tell us about your team',
      icon: Users,
      fields: ['teamName', 'ageGroup', 'experienceLevel']
    },
    {
      title: 'Team Identity',
      description: 'Define your playing style',
      icon: Flag,
      fields: ['preferredStyle', 'strengths', 'weaknesses']
    },
    {
      title: 'Play Objectives',
      description: 'What do you want to achieve?',
      icon: Target,
      fields: ['objective', 'specialSituations']
    },
    {
      title: 'Generate Your First Play',
      description: 'Let AI create a custom strategy',
      icon: Brain,
      fields: ['generate']
    }
  ];

  // Form state - Football-focused defaults
  const [teamProfile, setTeamProfile] = useState<TeamProfile>({
    sport: 'football',
    playerCount: 11,
    strengths: [],
    weaknesses: [],
    experienceLevel: 'intermediate',
    preferredStyle: 'balanced',
    ageGroup: 'high-school',
    teamName: '',
  });

  const [playRequirements, setPlayRequirements] = useState<PlayRequirements>({
    objective: 'scoring',
    difficulty: 'intermediate',
    timeOnShotClock: 40, // Football play clock (keeping for compatibility)
    specialSituations: [],
    playerCount: 11,
  });

  // Available options - Football-focused
  const sports = ['football']; // Focus on football only for now
  const experienceLevels = ['beginner', 'intermediate', 'advanced', 'elite'];
  const preferredStyles = ['run-heavy', 'pass-heavy', 'balanced', 'defensive', 'aggressive'];
  const ageGroups = ['youth', 'middle-school', 'high-school', 'college', 'professional'];
  const objectives = ['scoring', 'field-position', 'clock-management', 'red-zone', 'goal-line', '2-minute-drill'];
  const difficulties = ['beginner', 'intermediate', 'advanced'];
  const specialSituations = [
    'red-zone',
    'goal-line',
    '2-minute-drill',
    '4th-down',
    'short-yardage',
    'long-yardage',
    '3rd-and-long',
    '3rd-and-short'
  ];

  // Football-specific strengths and weaknesses
  const footballStrengths = [
    'power-running',
    'passing-game',
    'defensive-line',
    'secondary-coverage',
    'special-teams',
    'clock-management',
    'red-zone-efficiency',
    'turnover-creation'
  ];

  const footballWeaknesses = [
    'pass-protection',
    'run-defense',
    'penalties',
    'third-down-conversions',
    'red-zone-defense',
    'clock-management',
    'special-teams-coverage',
    'turnover-prevention'
  ];

  // Onboarding navigation
  const nextStep = () => {
    if (onboardingStep < onboardingSteps.length - 1) {
      setOnboardingStep(onboardingStep + 1);
    }
  };

  const prevStep = () => {
    if (onboardingStep > 0) {
      setOnboardingStep(onboardingStep - 1);
    }
  };

  const canProceed = () => {
    switch (onboardingStep) {
      case 0: // Team Basics
        return teamProfile.teamName.trim() && teamProfile.ageGroup && teamProfile.experienceLevel;
      case 1: // Team Identity
        return teamProfile.preferredStyle && teamProfile.strengths.length > 0;
      case 2: // Play Objectives
        return playRequirements.objective && playRequirements.specialSituations.length > 0;
      default:
        return true;
    }
  };

  const handleGeneratePlay = async () => {
    if (!user || !profile) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to generate plays',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Check subscription limits before generating
    const limitCheck = subscriptionService.validateSubscriptionLimits(
      profile,
      'playsGeneratedThisMonth'
    );

    if (!limitCheck.allowed) {
      setSubscriptionLimit(limitCheck.reason || 'Subscription limit exceeded');
      toast({
        title: 'Subscription Limit Reached',
        description: limitCheck.reason || 'You have reached your monthly play generation limit.',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    setSubscriptionLimit(null);
    setIsGenerating(true);
    setError(null);

    try {
      const response = await AIService.generateCustomPlay(
        {
          ...teamProfile,
          teamName: teamProfile.teamName || (profile?.teamName ?? 'My Team'),
        },
        {
          ...playRequirements,
          playerCount: teamProfile.playerCount,
        }
      );

      if (response.success && response.play) {
        setGeneratedPlay(response.play);
        toast({
          title: response.fallback ? 'Fallback Play Generated' : 'Play Generated!',
          description: response.fallback
            ? 'Delivered a structured fallback play while AI services recover.'
            : 'Review the generated play and tailor it to your team context.',
          status: response.fallback ? 'warning' : 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        setGeneratedPlay(null);
        setError('Failed to generate play. Please refine team details and try again.');
        toast({
          title: 'Generation Failed',
          description: 'Unable to generate a play with the provided context.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error: any) {
      setError(error.message || 'An unexpected error occurred');
      toast({
        title: 'Generation Failed',
        description: error.message || 'An unexpected error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStrengthChange = (strength: string, isChecked: boolean) => {
    if (isChecked) {
      setTeamProfile(prev => ({
        ...prev,
        strengths: [...prev.strengths, strength]
      }));
    } else {
      setTeamProfile(prev => ({
        ...prev,
        strengths: prev.strengths.filter(s => s !== strength)
      }));
    }
  };

  const handleWeaknessChange = (weakness: string, isChecked: boolean) => {
    if (isChecked) {
      setTeamProfile(prev => ({
        ...prev,
        weaknesses: [...prev.weaknesses, weakness]
      }));
    } else {
      setTeamProfile(prev => ({
        ...prev,
        weaknesses: prev.weaknesses.filter(w => w !== weakness)
      }));
    }
  };

  const handleSpecialSituationChange = (situation: string, isChecked: boolean) => {
    if (isChecked) {
      setPlayRequirements(prev => ({
        ...prev,
        specialSituations: [...prev.specialSituations, situation]
      }));
    } else {
      setPlayRequirements(prev => ({
        ...prev,
        specialSituations: prev.specialSituations.filter(s => s !== situation)
      }));
    }
  };

  const resetForm = () => {
    setTeamProfile({
      sport: 'football',
      playerCount: 11,
      strengths: [],
      weaknesses: [],
      experienceLevel: 'intermediate',
      preferredStyle: 'balanced',
      ageGroup: 'high-school',
      teamName: '',
    });
    setPlayRequirements({
      objective: 'scoring',
      difficulty: 'intermediate',
      timeOnShotClock: 40,
      specialSituations: [],
      playerCount: 11,
    });
    setGeneratedPlay(null);
    setError(null);
    setShowOnboarding(true);
    setOnboardingStep(0);
  };

  return (
    <Box minH="100vh" bg="gray.100">
      <Container maxW="7xl" py={8}>
        <VStack spacing={8} align="stretch">
          {/* Header */}
          <Box textAlign="center">
            <Heading size="2xl" color="brand.500" mb={4}>
              🏈 AI Play Generator
            </Heading>
            <Text fontSize="lg" color="gray.600" maxW="3xl" mx="auto">
              Generate intelligent football plays tailored to your team's strengths and game situation.
              Powered by advanced AI coaching insights.
            </Text>
            
            {/* Subscription Status */}
            {profile && (
              <Box mt={4} p={4} bg="blue.50" borderRadius="lg" border="1px" borderColor="blue.200">
                <HStack justify="center" spacing={4}>
                  <Badge colorScheme="blue" variant="solid">
                    {profile.subscription?.toUpperCase() || 'FREE'} Plan
                  </Badge>
                  <Text fontSize="sm" color="gray.600">
                    {profile.usage?.playsGeneratedThisMonth || 0} of {SUBSCRIPTION_PLANS[profile.subscription || 'free']?.limits?.maxPlaysPerMonth || 5} plays used this month
                  </Text>
                  {(profile.subscription === 'free' || !profile.subscription) && (
                    <Button
                      size="sm"
                      colorScheme="blue"
                      variant="outline"
                      as={Link}
                      to="/subscription"
                    >
                      Upgrade to Premium
                    </Button>
                  )}
                </HStack>
              </Box>
            )}
          </Box>

          {/* Subscription Limit Warning */}
          {subscriptionLimit && (
            <Alert status="warning" borderRadius="lg">
              <AlertIcon />
              <Box>
                <AlertTitle>Subscription Limit Reached</AlertTitle>
                <AlertDescription>
                  {subscriptionLimit}
                  <Button
                    ml={4}
                    size="sm"
                    colorScheme="blue"
                    variant="outline"
                    as={Link}
                    to="/subscription"
                  >
                    Upgrade Now
                  </Button>
                </AlertDescription>
              </Box>
            </Alert>
          )}

          {/* Main Content */}
          <HStack spacing={8} align="flex-start">
            {/* Left Side - Form */}
            <Box flex={1}>
              <VStack spacing={6} align="stretch">
                {showOnboarding && (
                  <Card>
                    <CardBody>
                      <VStack spacing={4}>
                        <Heading size="md" color="brand.500">
                          Welcome to AI Play Generator! 🎯
                        </Heading>
                        <Stepper index={onboardingStep} colorScheme="brand">
                          {onboardingSteps.map((step, index) => (
                            <Step key={index}>
                              <StepIndicator>
                                <StepStatus
                                  complete={<StepIcon />}
                                  incomplete={<StepNumber />}
                                  active={<StepNumber />}
                                />
                              </StepIndicator>
                              <Box flexShrink="0">
                                <StepTitle>{step.title}</StepTitle>
                                <StepDescription>{step.description}</StepDescription>
                              </Box>
                            </Step>
                          ))}
                        </Stepper>
                        <HStack spacing={4}>
                          <Button
                            onClick={prevStep}
                            isDisabled={onboardingStep === 0}
                            variant="outline"
                          >
                            Previous
                          </Button>
                          <Button
                            onClick={nextStep}
                            colorScheme="brand"
                            isDisabled={onboardingStep === onboardingSteps.length - 1}
                          >
                            Next
                          </Button>
                          <Button
                            onClick={() => setShowOnboarding(false)}
                            variant="ghost"
                          >
                            Skip Onboarding
                          </Button>
                        </HStack>
                      </VStack>
                    </CardBody>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <Heading size="md" color="brand.500">
                      🏈 Team Profile
                    </Heading>
                  </CardHeader>
                  <CardBody>
                    <VStack spacing={4}>
                      <SimpleGrid columns={2} spacing={4} w="full">
                        <FormControl>
                          <FormLabel>Sport</FormLabel>
                          <Select
                            value={teamProfile.sport}
                            onChange={(e) => setTeamProfile(prev => ({ ...prev, sport: e.target.value }))}
                          >
                            {sports.map(sport => (
                              <option key={sport} value={sport}>{sport}</option>
                            ))}
                          </Select>
                        </FormControl>
                        
                        <FormControl>
                          <FormLabel>Formation</FormLabel>
                          <Select
                            value={teamProfile.playerCount}
                            onChange={(e) => setTeamProfile(prev => ({ ...prev, playerCount: parseInt(e.target.value) }))}
                          >
                            <option value={11}>11 Players (Standard)</option>
                            <option value={9}>9 Players</option>
                            <option value={7}>7 Players</option>
                            <option value={6}>6 Players</option>
                          </Select>
                        </FormControl>
                      </SimpleGrid>

                      <SimpleGrid columns={2} spacing={4} w="full">
                        <FormControl>
                          <FormLabel>Experience Level</FormLabel>
                          <Select
                            value={teamProfile.experienceLevel}
                            onChange={(e) => setTeamProfile(prev => ({ ...prev, experienceLevel: e.target.value }))}
                          >
                            <option value="beginner">Beginner</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="advanced">Advanced</option>
                            <option value="elite">Elite</option>
                          </Select>
                        </FormControl>
                        
                        <FormControl>
                          <FormLabel>Age Group</FormLabel>
                          <Select
                            value={teamProfile.ageGroup}
                            onChange={(e) => setTeamProfile(prev => ({ ...prev, ageGroup: e.target.value }))}
                          >
                            <option value="youth">Youth (8-12)</option>
                            <option value="teen">Teen (13-17)</option>
                            <option value="high-school">High School</option>
                            <option value="college">College</option>
                            <option value="adult">Adult</option>
                          </Select>
                        </FormControl>
                      </SimpleGrid>

                      <FormControl>
                        <FormLabel>Preferred Style</FormLabel>
                        <Select
                          value={teamProfile.preferredStyle}
                          onChange={(e) => setTeamProfile(prev => ({ ...prev, preferredStyle: e.target.value }))}
                        >
                          <option value="balanced">Balanced</option>
                          <option value="aggressive">Aggressive</option>
                          <option value="defensive">Defensive</option>
                          <option value="fast-paced">Fast-Paced</option>
                          <option value="strategic">Strategic</option>
                        </Select>
                      </FormControl>

                      <FormControl>
                        <FormLabel>Team Strengths</FormLabel>
                        <TagInput
                          value={teamProfile.strengths}
                          onChange={(strengths) => setTeamProfile(prev => ({ ...prev, strengths }))}
                          placeholder="Add team strengths..."
                        />
                      </FormControl>

                      <FormControl>
                        <FormLabel>Areas for Improvement</FormLabel>
                        <TagInput
                          value={teamProfile.weaknesses}
                          onChange={(weaknesses) => setTeamProfile(prev => ({ ...prev, weaknesses }))}
                          placeholder="Add areas for improvement..."
                        />
                      </FormControl>
                    </VStack>
                  </CardBody>
                </Card>

                {/* Play Requirements */}
                <Card>
                  <CardHeader>
                    <Heading size="md" color="brand.500">
                      🎯 Play Requirements
                    </Heading>
                  </CardHeader>
                  <CardBody>
                    <VStack spacing={4}>
                      <SimpleGrid columns={2} spacing={4} w="full">
                        <FormControl>
                          <FormLabel>Objective</FormLabel>
                          <Select
                            value={playRequirements.objective}
                            onChange={(e) => setPlayRequirements(prev => ({ ...prev, objective: e.target.value }))}
                          >
                            {objectives.map(obj => (
                              <option key={obj} value={obj}>{obj}</option>
                            ))}
                          </Select>
                        </FormControl>
                        
                        <FormControl>
                          <FormLabel>Difficulty</FormLabel>
                          <Select
                            value={playRequirements.difficulty}
                            onChange={(e) => setPlayRequirements(prev => ({ ...prev, difficulty: e.target.value }))}
                          >
                            <option value="easy">Easy</option>
                            <option value="moderate">Moderate</option>
                            <option value="challenging">Challenging</option>
                            <option value="advanced">Advanced</option>
                          </Select>
                        </FormControl>
                      </SimpleGrid>

                      <FormControl>
                        <FormLabel>Play Clock (seconds)</FormLabel>
                        <Input
                          type="number"
                          value={playRequirements.timeOnShotClock}
                          onChange={(e) => setPlayRequirements(prev => ({ ...prev, timeOnShotClock: parseInt(e.target.value) }))}
                          placeholder="40"
                        />
                      </FormControl>

                      <FormControl>
                        <FormLabel>Special Situations</FormLabel>
                        <TagInput
                          value={playRequirements.specialSituations}
                          onChange={(specialSituations) => setPlayRequirements(prev => ({ ...prev, specialSituations }))}
                          placeholder="Add special situations..."
                        />
                      </FormControl>
                    </VStack>
                  </CardBody>
                </Card>

                {/* Generate Button */}
                <Box textAlign="center">
                  <Button
                    size="lg"
                    colorScheme="brand"
                    onClick={handleGeneratePlay}
                    isLoading={isGenerating}
                    loadingText="Generating Play..."
                    px={12}
                    py={6}
                    fontSize="lg"
                    fontWeight="bold"
                    _hover={{
                      transform: 'translateY(-2px)',
                      boxShadow: 'lg',
                    }}
                    transition="all 0.2s"
                    isDisabled={!user || !profile}
                  >
                    🚀 Generate AI Play
                  </Button>
                  {!user && (
                    <Text fontSize="sm" color="gray.500" mt={2}>
                      Please sign in to generate plays
                    </Text>
                  )}
                </Box>
              </VStack>
            </Box>

            {/* Right Side - Generated Play */}
            <Box flex={1}>
              {generatedPlay ? (
                <Card>
                  <CardHeader>
                    <Heading size="md" color="brand.500">
                      🎯 Generated Play: {generatedPlay.name}
                    </Heading>
                  </CardHeader>
                  <CardBody>
                    <VStack spacing={6} align="stretch">
                      <Box>
                        <Heading size="sm" mb={2}>Description</Heading>
                        <Text>{generatedPlay.description}</Text>
                      </Box>

                      <Box>
                        <Heading size="sm" mb={2}>Player Positions & Movements</Heading>
                        <VStack spacing={3} align="stretch">
                          {generatedPlay.positions?.map((position, index) => (
                            <Box key={index} p={3} bg="gray.50" borderRadius="md">
                              <Text fontWeight="bold">{position.position}</Text>
                              <Text fontSize="sm">{position.movement}</Text>
                              <Text fontSize="sm" color="gray.600">{position.responsibility}</Text>
                            </Box>
                          ))}
                        </VStack>
                      </Box>

                      <Box>
                        <Heading size="sm" mb={2}>Coaching Points</Heading>
                        <List spacing={2}>
                          {generatedPlay.coachingPoints?.map((point, index) => (
                            <ListItem key={index} display="flex" alignItems="center">
                              <ListIcon as={CheckCircle} color="green.500" />
                              {point}
                            </ListItem>
                          ))}
                        </List>
                      </Box>

                      {generatedPlay.variations && generatedPlay.variations.length > 0 && (
                        <Box>
                          <Heading size="sm" mb={2}>Variations & Adjustments</Heading>
                          <List spacing={2}>
                            {generatedPlay.variations.map((variation, index) => (
                              <ListItem key={index} display="flex" alignItems="center">
                                <ListIcon as={ArrowRight} color="blue.500" />
                                {variation}
                              </ListItem>
                            ))}
                          </List>
                        </Box>
                      )}

                      <HStack spacing={4} justify="center">
                        <Button
                          colorScheme="blue"
                          variant="outline"
                          onClick={() => setGeneratedPlay(null)}
                        >
                          Generate New Play
                        </Button>
                        <Button
                          colorScheme="green"
                          variant="outline"
                          leftIcon={<Download />}
                        >
                          Save Play
                        </Button>
                      </HStack>
                    </VStack>
                  </CardBody>
                </Card>
              ) : (
                <Card>
                  <CardBody textAlign="center" py={12}>
                    <VStack spacing={4}>
                      <Box fontSize="6xl">🏈</Box>
                      <Heading size="md" color="gray.500">
                        No Play Generated Yet
                      </Heading>
                      <Text color="gray.500">
                        Fill out the form on the left and click "Generate AI Play" to create your first play.
                      </Text>
                    </VStack>
                  </CardBody>
                </Card>
              )}
            </Box>
          </HStack>
        </VStack>
      </Container>
    </Box>
  );
};

export default AIPlayGenerator;
