import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Card,
  CardHeader,
  CardBody,
  Input,
  FormControl,
  FormLabel,
  FormHelperText,
  Heading,
  Progress,
  Icon,
  useToast,
  Grid,
  Flex,
  Badge,
  Avatar,
  Divider,
  Switch,
  Select,
  Textarea,
  Image,
  IconButton,
  Tooltip
} from '@chakra-ui/react';
import {
  Palette,
  Upload,
  Eye,
  EyeOff,
  Check,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Users,
  Target,
  Trophy,
  Settings,
  Brain,
  Zap
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface TeamSetupWizardProps {
  onComplete: (teamData: any) => void;
  onCancel: () => void;
}

const TeamSetupWizard: React.FC<TeamSetupWizardProps> = ({ onComplete, onCancel }) => {
  const { theme, setTheme, generateTeamPalette } = useTheme();
  const toast = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [teamData, setTeamData] = useState({
    basicInfo: {
      teamName: '',
      sport: '',
      level: '',
      season: ''
    },
    branding: {
      primaryColor: '#00D4FF',
      secondaryColor: '#0A1628',
      accentColor: '#00A8CC',
      logo: null,
      logoMark: null,
      mascot: ''
    },
    preferences: {
      darkMode: false,
      compactMode: false,
      animations: true,
      sounds: true
    },
    features: {
      aiAssistance: true,
      analytics: true,
      communication: true,
      scheduling: true,
      playbook: true,
      achievements: true
    }
  });

  const steps = [
    { id: 0, title: 'Basic Info', icon: Users },
    { id: 1, title: 'Branding', icon: Palette },
    { id: 2, title: 'Preferences', icon: Settings },
    { id: 3, title: 'Features', icon: Sparkles },
    { id: 4, title: 'Preview', icon: Eye }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    // Generate theme from team data
    const newTheme = {
      id: `team-${Date.now()}`,
      teamId: teamData.basicInfo.teamName.toLowerCase().replace(/\s+/g, '-'),
      branding: teamData.branding,
      colors: generateTeamPalette(teamData.branding.primaryColor, teamData.branding.secondaryColor),
      gradients: {
        primary: `linear-gradient(135deg, ${teamData.branding.primaryColor} 0%, ${teamData.branding.secondaryColor} 100%)`,
        secondary: `linear-gradient(135deg, ${teamData.branding.accentColor} 0%, ${teamData.branding.secondaryColor} 100%)`,
        hero: `linear-gradient(135deg, ${teamData.branding.primaryColor} 0%, ${teamData.branding.accentColor} 100%)`
      },
      preferences: teamData.preferences
    };

    setTheme(newTheme);
    onComplete(teamData);
    
    toast({
      title: 'Team setup complete!',
      description: `${teamData.basicInfo.teamName} is now ready to use Coach Core AI.`,
      status: 'success',
      duration: 5000,
      isClosable: true,
    });
  };

  const updateTeamData = (section: string, field: string, value: any) => {
    setTeamData(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [field]: value
      }
    }));
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <BasicInfoStep teamData={teamData} updateTeamData={updateTeamData} />;
      case 1:
        return <BrandingStep teamData={teamData} updateTeamData={updateTeamData} />;
      case 2:
        return <PreferencesStep teamData={teamData} updateTeamData={updateTeamData} />;
      case 3:
        return <FeaturesStep teamData={teamData} updateTeamData={updateTeamData} />;
      case 4:
        return <PreviewStep teamData={teamData} />;
      default:
        return null;
    }
  };

  return (
    <Box minH="100vh" bg="var(--team-surface-50)" py={8}>
      <Box maxW="4xl" mx="auto" px={6}>
        {/* Header */}
        <VStack spacing={6} mb={8}>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <HStack spacing={4}>
              <Icon as={Sparkles} w={8} h={8} color="var(--team-primary)" />
              <VStack align="start" spacing={0}>
                <Heading size="lg" color="var(--team-text-primary)">
                  Team Setup Wizard
                </Heading>
                <Text color="var(--team-text-secondary)">
                  Customize your team's experience in just a few steps
                </Text>
              </VStack>
            </HStack>
          </motion.div>

          {/* Progress Steps */}
          <Box w="full">
            <Progress 
              value={(currentStep / (steps.length - 1)) * 100} 
              colorScheme="blue" 
              size="sm" 
              mb={4}
            />
            <HStack justify="space-between" w="full">
              {steps.map((step, index) => (
                <motion.div
                  key={step.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <VStack spacing={2}>
                    <Box
                      w={10}
                      h={10}
                      borderRadius="full"
                      bg={index <= currentStep ? "var(--team-primary)" : "var(--team-surface-300)"}
                      color="white"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      cursor="pointer"
                      onClick={() => setCurrentStep(index)}
                    >
                      {index < currentStep ? (
                        <Icon as={Check} w={5} h={5} />
                      ) : (
                        <Icon as={step.icon} w={5} h={5} />
                      )}
                    </Box>
                    <Text fontSize="sm" color="var(--team-text-secondary)">
                      {step.title}
                    </Text>
                  </VStack>
                </motion.div>
              ))}
            </HStack>
          </Box>
        </VStack>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="team-gradient-card" p={8}>
              {renderStep()}
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <HStack justify="space-between" mt={8}>
          <Button
            leftIcon={<Icon as={ArrowLeft} />}
            variant="outline"
            onClick={handlePrevious}
            isDisabled={currentStep === 0}
          >
            Previous
          </Button>

          <HStack spacing={4}>
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            {currentStep === steps.length - 1 ? (
              <Button
                rightIcon={<Icon as={Check} />}
                colorScheme="blue"
                onClick={handleComplete}
                className="team-gradient-button"
              >
                Complete Setup
              </Button>
            ) : (
              <Button
                rightIcon={<Icon as={ArrowRight} />}
                onClick={handleNext}
                className="team-gradient-button"
              >
                Next
              </Button>
            )}
          </HStack>
        </HStack>
      </Box>
    </Box>
  );
};

