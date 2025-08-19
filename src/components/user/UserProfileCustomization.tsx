import React, { useState, useEffect } from 'react';
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
  FormControl,
  FormLabel,
  FormHelperText,
  Input,
  Select,
  Textarea,
  Checkbox,
  CheckboxGroup,
  Radio,
  RadioGroup,
  Stack,
  Avatar,
  Badge,
  useToast,
  useColorModeValue,
  Divider,
  SimpleGrid,
  Icon,
  Progress,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { 
  User, 
  Shield, 
  Settings, 
  Bell, 
  Eye, 
  Brain, 
  Trophy, 
  Users, 
  Target, 
  Save,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { userProfileService, UserProfile, TeamRole } from '../../services/user/user-profile-service';

interface UserProfileCustomizationProps {
  userProfile: UserProfile;
  onProfileUpdate: (profile: UserProfile) => void;
  onComplete: () => void;
}

const UserProfileCustomization: React.FC<UserProfileCustomizationProps> = ({
  userProfile,
  onProfileUpdate,
  onComplete,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [teamRoles, setTeamRoles] = useState<TeamRole[]>([]);
  const [formData, setFormData] = useState<Partial<UserProfile>>(userProfile);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const toast = useToast();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  useEffect(() => {
    loadTeamRoles();
  }, []);

  const loadTeamRoles = async () => {
    try {
      const roles = await userProfileService.getTeamRoles();
      setTeamRoles(roles);
    } catch (error) {
      console.error('Error loading team roles:', error);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.displayName?.trim()) {
      newErrors.displayName = 'Display name is required';
    }

    if (!formData.role) {
      newErrors.role = 'Please select a role';
    }

    if (formData.preferences?.coaching?.experienceLevel === 'advanced' || 
        formData.preferences?.coaching?.experienceLevel === 'expert') {
      if (!formData.experience?.yearsCoaching || formData.experience.yearsCoaching < 3) {
        newErrors.experience = 'Advanced/Expert level requires at least 3 years of coaching experience';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const handlePreferencesChange = (category: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [category]: {
          ...prev.preferences?.[category],
          [field]: value,
        },
      },
    }));
  };

  const handleNext = () => {
    if (validateForm()) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const updatedProfile = await userProfileService.upsertUserProfile(formData);
      onProfileUpdate(updatedProfile);
      
      toast({
        title: 'Profile Updated',
        description: 'Your profile has been successfully updated!',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      onComplete();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to update profile. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep1 = () => (
    <VStack spacing={6} align="stretch">
      <Heading size="lg" color="gray.800">
        <Icon as={User} mr={3} color="blue.500" />
        Basic Information
      </Heading>
      
      <FormControl isInvalid={!!errors.displayName}>
        <FormLabel>Display Name</FormLabel>
        <Input
          value={formData.displayName || ''}
          onChange={(e) => handleInputChange('displayName', e.target.value)}
          placeholder="Enter your display name"
        />
        {errors.displayName && <FormHelperText color="red.500">{errors.displayName}</FormHelperText>}
      </FormControl>

      <FormControl>
        <FormLabel>Bio</FormLabel>
        <Textarea
          value={formData.bio || ''}
          onChange={(e) => handleInputChange('bio', e.target.value)}
          placeholder="Tell us about your coaching experience and philosophy"
          rows={4}
        />
      </FormControl>

      <FormControl>
        <FormLabel>Phone Number</FormLabel>
        <Input
          value={formData.phoneNumber || ''}
          onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
          placeholder="(555) 123-4567"
        />
      </FormControl>

      <FormControl>
        <FormLabel>Emergency Contact</FormLabel>
        <Input
          value={formData.emergencyContact || ''}
          onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
          placeholder="Name and phone number"
        />
      </FormControl>
    </VStack>
  );

  const renderStep2 = () => (
    <VStack spacing={6} align="stretch">
      <Heading size="lg" color="gray.800">
        <Icon as={Shield} mr={3} color="green.500" />
        Role & Experience
      </Heading>
      
      <FormControl isInvalid={!!errors.role}>
        <FormLabel>Team Role</FormLabel>
        <Select
          value={formData.role || ''}
          onChange={(e) => handleInputChange('role', e.target.value)}
          placeholder="Select your role"
        >
          {teamRoles.map(role => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </Select>
        {errors.role && <FormHelperText color="red.500">{errors.role}</FormHelperText>}
      </FormControl>

      <FormControl>
        <FormLabel>Years of Coaching Experience</FormLabel>
        <Input
          type="number"
          value={formData.experience?.yearsCoaching || 0}
          onChange={(e) => handleInputChange('experience', {
            ...formData.experience,
            yearsCoaching: parseInt(e.target.value) || 0,
          })}
          min={0}
          max={50}
        />
      </FormControl>

      <FormControl>
        <FormLabel>Sports You Coach</FormLabel>
        <CheckboxGroup
          value={formData.experience?.sports || []}
          onChange={(values) => handleInputChange('experience', {
            ...formData.experience,
            sports: values as string[],
          })}
        >
          <Stack spacing={2}>
            {['Football', 'Basketball', 'Baseball', 'Soccer', 'Tennis', 'Track & Field', 'Swimming', 'Volleyball'].map(sport => (
              <Checkbox key={sport} value={sport.toLowerCase()}>
                {sport}
              </Checkbox>
            ))}
          </Stack>
        </CheckboxGroup>
      </FormControl>

      <FormControl>
        <FormLabel>Age Groups You Work With</FormLabel>
        <CheckboxGroup
          value={formData.experience?.ageGroups || []}
          onChange={(values) => handleInputChange('experience', {
            ...formData.experience,
            ageGroups: values as string[],
          })}
        >
          <Stack spacing={2}>
            {['Youth (5-8)', 'Elementary (9-12)', 'Middle School (13-14)', 'High School (15-18)', 'College (19-22)', 'Adult (23+)'].map(group => (
              <Checkbox key={group} value={group.toLowerCase()}>
                {group}
              </Checkbox>
            ))}
          </Stack>
        </CheckboxGroup>
      </FormControl>

      {errors.experience && (
        <Alert status="warning">
          <AlertIcon />
          {errors.experience}
        </Alert>
      )}
    </VStack>
  );

  const renderStep3 = () => (
    <VStack spacing={6} align="stretch">
      <Heading size="lg" color="gray.800">
        <Icon as={Settings} mr={3} color="purple.500" />
        Preferences & Settings
      </Heading>
      
      <Card>
        <CardHeader>
          <HStack>
            <Icon as={Bell} color="blue.500" />
            <Text fontWeight="semibold">Notification Preferences</Text>
          </HStack>
        </CardHeader>
        <CardBody>
          <VStack spacing={4} align="stretch">
            <Checkbox
              isChecked={formData.preferences?.notifications?.email}
              onChange={(e) => handlePreferencesChange('notifications', 'email', e.target.checked)}
            >
              Email Notifications
            </Checkbox>
            <Checkbox
              isChecked={formData.preferences?.notifications?.push}
              onChange={(e) => handlePreferencesChange('notifications', 'push', e.target.checked)}
            >
              Push Notifications
            </Checkbox>
            <Checkbox
              isChecked={formData.preferences?.notifications?.inApp}
              onChange={(e) => handlePreferencesChange('notifications', 'inApp', e.target.checked)}
            >
              In-App Notifications
            </Checkbox>
          </VStack>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <HStack>
            <Icon as={Eye} color="green.500" />
            <Text fontWeight="semibold">Privacy Settings</Text>
          </HStack>
        </CardHeader>
        <CardBody>
          <VStack spacing={4} align="stretch">
            <Checkbox
              isChecked={formData.preferences?.privacy?.shareProfile}
              onChange={(e) => handlePreferencesChange('privacy', 'shareProfile', e.target.checked)}
            >
              Share Profile with Other Coaches
            </Checkbox>
            <Checkbox
              isChecked={formData.preferences?.privacy?.allowAnalytics}
              onChange={(e) => handlePreferencesChange('privacy', 'allowAnalytics', e.target.checked)}
            >
              Allow Analytics & Insights
            </Checkbox>
            <Checkbox
              isChecked={formData.preferences?.privacy?.publicPlaybook}
              onChange={(e) => handlePreferencesChange('privacy', 'publicPlaybook', e.target.checked)}
            >
              Make Playbook Public
            </Checkbox>
          </VStack>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <HStack>
            <Icon as={Brain} color="orange.500" />
            <Text fontWeight="semibold">AI Assistant Preferences</Text>
          </HStack>
        </CardHeader>
        <CardBody>
          <VStack spacing={4} align="stretch">
            <Checkbox
              isChecked={formData.preferences?.ai?.autoSuggest}
              onChange={(e) => handlePreferencesChange('ai', 'autoSuggest', e.target.checked)}
            >
              Auto-suggest Practice Plans
            </Checkbox>
            <Checkbox
              isChecked={formData.preferences?.ai?.learningEnabled}
              onChange={(e) => handlePreferencesChange('ai', 'learningEnabled', e.target.checked)}
            >
              Enable AI Learning from Your Preferences
            </Checkbox>
            <FormControl>
              <FormLabel>AI Confidence Threshold</FormLabel>
              <Select
                value={formData.preferences?.ai?.confidenceThreshold || 0.7}
                onChange={(e) => handlePreferencesChange('ai', 'confidenceThreshold', parseFloat(e.target.value))}
              >
                <option value={0.5}>50% - More Suggestions</option>
                <option value={0.7}>70% - Balanced</option>
                <option value={0.9}>90% - High Confidence Only</option>
              </Select>
            </FormControl>
          </VStack>
        </CardBody>
      </Card>
    </VStack>
  );

  const renderStep4 = () => (
    <VStack spacing={6} align="stretch">
      <Heading size="lg" color="gray.800">
        <Icon as={CheckCircle} mr={3} color="green.500" />
        Review & Complete
      </Heading>
      
      <Card>
        <CardHeader>
          <HStack>
            <Avatar name={formData.displayName} size="lg" />
            <VStack align="start" spacing={1}>
              <Text fontSize="xl" fontWeight="bold">{formData.displayName}</Text>
              <Badge colorScheme="blue" variant="subtle">
                {teamRoles.find(r => r.id === formData.role)?.name || 'Coach'}
              </Badge>
            </VStack>
          </HStack>
        </CardHeader>
        <CardBody>
          <VStack spacing={4} align="stretch">
            <HStack justify="space-between">
              <Text fontWeight="medium">Email:</Text>
              <Text>{formData.email}</Text>
            </HStack>
            <HStack justify="space-between">
              <Text fontWeight="medium">Experience:</Text>
              <Text>{formData.experience?.yearsCoaching || 0} years</Text>
            </HStack>
            <HStack justify="space-between">
              <Text fontWeight="medium">Sports:</Text>
              <Text>{formData.experience?.sports?.join(', ') || 'None selected'}</Text>
            </HStack>
            <HStack justify="space-between">
              <Text fontWeight="medium">AI Suggestions:</Text>
              <Text>{formData.preferences?.ai?.autoSuggest ? 'Enabled' : 'Disabled'}</Text>
            </HStack>
          </VStack>
        </CardBody>
      </Card>

      <Alert status="info">
        <AlertIcon />
        <Text>
          You can always update these settings later from your profile page. 
          Your preferences will help us provide a more personalized coaching experience.
        </Text>
      </Alert>
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

  const getStepTitle = (step: number) => {
    switch (step) {
      case 1: return 'Basic Information';
      case 2: return 'Role & Experience';
      case 3: return 'Preferences & Settings';
      case 4: return 'Review & Complete';
      default: return '';
    }
  };

  return (
    <Box maxW="4xl" mx="auto" p={6}>
      <VStack spacing={8} align="stretch">
        {/* Header */}
        <Box textAlign="center">
          <Heading size="2xl" color="gray.800" mb={4}>
            Customize Your Profile
          </Heading>
          <Text fontSize="lg" color="gray.600">
            Let's personalize your Coach Core experience
          </Text>
        </Box>

        {/* Progress Bar */}
        <Box>
          <HStack justify="space-between" mb={2}>
            <Text fontSize="sm" fontWeight="medium">Step {currentStep} of 4</Text>
            <Text fontSize="sm" color="gray.500">{getStepTitle(currentStep)}</Text>
          </HStack>
          <Progress value={(currentStep / 4) * 100} colorScheme="blue" size="lg" borderRadius="full" />
        </Box>

        {/* Step Content */}
        <Card bg={bgColor} border="1px" borderColor={borderColor}>
          <CardBody p={8}>
            {renderCurrentStep()}
          </CardBody>
        </Card>

        {/* Navigation */}
        <HStack justify="space-between">
          <Button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            variant="outline"
            leftIcon={<Icon as={Target} />}
          >
            Previous
          </Button>

          <HStack spacing={4}>
            {currentStep < 4 ? (
              <Button
                onClick={handleNext}
                colorScheme="blue"
                rightIcon={<Icon as={Target} />}
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={handleSave}
                isLoading={isLoading}
                loadingText="Saving..."
                colorScheme="green"
                size="lg"
                leftIcon={<Icon as={Save} />}
              >
                Complete Setup
              </Button>
            )}
          </HStack>
        </HStack>
      </VStack>
    </Box>
  );
};

export default UserProfileCustomization;


