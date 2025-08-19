import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Button,
  Input,
  FormControl,
  FormLabel,
  FormHelperText,
  FormErrorMessage,
  Select,
  Textarea,
  Checkbox,
  Card,
  CardBody,
  CardHeader,
  Progress,
  useToast,
  Icon,
  Divider,
  Badge,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from '@chakra-ui/react';
import {
  User,
  Mail,
  Phone,
  Heart,
  Shield,
  FileText,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Save,
  Upload,
} from 'lucide-react';

interface PlayerRegistrationData {
  // Basic Information
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  jerseyNumber: string;
  position: string;
  
  // Contact Information
  email: string;
  phone: string;
  
  // Physical Information
  height: string;
  weight: string;
  jerseySize: string;
  
  // Medical Information
  allergies: string[];
  medications: string[];
  medicalConditions: string[];
  bloodType: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
    email: string;
  };
  
  // Parent/Guardian Information
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  parentAddress: string;
  
  // Academic Information
  school: string;
  grade: string;
  gpa: string;
  
  // Consent & Agreements
  medicalConsent: boolean;
  photoConsent: boolean;
  emergencyConsent: boolean;
  codeOfConduct: boolean;
  
  // Additional Information
  previousExperience: string;
  goals: string;
  notes: string;
}

const PlayerRegistration: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<PlayerRegistrationData>({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    jerseyNumber: '',
    position: '',
    email: '',
    phone: '',
    height: '',
    weight: '',
    jerseySize: '',
    allergies: [],
    medications: [],
    medicalConditions: [],
    bloodType: '',
    emergencyContact: {
      name: '',
      relationship: '',
      phone: '',
      email: '',
    },
    parentName: '',
    parentEmail: '',
    parentPhone: '',
    parentAddress: '',
    school: '',
    grade: '',
    gpa: '',
    medicalConsent: false,
    photoConsent: false,
    emergencyConsent: false,
    codeOfConduct: false,
    previousExperience: '',
    goals: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({
    emergencyName: '',
    emergencyPhone: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  const totalSteps = 5;
  const progress = (currentStep / totalSteps) * 100;

  const updateFormData = (field: keyof PlayerRegistrationData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const updateEmergencyContact = (field: keyof PlayerRegistrationData['emergencyContact'], value: string) => {
    setFormData(prev => ({
      ...prev,
      emergencyContact: {
        ...prev.emergencyContact,
        [field]: value,
      },
    }));
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1: // Basic Information
        if (!formData.firstName) newErrors.firstName = 'First name is required';
        if (!formData.lastName) newErrors.lastName = 'Last name is required';
        if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
        if (!formData.gender) newErrors.gender = 'Gender is required';
        if (!formData.position) newErrors.position = 'Position is required';
        break;
      
      case 2: // Contact & Physical
        if (!formData.email) newErrors.email = 'Email is required';
        if (!formData.phone) newErrors.phone = 'Phone is required';
        if (!formData.height) newErrors.height = 'Height is required';
        if (!formData.weight) newErrors.weight = 'Weight is required';
        break;
      
      case 3: // Medical & Emergency
        if (!formData.emergencyContact.name) newErrors.emergencyName = 'Emergency contact name is required';
        if (!formData.emergencyContact.phone) newErrors.emergencyPhone = 'Emergency contact phone is required';
        if (!formData.bloodType) newErrors.bloodType = 'Blood type is required';
        break;
      
      case 4: // Parent & Academic
        if (!formData.parentName) newErrors.parentName = 'Parent/guardian name is required';
        if (!formData.parentEmail) newErrors.parentEmail = 'Parent/guardian email is required';
        if (!formData.parentPhone) newErrors.parentPhone = 'Parent/guardian phone is required';
        if (!formData.school) newErrors.school = 'School is required';
        if (!formData.grade) newErrors.grade = 'Grade is required';
        break;
      
      case 5: // Consent & Agreements
        if (!formData.medicalConsent) newErrors.medicalConsent = 'Medical consent is required';
        if (!formData.emergencyConsent) newErrors.emergencyConsent = 'Emergency consent is required';
        if (!formData.codeOfConduct) newErrors.codeOfConduct = 'Code of conduct agreement is required';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setIsSubmitting(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: 'Registration Successful!',
        description: `${formData.firstName} ${formData.lastName} has been registered successfully.`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // Reset form or redirect
      setCurrentStep(1);
      setFormData({
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        gender: '',
        jerseyNumber: '',
        position: '',
        email: '',
        phone: '',
        height: '',
        weight: '',
        jerseySize: '',
        allergies: [],
        medications: [],
        medicalConditions: [],
        bloodType: '',
        emergencyContact: {
          name: '',
          relationship: '',
          phone: '',
          email: '',
        },
        parentName: '',
        parentEmail: '',
        parentPhone: '',
        parentAddress: '',
        school: '',
        grade: '',
        gpa: '',
        medicalConsent: false,
        photoConsent: false,
        emergencyConsent: false,
        codeOfConduct: false,
        previousExperience: '',
        goals: '',
        notes: '',
      });
      
    } catch (error) {
      toast({
        title: 'Registration Failed',
        description: 'Please try again or contact support.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep1 = () => (
    <VStack spacing={6} align="stretch">
      <Box textAlign="center" mb={6}>
        <Icon as={User} boxSize={12} color="primary.500" mb={4} />
        <Heading size="lg" color="dark.800" mb={2}>
          Basic Player Information
        </Heading>
        <Text color="dark.600" fontSize="lg">
          Let's start with the essential details about the player.
        </Text>
      </Box>

      <Card>
        <CardHeader>
          <Heading size="md" color="dark.800">
            Personal Details
          </Heading>
        </CardHeader>
        <CardBody>
          <VStack spacing={4}>
            <HStack spacing={4} w="full">
              <FormControl isRequired isInvalid={!!errors.firstName}>
                <FormLabel color="dark.700" fontWeight="600">
                  First Name
                </FormLabel>
                <Input
                  value={formData.firstName}
                  onChange={(e) => updateFormData('firstName', e.target.value)}
                  placeholder="Enter first name"
                  size="lg"
                  borderRadius="xl"
                  border="2px solid"
                  borderColor={errors.firstName ? 'accent.error' : 'dark.300'}
                  _focus={{
                    borderColor: 'primary.500',
                    boxShadow: 'brand-glow',
                  }}
                />
                <FormErrorMessage>{errors.firstName}</FormErrorMessage>
              </FormControl>

              <FormControl isRequired isInvalid={!!errors.lastName}>
                <FormLabel color="dark.700" fontWeight="600">
                  Last Name
                </FormLabel>
                <Input
                  value={formData.lastName}
                  onChange={(e) => updateFormData('lastName', e.target.value)}
                  placeholder="Enter last name"
                  size="lg"
                  borderRadius="xl"
                  border="2px solid"
                  borderColor={errors.lastName ? 'accent.error' : 'dark.300'}
                  _focus={{
                    borderColor: 'primary.500',
                    boxShadow: 'brand-glow',
                  }}
                />
                <FormErrorMessage>{errors.lastName}</FormErrorMessage>
              </FormControl>
            </HStack>

            <HStack spacing={4} w="full">
              <FormControl isRequired isInvalid={!!errors.dateOfBirth}>
                <FormLabel color="dark.700" fontWeight="600">
                  Date of Birth
                </FormLabel>
                <Input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => updateFormData('dateOfBirth', e.target.value)}
                  size="lg"
                  borderRadius="xl"
                  border="2px solid"
                  borderColor={errors.dateOfBirth ? 'accent.error' : 'dark.300'}
                  _focus={{
                    borderColor: 'primary.500',
                    boxShadow: 'brand-glow',
                  }}
                />
                <FormErrorMessage>{errors.dateOfBirth}</FormErrorMessage>
              </FormControl>

              <FormControl isRequired isInvalid={!!errors.gender}>
                <FormLabel color="dark.700" fontWeight="600">
                  Gender
                </FormLabel>
                <Select
                  value={formData.gender}
                  onChange={(e) => updateFormData('gender', e.target.value)}
                  placeholder="Select gender"
                  size="lg"
                  borderRadius="xl"
                  border="2px solid"
                  borderColor={errors.gender ? 'accent.error' : 'dark.300'}
                  _focus={{
                    borderColor: 'primary.500',
                    boxShadow: 'brand-glow',
                  }}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="non-binary">Non-binary</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                </Select>
                <FormErrorMessage>{errors.gender}</FormErrorMessage>
              </FormControl>
            </HStack>

            <HStack spacing={4} w="full">
              <FormControl>
                <FormLabel color="dark.700" fontWeight="600">
                  Jersey Number
                </FormLabel>
                <Input
                  value={formData.jerseyNumber}
                  onChange={(e) => updateFormData('jerseyNumber', e.target.value)}
                  placeholder="e.g., 23"
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

              <FormControl isRequired isInvalid={!!errors.position}>
                <FormLabel color="dark.700" fontWeight="600">
                  Position
                </FormLabel>
                <Select
                  value={formData.position}
                  onChange={(e) => updateFormData('position', e.target.value)}
                  placeholder="Select position"
                  size="lg"
                  borderRadius="xl"
                  border="2px solid"
                  borderColor={errors.position ? 'accent.error' : 'dark.300'}
                  _focus={{
                    borderColor: 'primary.500',
                    boxShadow: 'brand-glow',
                  }}
                >
                  <option value="Forward">Forward</option>
                  <option value="Midfielder">Midfielder</option>
                  <option value="Defender">Defender</option>
                  <option value="Goalkeeper">Goalkeeper</option>
                  <option value="Utility">Utility</option>
                </Select>
                <FormErrorMessage>{errors.position}</FormErrorMessage>
              </FormControl>
            </HStack>
          </VStack>
        </CardBody>
      </Card>
    </VStack>
  );

  const renderStep2 = () => (
    <VStack spacing={6} align="stretch">
      <Box textAlign="center" mb={6}>
        <Icon as={Mail} boxSize={12} color="primary.500" mb={4} />
        <Heading size="lg" color="dark.800" mb={2}>
          Contact & Physical Information
        </Heading>
        <Text color="dark.600" fontSize="lg">
          How can we reach the player and what are their physical characteristics?
        </Text>
      </Box>

      <Card>
        <CardHeader>
          <Heading size="md" color="dark.800">
            Contact Details
          </Heading>
        </CardHeader>
        <CardBody>
          <VStack spacing={4}>
            <HStack spacing={4} w="full">
              <FormControl isRequired isInvalid={!!errors.email}>
                <FormLabel color="dark.700" fontWeight="600">
                  Email Address
                </FormLabel>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateFormData('email', e.target.value)}
                  placeholder="player@email.com"
                  size="lg"
                  borderRadius="xl"
                  border="2px solid"
                  borderColor={errors.email ? 'accent.error' : 'dark.300'}
                  _focus={{
                    borderColor: 'primary.500',
                    boxShadow: 'brand-glow',
                  }}
                />
                <FormErrorMessage>{errors.email}</FormErrorMessage>
              </FormControl>

              <FormControl isRequired isInvalid={!!errors.phone}>
                <FormLabel color="dark.700" fontWeight="600">
                  Phone Number
                </FormLabel>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateFormData('phone', e.target.value)}
                  placeholder="(555) 123-4567"
                  size="lg"
                  borderRadius="xl"
                  border="2px solid"
                  borderColor={errors.phone ? 'accent.error' : 'dark.300'}
                  _focus={{
                    borderColor: 'primary.500',
                    boxShadow: 'brand-glow',
                  }}
                />
                <FormErrorMessage>{errors.phone}</FormErrorMessage>
              </FormControl>
            </HStack>

            <HStack spacing={4} w="full">
              <FormControl isRequired isInvalid={!!errors.height}>
                <FormLabel color="dark.700" fontWeight="600">
                  Height
                </FormLabel>
                <Input
                  value={formData.height}
                  onChange={(e) => updateFormData('height', e.target.value)}
                  placeholder="e.g., 5'8&quot;"
                  size="lg"
                  borderRadius="xl"
                  border="2px solid"
                  borderColor={errors.height ? 'accent.error' : 'dark.300'}
                  _focus={{
                    borderColor: 'primary.500',
                    boxShadow: 'brand-glow',
                  }}
                />
                <FormErrorMessage>{errors.height}</FormErrorMessage>
              </FormControl>

              <FormControl isRequired isInvalid={!!errors.weight}>
                <FormLabel color="dark.700" fontWeight="600">
                  Weight (lbs)
                </FormLabel>
                <Input
                  type="number"
                  value={formData.weight}
                  onChange={(e) => updateFormData('weight', e.target.value)}
                  placeholder="150"
                  size="lg"
                  borderRadius="xl"
                  border="2px solid"
                  borderColor={errors.weight ? 'accent.error' : 'dark.300'}
                  _focus={{
                    borderColor: 'primary.500',
                    boxShadow: 'brand-glow',
                  }}
                />
                <FormErrorMessage>{errors.weight}</FormErrorMessage>
              </FormControl>
            </HStack>

            <FormControl>
              <FormLabel color="dark.700" fontWeight="600">
                Jersey Size
              </FormLabel>
              <Select
                value={formData.jerseySize}
                onChange={(e) => updateFormData('jerseySize', e.target.value)}
                placeholder="Select jersey size"
                size="lg"
                borderRadius="xl"
                border="2px solid"
                borderColor="dark.300"
                _focus={{
                  borderColor: 'primary.500',
                  boxShadow: 'brand-glow',
                }}
              >
                <option value="XS">XS</option>
                <option value="S">S</option>
                <option value="M">M</option>
                <option value="L">L</option>
                <option value="XL">XL</option>
                <option value="XXL">XXL</option>
              </Select>
            </FormControl>
          </VStack>
        </CardBody>
      </Card>
    </VStack>
  );

  const renderStep3 = () => (
    <VStack spacing={6} align="stretch">
      <Box textAlign="center" mb={6}>
        <Icon as={Heart} boxSize={12} color="primary.500" mb={4} />
        <Heading size="lg" color="dark.800" mb={2}>
          Medical & Emergency Information
        </Heading>
        <Text color="dark.600" fontSize="lg">
          Important health details and emergency contact information.
        </Text>
      </Box>

      <Card>
        <CardHeader>
          <Heading size="md" color="dark.800">
            Medical Information
          </Heading>
        </CardHeader>
        <CardBody>
          <VStack spacing={4}>
            <FormControl isRequired isInvalid={!!errors.bloodType}>
              <FormLabel color="dark.700" fontWeight="600">
                Blood Type
              </FormLabel>
              <Select
                value={formData.bloodType}
                onChange={(e) => updateFormData('bloodType', e.target.value)}
                placeholder="Select blood type"
                size="lg"
                borderRadius="xl"
                border="2px solid"
                borderColor={errors.bloodType ? 'accent.error' : 'dark.300'}
                _focus={{
                  borderColor: 'primary.500',
                  boxShadow: 'brand-glow',
                }}
              >
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </Select>
              <FormErrorMessage>{errors.bloodType}</FormErrorMessage>
            </FormControl>

            <FormControl>
              <FormLabel color="dark.700" fontWeight="600">
                Allergies
              </FormLabel>
              <Input
                value={formData.allergies.join(', ')}
                onChange={(e) => updateFormData('allergies', e.target.value.split(',').map(s => s.trim()))}
                placeholder="e.g., Peanuts, Shellfish, Latex"
                size="lg"
                borderRadius="xl"
                border="2px solid"
                borderColor="dark.300"
                _focus={{
                  borderColor: 'primary.500',
                  boxShadow: 'brand-glow',
                }}
              />
              <FormHelperText color="gray.500">
                Separate multiple allergies with commas
              </FormHelperText>
            </FormControl>

            <FormControl>
              <FormLabel color="dark.700" fontWeight="600">
                Current Medications
              </FormLabel>
              <Input
                value={formData.medications.join(', ')}
                onChange={(e) => updateFormData('medications', e.target.value.split(',').map(s => s.trim()))}
                placeholder="e.g., Inhaler, EpiPen"
                size="lg"
                borderRadius="xl"
                border="2px solid"
                borderColor="dark.300"
                _focus={{
                  borderColor: 'primary.500',
                  boxShadow: 'brand-glow',
                }}
              />
              <FormHelperText color="gray.500">
                Separate multiple medications with commas
              </FormHelperText>
            </FormControl>

            <FormControl>
              <FormLabel color="dark.700" fontWeight="600">
                Medical Conditions
              </FormLabel>
              <Textarea
                value={formData.medicalConditions.join(', ')}
                onChange={(e) => updateFormData('medicalConditions', e.target.value.split(',').map(s => s.trim()))}
                placeholder="e.g., Asthma, Diabetes, Heart condition"
                size="lg"
                borderRadius="xl"
                border="2px solid"
                borderColor="dark.300"
                _focus={{
                  borderColor: 'primary.500',
                  boxShadow: 'brand-glow',
                }}
              />
              <FormHelperText color="gray.500">
                Separate multiple conditions with commas
              </FormHelperText>
            </FormControl>
          </VStack>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <Heading size="md" color="dark.800">
            Emergency Contact
          </Heading>
        </CardHeader>
        <CardBody>
          <VStack spacing={4}>
            <HStack spacing={4} w="full">
              <FormControl isRequired isInvalid={!!errors.emergencyName}>
                <FormLabel color="dark.700" fontWeight="600">
                  Emergency Contact Name
                </FormLabel>
                <Input
                  value={formData.emergencyContact.name}
                  onChange={(e) => updateEmergencyContact('name', e.target.value)}
                  placeholder="Full name"
                  size="lg"
                  borderRadius="xl"
                  border="2px solid"
                  borderColor={errors.emergencyName ? 'accent.error' : 'dark.300'}
                  _focus={{
                    borderColor: 'primary.500',
                    boxShadow: 'brand-glow',
                  }}
                />
                <FormErrorMessage>{errors.emergencyName}</FormErrorMessage>
              </FormControl>

              <FormControl>
                <FormLabel color="dark.700" fontWeight="600">
                  Relationship
                </FormLabel>
                <Input
                  value={formData.emergencyContact.relationship}
                  onChange={(e) => updateEmergencyContact('relationship', e.target.value)}
                  placeholder="e.g., Parent, Guardian"
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
            </HStack>

            <HStack spacing={4} w="full">
              <FormControl isRequired isInvalid={!!errors.emergencyPhone}>
                <FormLabel color="dark.700" fontWeight="600">
                  Emergency Contact Phone
                </FormLabel>
                <Input
                  type="tel"
                  value={formData.emergencyContact.phone}
                  onChange={(e) => updateEmergencyContact('phone', e.target.value)}
                  placeholder="(555) 123-4567"
                  size="lg"
                  borderRadius="xl"
                  border="2px solid"
                  borderColor={errors.emergencyPhone ? 'accent.error' : 'dark.300'}
                  _focus={{
                    borderColor: 'primary.500',
                    boxShadow: 'brand-glow',
                  }}
                />
                <FormErrorMessage>{errors.emergencyPhone}</FormErrorMessage>
              </FormControl>

              <FormControl>
                <FormLabel color="dark.700" fontWeight="600">
                  Emergency Contact Email
                </FormLabel>
                <Input
                  type="email"
                  value={formData.emergencyContact.email}
                  onChange={(e) => updateEmergencyContact('email', e.target.value)}
                  placeholder="contact@email.com"
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
            </HStack>
          </VStack>
        </CardBody>
      </Card>
    </VStack>
  );

  const renderStep4 = () => (
    <VStack spacing={6} align="stretch">
      <Box textAlign="center" mb={6}>
        <Icon as={Shield} boxSize={12} color="primary.500" mb={4} />
        <Heading size="lg" color="dark.800" mb={2}>
          Parent/Guardian & Academic Information
        </Heading>
        <Text color="dark.600" fontSize="lg">
          Information about the player's family and educational background.
        </Text>
      </Box>

      <Card>
        <CardHeader>
          <Heading size="md" color="dark.800">
            Parent/Guardian Information
          </Heading>
        </CardHeader>
        <CardBody>
          <VStack spacing={4}>
            <FormControl isRequired isInvalid={!!errors.parentName}>
              <FormLabel color="dark.700" fontWeight="600">
                Parent/Guardian Name
              </FormLabel>
              <Input
                value={formData.parentName}
                onChange={(e) => updateFormData('parentName', e.target.value)}
                placeholder="Full name"
                size="lg"
                borderRadius="xl"
                border="2px solid"
                borderColor={errors.parentName ? 'accent.error' : 'dark.300'}
                _focus={{
                  borderColor: 'primary.500',
                  boxShadow: 'brand-glow',
                }}
              />
              <FormErrorMessage>{errors.parentName}</FormErrorMessage>
            </FormControl>

            <HStack spacing={4} w="full">
              <FormControl isRequired isInvalid={!!errors.parentEmail}>
                <FormLabel color="dark.700" fontWeight="600">
                  Parent/Guardian Email
                </FormLabel>
                <Input
                  type="email"
                  value={formData.parentEmail}
                  onChange={(e) => updateFormData('parentEmail', e.target.value)}
                  placeholder="parent@email.com"
                  size="lg"
                  borderRadius="xl"
                  border="2px solid"
                  borderColor={errors.parentEmail ? 'accent.error' : 'dark.300'}
                  _focus={{
                    borderColor: 'primary.500',
                    boxShadow: 'brand-glow',
                  }}
                />
                <FormErrorMessage>{errors.parentEmail}</FormErrorMessage>
              </FormControl>

              <FormControl isRequired isInvalid={!!errors.parentPhone}>
                <FormLabel color="dark.700" fontWeight="600">
                  Parent/Guardian Phone
                </FormLabel>
                <Input
                  type="tel"
                  value={formData.parentPhone}
                  onChange={(e) => updateFormData('parentPhone', e.target.value)}
                  placeholder="(555) 123-4567"
                  size="lg"
                  borderRadius="xl"
                  border="2px solid"
                  borderColor={errors.parentPhone ? 'accent.error' : 'dark.300'}
                  _focus={{
                    borderColor: 'primary.500',
                    boxShadow: 'brand-glow',
                  }}
                />
                <FormErrorMessage>{errors.parentPhone}</FormErrorMessage>
              </FormControl>
            </HStack>

            <FormControl>
              <FormLabel color="dark.700" fontWeight="600">
                Parent/Guardian Address
              </FormLabel>
              <Textarea
                value={formData.parentAddress}
                onChange={(e) => updateFormData('parentAddress', e.target.value)}
                placeholder="Full address"
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
          </VStack>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <Heading size="md" color="dark.800">
            Academic Information
          </Heading>
        </CardHeader>
        <CardBody>
          <VStack spacing={4}>
            <HStack spacing={4} w="full">
              <FormControl isRequired isInvalid={!!errors.school}>
                <FormLabel color="dark.700" fontWeight="600">
                  School Name
                </FormLabel>
                <Input
                  value={formData.school}
                  onChange={(e) => updateFormData('school', e.target.value)}
                  placeholder="School name"
                  size="lg"
                  borderRadius="xl"
                  border="2px solid"
                  borderColor={errors.school ? 'accent.error' : 'dark.300'}
                  _focus={{
                    borderColor: 'primary.500',
                    boxShadow: 'brand-glow',
                  }}
                />
                <FormErrorMessage>{errors.school}</FormErrorMessage>
              </FormControl>

              <FormControl isRequired isInvalid={!!errors.grade}>
                <FormLabel color="dark.700" fontWeight="600">
                  Grade Level
                </FormLabel>
                <Select
                  value={formData.grade}
                  onChange={(e) => updateFormData('grade', e.target.value)}
                  placeholder="Select grade"
                  size="lg"
                  borderRadius="xl"
                  border="2px solid"
                  borderColor={errors.grade ? 'accent.error' : 'dark.300'}
                  _focus={{
                    borderColor: 'primary.500',
                    boxShadow: 'brand-glow',
                  }}
                >
                  <option value="6th">6th Grade</option>
                  <option value="7th">7th Grade</option>
                  <option value="8th">8th Grade</option>
                  <option value="9th">9th Grade (Freshman)</option>
                  <option value="10th">10th Grade (Sophomore)</option>
                  <option value="11th">11th Grade (Junior)</option>
                  <option value="12th">12th Grade (Senior)</option>
                </Select>
                <FormErrorMessage>{errors.grade}</FormErrorMessage>
              </FormControl>
            </HStack>

            <FormControl>
              <FormLabel color="dark.700" fontWeight="600">
                GPA (if applicable)
              </FormLabel>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="4"
                value={formData.gpa}
                onChange={(e) => updateFormData('gpa', e.target.value)}
                placeholder="e.g., 3.75"
                size="lg"
                borderRadius="xl"
                border="2px solid"
                borderColor="dark.300"
                _focus={{
                  borderColor: 'primary.500',
                  boxShadow: 'brand-glow',
                }}
              />
              <FormHelperText color="gray.500">
                Grade Point Average on a 4.0 scale
              </FormHelperText>
            </FormControl>
          </VStack>
        </CardBody>
      </Card>
    </VStack>
  );

  const renderStep5 = () => (
    <VStack spacing={6} align="stretch">
      <Box textAlign="center" mb={6}>
        <Icon as={FileText} boxSize={12} color="primary.500" mb={4} />
        <Heading size="lg" color="dark.800" mb={2}>
          Consent & Additional Information
        </Heading>
        <Text color="dark.600" fontSize="lg">
          Final agreements and any additional details about the player.
        </Text>
      </Box>

      <Card>
        <CardHeader>
          <Heading size="md" color="dark.800">
            Required Consents & Agreements
          </Heading>
        </CardHeader>
        <CardBody>
          <VStack spacing={4} align="stretch">
            <FormControl isRequired isInvalid={!!errors.medicalConsent}>
              <FormControl display="flex" alignItems="start">
                <Checkbox
                  isChecked={formData.medicalConsent}
                  onChange={(e) => updateFormData('medicalConsent', e.target.checked)}
                  colorScheme="primary"
                  size="lg"
                />
                <Box ml={3}>
                  <FormLabel color="dark.700" fontWeight="600" mb={1}>
                    Medical Treatment Consent
                  </FormLabel>
                  <Text color="dark.600" fontSize="sm">
                    I authorize emergency medical treatment for my child if necessary and I cannot be reached.
                  </Text>
                </Box>
              </FormControl>
              <FormErrorMessage>{errors.medicalConsent}</FormErrorMessage>
            </FormControl>

            <FormControl>
              <FormControl display="flex" alignItems="start">
                <Checkbox
                  isChecked={formData.photoConsent}
                  onChange={(e) => updateFormData('photoConsent', e.target.checked)}
                  colorScheme="primary"
                  size="lg"
                />
                <Box ml={3}>
                  <FormLabel color="dark.700" fontWeight="600" mb={1}>
                    Photo & Video Consent
                  </FormLabel>
                  <Text color="dark.600" fontSize="sm">
                    I consent to my child's photo/video being used for team publicity and social media.
                  </Text>
                </Box>
              </FormControl>
            </FormControl>

            <FormControl isRequired isInvalid={!!errors.emergencyConsent}>
              <FormControl display="flex" alignItems="start">
                <Checkbox
                  isChecked={formData.emergencyConsent}
                  onChange={(e) => updateFormData('emergencyConsent', e.target.checked)}
                  colorScheme="primary"
                  size="lg"
                />
                <Box ml={3}>
                  <FormLabel color="dark.700" fontWeight="600" mb={1}>
                    Emergency Contact Consent
                  </FormLabel>
                  <Text color="dark.600" fontSize="sm">
                    I authorize the team to contact emergency services and emergency contacts if needed.
                  </Text>
                </Box>
              </FormControl>
              <FormErrorMessage>{errors.emergencyConsent}</FormErrorMessage>
            </FormControl>

            <FormControl isRequired isInvalid={!!errors.codeOfConduct}>
              <FormControl display="flex" alignItems="start">
                <Checkbox
                  isChecked={formData.codeOfConduct}
                  onChange={(e) => updateFormData('codeOfConduct', e.target.checked)}
                  colorScheme="primary"
                  size="lg"
                />
                <Box ml={3}>
                  <FormLabel color="dark.700" fontWeight="600" mb={1}>
                    Code of Conduct Agreement
                  </FormLabel>
                  <Text color="dark.600" fontSize="sm">
                    I have read and agree to the team's code of conduct and behavioral expectations.
                  </Text>
                </Box>
              </FormControl>
              <FormErrorMessage>{errors.codeOfConduct}</FormErrorMessage>
            </FormControl>
          </VStack>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <Heading size="md" color="dark.800">
            Additional Information
          </Heading>
        </CardHeader>
        <CardBody>
          <VStack spacing={4}>
            <FormControl>
              <FormLabel color="dark.700" fontWeight="600">
                Previous Sports Experience
              </FormLabel>
              <Textarea
                value={formData.previousExperience}
                onChange={(e) => updateFormData('previousExperience', e.target.value)}
                placeholder="Describe any previous sports experience, teams, or achievements"
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
                Goals & Objectives
              </FormLabel>
              <Textarea
                value={formData.goals}
                onChange={(e) => updateFormData('goals', e.target.value)}
                placeholder="What does the player hope to achieve this season?"
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
                Additional Notes
              </FormLabel>
              <Textarea
                value={formData.notes}
                onChange={(e) => updateFormData('notes', e.target.value)}
                placeholder="Any other information coaches should know"
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
          </VStack>
        </CardBody>
      </Card>
    </VStack>
  );

  return (
    <Box minH="100vh" bg="dark.50" p={6}>
      {/* Progress Header */}
      <Box mb={8}>
        <VStack spacing={4}>
          <Heading size="xl" color="dark.800" textAlign="center">
            Player Registration
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
            maxW="800px"
            bg="dark.200"
          />
        </VStack>
      </Box>

              {/* Step Content */}
        <Box maxW="900px" mx="auto">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
          {currentStep === 5 && renderStep5()}
        </Box>

      {/* Navigation */}
      <Box mt={8} textAlign="center">
        <HStack justify="center" spacing={4}>
          {currentStep > 1 && (
            <Button
              variant="outline"
              size="lg"
              onClick={handleBack}
              leftIcon={<Icon as={ArrowLeft} />}
              color="dark.600"
              borderColor="dark.300"
              px={8}
            >
              Back
            </Button>
          )}

          {currentStep < totalSteps ? (
            <Button
              variant="brand-primary"
              size="lg"
              onClick={handleNext}
              rightIcon={<Icon as={ArrowRight} />}
              boxShadow="brand-glow"
              px={8}
            >
              Continue
            </Button>
          ) : (
            <Button
              variant="brand-primary"
              size="lg"
              onClick={handleSubmit}
              isLoading={isSubmitting}
              loadingText="Submitting..."
              rightIcon={<Icon as={Save} />}
              boxShadow="brand-glow"
              px={8}
              _hover={{
                transform: 'translateY(-2px)',
                boxShadow: 'brand-glow-lg',
              }}
            >
              Complete Registration
            </Button>
          )}
        </HStack>
      </Box>
    </Box>
  );
};

export default PlayerRegistration;