// Step Components
const BasicInfoStep: React.FC<{ teamData: any; updateTeamData: any }> = ({ teamData, updateTeamData }) => {
  return (
    <VStack spacing={6} align="stretch">
      <VStack align="start" spacing={2}>
        <Heading size="md">Basic Team Information</Heading>
        <Text color="var(--team-text-secondary)">
          Tell us about your team to get started
        </Text>
      </VStack>

      <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={6}>
        <FormControl>
          <FormLabel>Team Name</FormLabel>
          <Input
            value={teamData.basicInfo.teamName}
            onChange={(e) => updateTeamData('basicInfo', 'teamName', e.target.value)}
            placeholder="e.g., Wildcats Varsity"
          />
        </FormControl>

        <FormControl>
          <FormLabel>Sport</FormLabel>
          <Select
            value={teamData.basicInfo.sport}
            onChange={(e) => updateTeamData('basicInfo', 'sport', e.target.value)}
            placeholder="Select sport"
          >
            <option value="football">Football</option>
            <option value="basketball">Basketball</option>
            <option value="soccer">Soccer</option>
            <option value="baseball">Baseball</option>
            <option value="hockey">Hockey</option>
            <option value="volleyball">Volleyball</option>
            <option value="lacrosse">Lacrosse</option>
            <option value="other">Other</option>
          </Select>
        </FormControl>

        <FormControl>
          <FormLabel>Level</FormLabel>
          <Select
            value={teamData.basicInfo.level}
            onChange={(e) => updateTeamData('basicInfo', 'level', e.target.value)}
            placeholder="Select level"
          >
            <option value="youth">Youth</option>
            <option value="middle-school">Middle School</option>
            <option value="high-school">High School</option>
            <option value="college">College</option>
            <option value="professional">Professional</option>
            <option value="recreational">Recreational</option>
          </Select>
        </FormControl>

        <FormControl>
          <FormLabel>Season</FormLabel>
          <Input
            value={teamData.basicInfo.season}
            onChange={(e) => updateTeamData('basicInfo', 'season', e.target.value)}
            placeholder="e.g., Fall 2024"
          />
        </FormControl>
      </Grid>
    </VStack>
  );
};

