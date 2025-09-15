import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Input,
  FormControl,
  FormLabel,
  FormErrorMessage,
  useToast,
  Container,
  Card,
  CardBody,
  CardHeader,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Divider,
  Icon,
  InputGroup,
  InputRightElement,
  Checkbox,
  Link as ChakraLink,
} from '@chakra-ui/react';
import { Eye, EyeOff, Mail, Lock, User, Users, Trophy } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../../services/firebase/auth-service';

const LoginPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Sign in state
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signInErrors, setSignInErrors] = useState<{ [key: string]: string }>(
    {}
  );

  // Sign up state
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [signUpDisplayName, setSignUpDisplayName] = useState('');
  const [signUpTeamName, setSignUpTeamName] = useState('');
  const [signUpSport, setSignUpSport] = useState('football');
  const [signUpAgeGroup, setSignUpAgeGroup] = useState('u12');
  const [signUpErrors, setSignUpErrors] = useState<{ [key: string]: string }>(
    {}
  );

  const toast = useToast();
  const navigate = useNavigate();

  const validateSignIn = () => {
    const errors: { [key: string]: string } = {};

    if (!signInEmail) errors.email = 'Email is required';
    if (!signInPassword) errors.password = 'Password is required';

    setSignInErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateSignUp = () => {
    const errors: { [key: string]: string } = {};

    if (!signUpEmail) errors.email = 'Email is required';
    if (!signUpPassword) errors.password = 'Password is required';
    if (signUpPassword.length < 8)
      errors.password = 'Password must be at least 8 characters';
    if (signUpPassword !== signUpConfirmPassword)
      errors.confirmPassword = 'Passwords do not match';
    if (!signUpDisplayName) errors.displayName = 'Name is required';
    if (!signUpTeamName) errors.teamName = 'Team name is required';

    setSignUpErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateSignIn()) return;

    setIsLoading(true);
    try {
      await authService.signIn(signInEmail, signInPassword);
      toast({
        title: 'Welcome back!',
        description: 'Successfully signed in',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      navigate('/');
    } catch (error: any) {
      toast({
        title: 'Sign in failed',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateSignUp()) return;

    setIsLoading(true);
    try {
      await authService.signUp(
        signUpEmail,
        signUpPassword,
        signUpDisplayName,
        signUpTeamName,
        signUpSport,
        signUpAgeGroup
      );
      toast({
        title: 'Account created!',
        description: 'Welcome to Coach Core AI',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      navigate('/');
    } catch (error: any) {
      toast({
        title: 'Sign up failed',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await authService.signInWithGoogle();
      toast({
        title: 'Welcome!',
        description: 'Successfully signed in with Google',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      navigate('/');
    } catch (error: any) {
      toast({
        title: 'Google sign in failed',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box minH="100vh" bg="gray.50" py={10}>
      <Container maxW="md">
        <VStack spacing={8}>
          {/* Header */}
          <VStack spacing={4} textAlign="center">
            <Link to="/">
              <Heading size="xl" color="brand.600">
                Coach Core AI
              </Heading>
            </Link>
            <Text color="gray.600">
              Sign in to your account or create a new one
            </Text>
          </VStack>

          {/* Auth Tabs */}
          <Card w="full" shadow="lg">
            <CardHeader pb={0}>
              <Tabs
                index={activeTab}
                onChange={setActiveTab}
                variant="enclosed"
              >
                <TabList>
                  <Tab flex={1}>Sign In</Tab>
                  <Tab flex={1}>Sign Up</Tab>
                </TabList>
              </Tabs>
            </CardHeader>

            <CardBody>
              <Tabs
                index={activeTab}
                onChange={setActiveTab}
                variant="unstyled"
              >
                <TabPanels>
                  {/* Sign In Tab */}
                  <TabPanel p={0}>
                    <VStack spacing={6} as="form" onSubmit={handleSignIn}>
                      <FormControl isInvalid={!!signInErrors.email}>
                        <FormLabel>Email</FormLabel>
                        <InputGroup>
                          <Input
                            type="email"
                            placeholder="Enter your email"
                            value={signInEmail}
                            onChange={e => setSignInEmail(e.target.value)}
                            leftIcon={<Icon as={Mail} />}
                          />
                        </InputGroup>
                        <FormErrorMessage>
                          {signInErrors.email}
                        </FormErrorMessage>
                      </FormControl>

                      <FormControl isInvalid={!!signInErrors.password}>
                        <FormLabel>Password</FormLabel>
                        <InputGroup>
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Enter your password"
                            value={signInPassword}
                            onChange={e => setSignInPassword(e.target.value)}
                            leftIcon={<Icon as={Lock} />}
                          />
                          <InputRightElement>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              <Icon as={showPassword ? EyeOff : Eye} />
                            </Button>
                          </InputRightElement>
                        </InputGroup>
                        <FormErrorMessage>
                          {signInErrors.password}
                        </FormErrorMessage>
                      </FormControl>

                      <Button
                        type="submit"
                        colorScheme="brand"
                        size="lg"
                        w="full"
                        isLoading={isLoading}
                      >
                        Sign In
                      </Button>
                    </VStack>
                  </TabPanel>

                  {/* Sign Up Tab */}
                  <TabPanel p={0}>
                    <VStack spacing={6} as="form" onSubmit={handleSignUp}>
                      <FormControl isInvalid={!!signUpErrors.displayName}>
                        <FormLabel>Full Name</FormLabel>
                        <InputGroup>
                          <Input
                            type="text"
                            placeholder="Enter your full name"
                            value={signUpDisplayName}
                            onChange={e => setSignUpDisplayName(e.target.value)}
                            leftIcon={<Icon as={User} />}
                          />
                        </InputGroup>
                        <FormErrorMessage>
                          {signUpErrors.displayName}
                        </FormErrorMessage>
                      </FormControl>

                      <FormControl isInvalid={!!signUpErrors.email}>
                        <FormLabel>Email</FormLabel>
                        <InputGroup>
                          <Input
                            type="email"
                            placeholder="Enter your email"
                            value={signUpEmail}
                            onChange={e => setSignUpEmail(e.target.value)}
                            leftIcon={<Icon as={Mail} />}
                          />
                        </InputGroup>
                        <FormErrorMessage>
                          {signUpErrors.email}
                        </FormErrorMessage>
                      </FormControl>

                      <FormControl isInvalid={!!signUpErrors.teamName}>
                        <FormLabel>Team Name</FormLabel>
                        <InputGroup>
                          <Input
                            type="text"
                            placeholder="Enter your team name"
                            value={signUpTeamName}
                            onChange={e => setSignUpTeamName(e.target.value)}
                            leftIcon={<Icon as={Users} />}
                          />
                        </InputGroup>
                        <FormErrorMessage>
                          {signUpErrors.teamName}
                        </FormErrorMessage>
                      </FormControl>

                      <HStack spacing={4} w="full">
                        <FormControl>
                          <FormLabel>Sport</FormLabel>
                          <Input
                            as="select"
                            value={signUpSport}
                            onChange={e => setSignUpSport(e.target.value)}
                          >
                            <option value="football">Football</option>
                            <option value="basketball">Basketball</option>
                            <option value="soccer">Soccer</option>
                            <option value="baseball">Baseball</option>
                            <option value="hockey">Hockey</option>
                          </Input>
                        </FormControl>

                        <FormControl>
                          <FormLabel>Age Group</FormLabel>
                          <Input
                            as="select"
                            value={signUpAgeGroup}
                            onChange={e => setSignUpAgeGroup(e.target.value)}
                          >
                            <option value="u8">Under 8</option>
                            <option value="u10">Under 10</option>
                            <option value="u12">Under 12</option>
                            <option value="u14">Under 14</option>
                            <option value="u16">Under 16</option>
                            <option value="u18">Under 18</option>
                            <option value="varsity">Varsity</option>
                          </Input>
                        </FormControl>
                      </HStack>

                      <FormControl isInvalid={!!signUpErrors.password}>
                        <FormLabel>Password</FormLabel>
                        <InputGroup>
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Create a password"
                            value={signUpPassword}
                            onChange={e => setSignUpPassword(e.target.value)}
                            leftIcon={<Icon as={Lock} />}
                          />
                          <InputRightElement>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              <Icon as={showPassword ? EyeOff : Eye} />
                            </Button>
                          </InputRightElement>
                        </InputGroup>
                        <FormErrorMessage>
                          {signUpErrors.password}
                        </FormErrorMessage>
                      </FormControl>

                      <FormControl isInvalid={!!signUpErrors.confirmPassword}>
                        <FormLabel>Confirm Password</FormLabel>
                        <InputGroup>
                          <Input
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="Confirm your password"
                            value={signUpConfirmPassword}
                            onChange={e =>
                              setSignUpConfirmPassword(e.target.value)
                            }
                            leftIcon={<Icon as={Lock} />}
                          />
                          <InputRightElement>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setShowConfirmPassword(!showConfirmPassword)
                              }
                            >
                              <Icon as={showConfirmPassword ? EyeOff : Eye} />
                            </Button>
                          </InputRightElement>
                        </InputGroup>
                        <FormErrorMessage>
                          {signUpErrors.confirmPassword}
                        </FormErrorMessage>
                      </FormControl>

                      <Button
                        type="submit"
                        colorScheme="brand"
                        size="lg"
                        w="full"
                        isLoading={isLoading}
                      >
                        Create Account
                      </Button>
                    </VStack>
                  </TabPanel>
                </TabPanels>
              </Tabs>

              {/* Divider */}
              <VStack spacing={4} mt={6}>
                <Divider />
                <Text fontSize="sm" color="gray.500">
                  Or continue with
                </Text>

                <Button
                  variant="outline"
                  size="lg"
                  w="full"
                  onClick={handleGoogleSignIn}
                  isLoading={isLoading}
                >
                  <Icon as={Trophy} mr={2} />
                  Sign in with Google
                </Button>
              </VStack>
            </CardBody>
          </Card>

          {/* Footer */}
          <VStack spacing={4} textAlign="center">
            <Text fontSize="sm" color="gray.500">
              By signing up, you agree to our{' '}
              <ChakraLink color="brand.600" href="#">
                Terms of Service
              </ChakraLink>{' '}
              and{' '}
              <ChakraLink color="brand.600" href="#">
                Privacy Policy
              </ChakraLink>
            </Text>

            <Text fontSize="sm" color="gray.500">
              Already have an account?{' '}
              <ChakraLink
                color="brand.600"
                onClick={() => setActiveTab(0)}
                cursor="pointer"
              >
                Sign in here
              </ChakraLink>
            </Text>
          </VStack>
        </VStack>
      </Container>
    </Box>
  );
};

export default LoginPage;
