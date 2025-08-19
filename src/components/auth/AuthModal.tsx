import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
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
  useToast,
  Box,
  Divider,
  Icon,
  useColorModeValue,
  InputGroup,
  InputRightElement,
  IconButton,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useDisclosure,
  Link,
  Flex,
  Badge,
  Avatar,
  AvatarGroup,
} from '@chakra-ui/react';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Shield,
  Sparkles,
  Users,
  Award,
  Zap,
  Brain,
  Heart,
  Globe,
  Smartphone,
  Monitor,
  CheckCircle,
  ArrowRight,
  Star,
  Trophy,
  Target,
} from 'lucide-react';
import { brandColors } from '../../theme/brandTheme';
import authService from '../../services/firebase/auth-service';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: any) => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onAuthSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [sport, setSport] = useState('football');
  const [ageGroup, setAgeGroup] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const toast = useToast();
  const bgColor = useColorModeValue('white', 'dark.800');
  const borderColor = useColorModeValue('dark.200', 'dark.700');

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Email is invalid';

    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 8) newErrors.password = 'Password must be at least 8 characters';

    if (isSignUp) {
      if (!displayName) newErrors.displayName = 'Display name is required';
      if (!teamName) newErrors.teamName = 'Team name is required';
      if (!ageGroup) newErrors.ageGroup = 'Age group is required';
      if (!confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
      else if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const result = await authService.signInWithGoogle();
      toast({
        title: 'Success!',
        description: 'Signed in with Google successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      onAuthSuccess(result.user);
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to sign in with Google',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setIsLoading(true);
    try {
      const result = await authService.signInWithApple();
      toast({
        title: 'Success!',
        description: 'Signed in with Apple successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      onAuthSuccess(result.user);
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to sign in with Apple',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      if (isSignUp) {
        // Handle sign up
        const result = await authService.signUp(email, password, displayName, teamName, sport, ageGroup);
        toast({
          title: 'Welcome to Coach Core!',
          description: 'Your account has been created successfully!',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        onAuthSuccess(result.user);
        resetForm();
      } else {
        // Handle sign in
        const result = await authService.signIn(email, password);
        toast({
          title: 'Welcome back!',
          description: 'Signed in successfully!',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        onAuthSuccess(result.user);
        resetForm();
      }
      
      onClose();
    } catch (error: any) {
      toast({
        title: 'Authentication failed',
        description: error.message || 'Please try again',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setDisplayName('');
    setTeamName('');
    setSport('football');
    setAgeGroup('');
    setErrors({});
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    resetForm();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" isCentered>
      <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(10px)" />
      <ModalContent
        bg={bgColor}
        border="1px solid"
        borderColor={borderColor}
        borderRadius="3xl"
        overflow="hidden"
        boxShadow="brand-glow-xl"
        maxW="900px"
      >
        {/* Header with Coach Core branding */}
        <Box
          bg="linear-gradient(135deg, dark.800 0%, dark.700 50%, dark.600 100%)"
          position="relative"
          overflow="hidden"
        >
          {/* Animated background elements */}
          <Box
            position="absolute"
            top="-50%"
            left="-50%"
            w="200%"
            h="200%"
            bg="radial-gradient(circle, primary.500 0%, transparent 70%)"
            opacity="0.05"
            animation="pulse 6s ease-in-out infinite"
          />
          
          <ModalHeader
            textAlign="center"
            py={8}
            position="relative"
            zIndex={1}
          >
            <VStack spacing={4}>
              {/* Coach Core Logo */}
              <Box
                w="80px"
                h="80px"
                bg="linear-gradient(135deg, primary.400 0%, primary.500 50%, primary.600 100%)"
                borderRadius="full"
                display="flex"
                alignItems="center"
                justifyContent="center"
                boxShadow="brand-glow-lg"
                position="relative"
              >
                <Box
                  position="absolute"
                  inset="0"
                  borderRadius="full"
                  bg="radial-gradient(circle, primary.300 0%, transparent 70%)"
                  opacity="0.6"
                />
                <Text
                  fontSize="3xl"
                  fontWeight="bold"
                  color="white"
                  textShadow="0 2px 4px rgba(0,0,0,0.3)"
                >
                  C
                </Text>
              </Box>
              
                             <VStack spacing={2}>
                 <Heading
                   size="lg"
                   color="dark.100"
                   fontWeight="800"
                   letterSpacing="wider"
                 >
                   COACH CORE
                 </Heading>
                 <Text
                   color="dark.200"
                   fontSize="sm"
                   fontWeight="500"
                   letterSpacing="wide"
                 >
                   {isSignUp ? 'JOIN THE REVOLUTION' : 'WELCOME BACK'}
                 </Text>
               </VStack>
            </VStack>
          </ModalHeader>
        </Box>

        <ModalCloseButton
          color="white"
          bg="dark.800"
          borderRadius="full"
          _hover={{ bg: 'dark.700' }}
          top={4}
          right={4}
        />

        <ModalBody p={8}>
          <VStack spacing={8} align="stretch">
            {/* Feature highlights */}
            <Box textAlign="center">
              <HStack justify="center" spacing={6} mb={4}>
                <VStack spacing={2}>
                  <Icon as={Brain} boxSize={6} color="primary.500" />
                  <Text fontSize="xs" color="dark.500" fontWeight="500">AI-POWERED</Text>
                </VStack>
                <VStack spacing={2}>
                  <Icon as={Users} boxSize={6} color="inclusive.blue" />
                  <Text fontSize="xs" color="dark.500" fontWeight="500">INCLUSIVE</Text>
                </VStack>
                <VStack spacing={2}>
                  <Icon as={Zap} boxSize={6} color="inclusive.purple" />
                  <Text fontSize="xs" color="dark.500" fontWeight="500">MODERN</Text>
                </VStack>
                <VStack spacing={2}>
                  <Icon as={Globe} boxSize={6} color="inclusive.green" />
                  <Text fontSize="xs" color="dark.500" fontWeight="500">GLOBAL</Text>
                </VStack>
              </HStack>
              
              <Text color="dark.600" fontSize="sm" maxW="400px" mx="auto">
                {isSignUp 
                  ? 'Transform your coaching with AI-powered insights, inclusive design, and modern workflows.'
                  : 'Access your personalized coaching dashboard and continue building champions.'
                }
              </Text>
            </Box>

            {/* Auth Form */}
            <Box as="form" onSubmit={handleSubmit}>
              <VStack spacing={6} align="stretch">
                {isSignUp && (
                  <FormControl isInvalid={!!errors.displayName}>
                    <FormLabel color="dark.700" fontWeight="600">
                      <HStack spacing={2}>
                        <Icon as={User} boxSize={4} color="primary.500" />
                        <Text>Display Name</Text>
                      </HStack>
                    </FormLabel>
                    <Input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Enter your display name"
                      size="lg"
                      borderRadius="xl"
                      border="2px solid"
                      borderColor={errors.displayName ? 'accent.error' : 'dark.300'}
                      _focus={{
                        borderColor: 'primary.500',
                        boxShadow: 'brand-glow',
                      }}
                    />
                    <FormErrorMessage>{errors.displayName}</FormErrorMessage>
                  </FormControl>
                )}

                <FormControl isInvalid={!!errors.email}>
                  <FormLabel color="dark.700" fontWeight="600">
                    <HStack spacing={2}>
                      <Icon as={Mail} boxSize={4} color="primary.500" />
                      <Text>Email Address</Text>
                    </HStack>
                  </FormLabel>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
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

                <FormControl isInvalid={!!errors.password}>
                  <FormLabel color="dark.700" fontWeight="600">
                    <HStack spacing={2}>
                      <Icon as={Lock} boxSize={4} color="primary.500" />
                      <Text>Password</Text>
                    </HStack>
                  </FormLabel>
                  <InputGroup size="lg">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      borderRadius="xl"
                      border="2px solid"
                      borderColor={errors.password ? 'accent.error' : 'dark.300'}
                      _focus={{
                        borderColor: 'primary.500',
                        boxShadow: 'brand-glow',
                      }}
                    />
                    <InputRightElement>
                      <IconButton
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        icon={<Icon as={showPassword ? EyeOff : Eye} />}
                        variant="ghost"
                        onClick={() => setShowPassword(!showPassword)}
                        color="dark.500"
                        _hover={{ color: 'primary.500' }}
                      />
                    </InputRightElement>
                  </InputGroup>
                  <FormErrorMessage>{errors.password}</FormErrorMessage>
                </FormControl>

                {isSignUp && (
                  <FormControl isInvalid={!!errors.confirmPassword}>
                    <FormLabel color="dark.700" fontWeight="600">
                      <HStack spacing={2}>
                        <Icon as={Shield} boxSize={4} color="primary.500" />
                        <Text>Confirm Password</Text>
                      </HStack>
                    </FormLabel>
                    <InputGroup size="lg">
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm your password"
                        borderRadius="xl"
                        border="2px solid"
                        borderColor={errors.confirmPassword ? 'accent.error' : 'dark.300'}
                        _focus={{
                          borderColor: 'primary.500',
                          boxShadow: 'brand-glow',
                        }}
                      />
                      <InputRightElement>
                        <IconButton
                          aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                          icon={<Icon as={showConfirmPassword ? EyeOff : Eye} />}
                          variant="ghost"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          color="dark.500"
                          _hover={{ color: 'primary.500' }}
                        />
                      </InputRightElement>
                    </InputGroup>
                    <FormErrorMessage>{errors.confirmPassword}</FormErrorMessage>
                  </FormControl>
                )}

                {isSignUp && (
                  <FormControl isInvalid={!!errors.teamName}>
                    <FormLabel color="dark.700" fontWeight="600">
                      <HStack spacing={2}>
                        <Icon as={Target} boxSize={4} color="primary.500" />
                        <Text>Team Name</Text>
                      </HStack>
                    </FormLabel>
                    <Input
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="Enter your team name"
                      size="lg"
                      borderRadius="xl"
                      border="2px solid"
                      borderColor={errors.teamName ? 'accent.error' : 'dark.300'}
                      _focus={{
                        borderColor: 'primary.500',
                        boxShadow: 'brand-glow',
                      }}
                    />
                    <FormErrorMessage>{errors.teamName}</FormErrorMessage>
                  </FormControl>
                )}

                {isSignUp && (
                  <FormControl isInvalid={!!errors.sport}>
                    <FormLabel color="dark.700" fontWeight="600">
                      <HStack spacing={2}>
                        <Icon as={Monitor} boxSize={4} color="primary.500" />
                        <Text>Sport</Text>
                      </HStack>
                    </FormLabel>
                    <Input
                      value={sport}
                      onChange={(e) => setSport(e.target.value)}
                      placeholder="Enter your sport"
                      size="lg"
                      borderRadius="xl"
                      border="2px solid"
                      borderColor={errors.sport ? 'accent.error' : 'dark.300'}
                      _focus={{
                        borderColor: 'primary.500',
                        boxShadow: 'brand-glow',
                      }}
                    />
                    <FormErrorMessage>{errors.sport}</FormErrorMessage>
                  </FormControl>
                )}

                {isSignUp && (
                  <FormControl isInvalid={!!errors.ageGroup}>
                    <FormLabel color="dark.700" fontWeight="600">
                      <HStack spacing={2}>
                        <Icon as={Users} boxSize={4} color="primary.500" />
                        <Text>Age Group</Text>
                      </HStack>
                    </FormLabel>
                    <Input
                      value={ageGroup}
                      onChange={(e) => setAgeGroup(e.target.value)}
                      placeholder="Enter your age group"
                      size="lg"
                      borderRadius="xl"
                      border="2px solid"
                      borderColor={errors.ageGroup ? 'accent.error' : 'dark.300'}
                      _focus={{
                        borderColor: 'primary.500',
                        boxShadow: 'brand-glow',
                      }}
                    />
                    <FormErrorMessage>{errors.ageGroup}</FormErrorMessage>
                  </FormControl>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  size="lg"
                  variant="brand-primary"
                  isLoading={isLoading}
                  loadingText={isSignUp ? 'Creating Account...' : 'Signing In...'}
                  rightIcon={<Icon as={ArrowRight} />}
                  py={6}
                  fontSize="lg"
                  fontWeight="700"
                  letterSpacing="wide"
                  boxShadow="brand-glow"
                  _hover={{
                    transform: 'translateY(-3px)',
                    boxShadow: 'brand-glow-lg',
                  }}
                >
                  {isSignUp ? 'CREATE ACCOUNT' : 'SIGN IN'}
                </Button>
              </VStack>
            </Box>

            {/* Divider */}
            <HStack>
              <Divider borderColor="dark.200" />
              <Text color="dark.500" fontSize="sm" fontWeight="500">OR</Text>
              <Divider borderColor="dark.200" />
            </HStack>

            {/* Social Login Options */}
            <VStack spacing={4}>
              <Button
                variant="outline"
                size="lg"
                w="full"
                borderRadius="xl"
                borderColor="inclusive.blue"
                color="inclusive.blue"
                _hover={{
                  bg: 'inclusive.blue',
                  color: 'white',
                  transform: 'translateY(-2px)',
                }}
                leftIcon={<Icon as={Globe} />}
                onClick={handleGoogleSignIn}
                isLoading={isLoading}
                loadingText="Signing in..."
                disabled={isLoading}
              >
                Continue with Google
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                w="full"
                borderRadius="xl"
                borderColor="inclusive.purple"
                color="inclusive.purple"
                _hover={{
                  bg: 'inclusive.purple',
                  color: 'white',
                  transform: 'translateY(-2px)',
                }}
                leftIcon={<Icon as={Smartphone} />}
                onClick={handleAppleSignIn}
                isLoading={isLoading}
                loadingText="Signing in..."
                disabled={isLoading}
              >
                Continue with Apple
              </Button>
            </VStack>

            {/* Toggle Mode */}
            <Box textAlign="center">
              <Text color="dark.600" fontSize="sm">
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              </Text>
              <Button
                variant="link"
                color="primary.500"
                fontWeight="600"
                onClick={toggleMode}
                _hover={{ color: 'primary.600' }}
                size="sm"
              >
                {isSignUp ? 'Sign in instead' : 'Create one now'}
              </Button>
            </Box>

            {/* Trust indicators */}
            <Box textAlign="center" pt={4}>
              <HStack justify="center" spacing={4} mb={3}>
                <HStack spacing={2}>
                  <Icon as={CheckCircle} boxSize={4} color="accent.success" />
                  <Text fontSize="xs" color="dark.500">Secure</Text>
                </HStack>
                <HStack spacing={2}>
                  <Icon as={Heart} boxSize={4} color="accent.error" />
                  <Text fontSize="xs" color="dark.500">Inclusive</Text>
                </HStack>
                <HStack spacing={2}>
                  <Icon as={Trophy} boxSize={4} color="accent.warning" />
                  <Text fontSize="xs" color="dark.500">Proven</Text>
                </HStack>
              </HStack>
              
              <Text fontSize="xs" color="dark.400">
                By continuing, you agree to our Terms of Service and Privacy Policy
              </Text>
            </Box>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default AuthModal;