const BrandingStep: React.FC<{ teamData: any; updateTeamData: any }> = ({ teamData, updateTeamData }) => {
  const [showColorPicker, setShowColorPicker] = useState(false);

  const presetColors = [
    { name: 'Coach Core', primary: '#00D4FF', secondary: '#0A1628', accent: '#00A8CC' },
    { name: 'Eagles', primary: '#1E40AF', secondary: '#1F2937', accent: '#F59E0B' },
    { name: 'Lions', primary: '#DC2626', secondary: '#1F2937', accent: '#F59E0B' },
    { name: 'Tigers', primary: '#F59E0B', secondary: '#1F2937', accent: '#DC2626' },
    { name: 'Bears', primary: '#7C3AED', secondary: '#1F2937', accent: '#10B981' },
    { name: 'Custom', primary: '#FF6B6B', secondary: '#2C3E50', accent: '#4ECDC4' }
  ];

  return (
    <VStack spacing={6} align="stretch">
      <VStack align="start" spacing={2}>
        <Heading size="md">Team Branding</Heading>
        <Text color="var(--team-text-secondary)">
          Customize your team's colors and branding
        </Text>
      </VStack>

      {/* Color Presets */}
      <Box>
        <FormLabel mb={4}>Choose a Color Scheme</FormLabel>
        <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={4}>
          {presetColors.map((preset, index) => (
            <motion.div
              key={preset.name}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Card
                p={4}
                cursor="pointer"
                border="2px solid"
                borderColor={teamData.branding.primaryColor === preset.primary ? "var(--team-primary)" : "transparent"}
                onClick={() => {
                  updateTeamData('branding', 'primaryColor', preset.primary);
                  updateTeamData('branding', 'secondaryColor', preset.secondary);
                  updateTeamData('branding', 'accentColor', preset.accent);
                }}
              >
                <VStack spacing={3}>
                  <HStack spacing={2}>
                    <Box w={6} h={6} borderRadius="full" bg={preset.primary} />
                    <Box w={6} h={6} borderRadius="full" bg={preset.secondary} />
                    <Box w={6} h={6} borderRadius="full" bg={preset.accent} />
                  </HStack>
                  <Text fontSize="sm" fontWeight="medium">
                    {preset.name}
                  </Text>
                </VStack>
              </Card>
            </motion.div>
          ))}
        </Grid>
      </Box>

      {/* Custom Colors */}
      <Box>
        <FormLabel mb={4}>Custom Colors</FormLabel>
        <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={4}>
          <FormControl>
            <FormLabel fontSize="sm">Primary Color</FormLabel>
            <HStack>
              <Input
                type="color"
                value={teamData.branding.primaryColor}
                onChange={(e) => updateTeamData('branding', 'primaryColor', e.target.value)}
                w={12}
                h={10}
              />
              <Input
                value={teamData.branding.primaryColor}
                onChange={(e) => updateTeamData('branding', 'primaryColor', e.target.value)}
                placeholder="#00D4FF"
              />
            </HStack>
          </FormControl>

          <FormControl>
            <FormLabel fontSize="sm">Secondary Color</FormLabel>
            <HStack>
              <Input
                type="color"
                value={teamData.branding.secondaryColor}
                onChange={(e) => updateTeamData('branding', 'secondaryColor', e.target.value)}
                w={12}
                h={10}
              />
              <Input
                value={teamData.branding.secondaryColor}
                onChange={(e) => updateTeamData('branding', 'secondaryColor', e.target.value)}
                placeholder="#0A1628"
              />
            </HStack>
          </FormControl>

          <FormControl>
            <FormLabel fontSize="sm">Accent Color</FormLabel>
            <HStack>
              <Input
                type="color"
                value={teamData.branding.accentColor}
                onChange={(e) => updateTeamData('branding', 'accentColor', e.target.value)}
                w={12}
                h={10}
              />
              <Input
                value={teamData.branding.accentColor}
                onChange={(e) => updateTeamData('branding', 'accentColor', e.target.value)}
                placeholder="#00A8CC"
              />
            </HStack>
          </FormControl>
        </Grid>
      </Box>

      {/* Team Mascot */}
      <FormControl>
        <FormLabel>Team Mascot (Optional)</FormLabel>
        <Input
          value={teamData.branding.mascot}
          onChange={(e) => updateTeamData('branding', 'mascot', e.target.value)}
          placeholder="e.g., Wildcats, Eagles, Lions"
        />
        <FormHelperText>
          This will be used for personalized messaging and branding
        </FormHelperText>
      </FormControl>

      {/* Preview */}
      <Box p={4} bg="var(--team-surface-100)" borderRadius="md">
        <Text fontSize="sm" fontWeight="medium" mb={3}>Preview</Text>
        <HStack spacing={4}>
          <Avatar
            name={teamData.basicInfo.teamName}
            bg={teamData.branding.primaryColor}
            color="white"
          />
          <VStack align="start" spacing={1}>
            <Text fontWeight="medium">{teamData.basicInfo.teamName}</Text>
            <HStack spacing={2}>
              <Badge bg={teamData.branding.primaryColor} color="white">
                Primary
              </Badge>
              <Badge bg={teamData.branding.secondaryColor} color="white">
                Secondary
              </Badge>
              <Badge bg={teamData.branding.accentColor} color="white">
                Accent
              </Badge>
            </HStack>
          </VStack>
        </HStack>
      </Box>
    </VStack>
  );
};

const PreferencesStep: React.FC<{ teamData: any; updateTeamData: any }> = ({ teamData, updateTeamData }) => {
  return (
    <VStack spacing={6} align="stretch">
      <VStack align="start" spacing={2}>
        <Heading size="md">Team Preferences</Heading>
        <Text color="var(--team-text-secondary)">
          Customize how your team experiences Coach Core AI
        </Text>
      </VStack>

      <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={6}>
        <FormControl display="flex" alignItems="center">
          <FormLabel mb="0">Dark Mode</FormLabel>
          <Switch
            isChecked={teamData.preferences.darkMode}
            onChange={(e) => updateTeamData('preferences', 'darkMode', e.target.checked)}
          />
        </FormControl>

        <FormControl display="flex" alignItems="center">
          <FormLabel mb="0">Compact Mode</FormLabel>
          <Switch
            isChecked={teamData.preferences.compactMode}
            onChange={(e) => updateTeamData('preferences', 'compactMode', e.target.checked)}
          />
        </FormControl>

        <FormControl display="flex" alignItems="center">
          <FormLabel mb="0">Animations</FormLabel>
          <Switch
            isChecked={teamData.preferences.animations}
            onChange={(e) => updateTeamData('preferences', 'animations', e.target.checked)}
          />
        </FormControl>

        <FormControl display="flex" alignItems="center">
          <FormLabel mb="0">Sound Effects</FormLabel>
          <Switch
            isChecked={teamData.preferences.sounds}
            onChange={(e) => updateTeamData('preferences', 'sounds', e.target.checked)}
          />
        </FormControl>
      </Grid>

      <Divider />

      <VStack align="start" spacing={4}>
        <Text fontWeight="medium">Accessibility</Text>
        <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
          <FormControl display="flex" alignItems="center">
            <FormLabel mb="0">High Contrast</FormLabel>
            <Switch />
          </FormControl>

          <FormControl display="flex" alignItems="center">
            <FormLabel mb="0">Large Text</FormLabel>
            <Switch />
          </FormControl>

          <FormControl display="flex" alignItems="center">
            <FormLabel mb="0">Reduced Motion</FormLabel>
            <Switch />
          </FormControl>

          <FormControl display="flex" alignItems="center">
            <FormLabel mb="0">Screen Reader</FormLabel>
            <Switch />
          </FormControl>
        </Grid>
      </VStack>
    </VStack>
  );
};

const FeaturesStep: React.FC<{ teamData: any; updateTeamData: any }> = ({ teamData, updateTeamData }) => {
  const features = [
    {
      id: 'aiAssistance',
      title: 'AI Assistance',
      description: 'Get intelligent suggestions for plays, practice plans, and strategy',
      icon: Brain,
      color: 'purple'
    },
    {
      id: 'analytics',
      title: 'Advanced Analytics',
      description: 'Track performance, trends, and insights with detailed reports',
      icon: Target,
      color: 'blue'
    },
    {
      id: 'communication',
      title: 'Team Communication',
      description: 'Keep everyone connected with messaging and announcements',
      icon: Users,
      color: 'green'
    },
    {
      id: 'scheduling',
      title: 'Smart Scheduling',
      description: 'Organize practices, games, and events with AI-powered optimization',
      icon: Trophy,
      color: 'orange'
    },
    {
      id: 'playbook',
      title: 'Digital Playbook',
      description: 'Create, share, and manage plays with interactive diagrams',
      icon: Zap,
      color: 'red'
    },
    {
      id: 'achievements',
      title: 'Achievement System',
      description: 'Motivate players with badges, rewards, and progress tracking',
      icon: Sparkles,
      color: 'pink'
    }
  ];

  return (
    <VStack spacing={6} align="stretch">
      <VStack align="start" spacing={2}>
        <Heading size="md">Feature Selection</Heading>
        <Text color="var(--team-text-secondary)">
          Choose which features your team will use
        </Text>
      </VStack>

      <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={4}>
        {features.map((feature) => (
          <motion.div
            key={feature.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card
              p={4}
              cursor="pointer"
              border="2px solid"
              borderColor={teamData.features[feature.id] ? "var(--team-primary)" : "transparent"}
              onClick={() => updateTeamData('features', feature.id, !teamData.features[feature.id])}
            >
              <HStack spacing={4}>
                <Icon as={feature.icon} w={6} h={6} color={`${feature.color}.500`} />
                <VStack align="start" spacing={1} flex={1}>
                  <Text fontWeight="medium">{feature.title}</Text>
                  <Text fontSize="sm" color="var(--team-text-secondary)">
                    {feature.description}
                  </Text>
                </VStack>
                <Switch
                  isChecked={teamData.features[feature.id]}
                  onChange={(e) => updateTeamData('features', feature.id, e.target.checked)}
                  onClick={(e) => e.stopPropagation()}
                />
              </HStack>
            </Card>
          </motion.div>
        ))}
      </Grid>
    </VStack>
  );
};

const PreviewStep: React.FC<{ teamData: any }> = ({ teamData }) => {
  return (
    <VStack spacing={6} align="stretch">
      <VStack align="start" spacing={2}>
        <Heading size="md">Preview Your Team Experience</Heading>
        <Text color="var(--team-text-secondary)">
          Here's how your team will see Coach Core AI
        </Text>
      </VStack>

      <Card p={6} bg="var(--team-surface-100)">
        <VStack spacing={4} align="stretch">
          <HStack spacing={4}>
            <Avatar
              name={teamData.basicInfo.teamName}
              bg={teamData.branding.primaryColor}
              color="white"
              size="lg"
            />
            <VStack align="start" spacing={1}>
              <Heading size="md">{teamData.basicInfo.teamName}</Heading>
              <Text color="var(--team-text-secondary)">
                {teamData.basicInfo.sport} • {teamData.basicInfo.level} • {teamData.basicInfo.season}
              </Text>
              {teamData.branding.mascot && (
                <Badge colorScheme="blue">{teamData.branding.mascot}</Badge>
              )}
            </VStack>
          </HStack>

          <Divider />

          <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={4}>
            <VStack spacing={2}>
              <Text fontSize="sm" fontWeight="medium">Colors</Text>
              <HStack spacing={2}>
                <Box w={8} h={8} borderRadius="full" bg={teamData.branding.primaryColor} />
                <Box w={8} h={8} borderRadius="full" bg={teamData.branding.secondaryColor} />
                <Box w={8} h={8} borderRadius="full" bg={teamData.branding.accentColor} />
              </HStack>
            </VStack>

            <VStack spacing={2}>
              <Text fontSize="sm" fontWeight="medium">Preferences</Text>
              <HStack spacing={2}>
                {teamData.preferences.darkMode && <Badge size="sm">Dark Mode</Badge>}
                {teamData.preferences.animations && <Badge size="sm">Animations</Badge>}
                {teamData.preferences.sounds && <Badge size="sm">Sounds</Badge>}
              </HStack>
            </VStack>

            <VStack spacing={2}>
              <Text fontSize="sm" fontWeight="medium">Features</Text>
              <HStack spacing={2} flexWrap="wrap">
                {Object.entries(teamData.features).map(([key, enabled]) => 
                  enabled ? <Badge key={key} size="sm">{key}</Badge> : null
                )}
              </HStack>
            </VStack>
          </Grid>
        </VStack>
      </Card>

      <Text fontSize="sm" color="var(--team-text-secondary)" textAlign="center">
        You can always change these settings later in your team preferences.
      </Text>
    </VStack>
  );
};

export default TeamSetupWizard; 