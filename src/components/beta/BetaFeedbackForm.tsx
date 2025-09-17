import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Textarea,
  Select,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useToast,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Badge,
  Divider,
  Text as ChakraText,
  Icon,
} from '@chakra-ui/react';
import { StarIcon } from '@chakra-ui/icons';
import { useBetaUser } from '../../hooks/useFeatureFlags';
import { BetaFeedback } from '../../services/feature-flags/feature-flag-service';
import secureLogger from '../../utils/secure-logger';

// Beta feedback form component
export const BetaFeedbackForm: React.FC = () => {
  const { betaUser, isBetaUser, submitFeedback, getUserFeedback, isLoading } = useBetaUser();
  const [feedback, setFeedback] = useState({
    feature: '',
    feedback: '',
    rating: 5,
    category: 'general' as const,
    priority: 'medium' as const,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [userFeedback, setUserFeedback] = useState<BetaFeedback[]>([]);
  const toast = useToast();

  // Load user feedback on mount
  React.useEffect(() => {
    if (isBetaUser) {
      setUserFeedback(getUserFeedback());
    }
  }, [isBetaUser, getUserFeedback]);

  // Available features
  const availableFeatures = [
    { value: 'playDesigner', label: 'Play Designer' },
    { value: 'dashboard', label: 'Dashboard' },
    { value: 'aiPlayGenerator', label: 'AI Play Generator' },
    { value: 'teamManagement', label: 'Team Management' },
    { value: 'practicePlanner', label: 'Practice Planner' },
    { value: 'betaFeatures', label: 'Beta Features (General)' },
  ];

  // Feedback categories
  const categories = [
    { value: 'bug', label: 'Bug Report' },
    { value: 'feature_request', label: 'Feature Request' },
    { value: 'general', label: 'General Feedback' },
    { value: 'performance', label: 'Performance Issue' },
    { value: 'ui_ux', label: 'UI/UX Feedback' },
  ];

  // Priority levels
  const priorities = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' },
  ];

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!feedback.feature) {
      newErrors.feature = 'Please select a feature';
    }

    if (!feedback.feedback.trim()) {
      newErrors.feedback = 'Feedback is required';
    } else if (feedback.feedback.trim().length < 10) {
      newErrors.feedback = 'Feedback must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      const feedbackId = await submitFeedback(feedback);
      
      if (feedbackId) {
        toast({
          title: 'Feedback submitted successfully',
          description: 'Thank you for your feedback! We\'ll review it soon.',
          status: 'success',
          duration: 5000,
        });

        // Reset form
        setFeedback({
          feature: '',
          feedback: '',
          rating: 5,
          category: 'general',
          priority: 'medium',
        });
        setErrors({});

        // Refresh user feedback
        setUserFeedback(getUserFeedback());
      }
    } catch (error) {
      secureLogger.error('Failed to submit feedback', { error });
      toast({
        title: 'Failed to submit feedback',
        description: 'Please try again later.',
        status: 'error',
        duration: 5000,
      });
    }
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'green';
      case 'medium': return 'yellow';
      case 'high': return 'orange';
      case 'critical': return 'red';
      default: return 'gray';
    }
  };

  // Get category color
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'bug': return 'red';
      case 'feature_request': return 'blue';
      case 'general': return 'gray';
      case 'performance': return 'purple';
      case 'ui_ux': return 'pink';
      default: return 'gray';
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'blue';
      case 'in_progress': return 'yellow';
      case 'resolved': return 'green';
      case 'closed': return 'gray';
      default: return 'gray';
    }
  };

  if (!isBetaUser) {
    return (
      <Box p={6}>
        <Alert status="info">
          <AlertIcon />
          <AlertTitle>Beta Access Required</AlertTitle>
          <AlertDescription>
            You need beta access to submit feedback. Please contact an administrator.
          </AlertDescription>
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={6}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <VStack align="start" spacing={1}>
          <Heading size="lg" color="gray.800">
            Beta Feedback
          </Heading>
          <Text color="gray.600">
            Help us improve Coach Core AI by sharing your feedback
          </Text>
        </VStack>

        {/* User Stats */}
        {betaUser && (
          <Card>
            <CardBody>
              <HStack spacing={6}>
                <VStack align="start" spacing={1}>
                  <Text fontSize="sm" color="gray.500">Beta User</Text>
                  <Text fontWeight="medium">{betaUser.name}</Text>
                </VStack>
                <Divider orientation="vertical" height="40px" />
                <VStack align="start" spacing={1}>
                  <Text fontSize="sm" color="gray.500">Feedback Submitted</Text>
                  <HStack spacing={1}>
                    <Icon as={StarIcon} color="yellow.500" />
                    <Text fontWeight="medium">{betaUser.feedbackCount}</Text>
                  </HStack>
                </VStack>
                <Divider orientation="vertical" height="40px" />
                <VStack align="start" spacing={1}>
                  <Text fontSize="sm" color="gray.500">Enrolled</Text>
                  <Text fontWeight="medium">
                    {betaUser.enrolledAt.toLocaleDateString()}
                  </Text>
                </VStack>
              </HStack>
            </CardBody>
          </Card>
        )}

        {/* Feedback Form */}
        <Card>
          <CardHeader>
            <Heading size="md">Submit Feedback</Heading>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit}>
              <VStack spacing={4}>
                <FormControl isInvalid={!!errors.feature}>
                  <FormLabel>Feature</FormLabel>
                  <Select
                    value={feedback.feature}
                    onChange={(e) => setFeedback({ ...feedback, feature: e.target.value })}
                    placeholder="Select a feature"
                  >
                    {availableFeatures.map((feature) => (
                      <option key={feature.value} value={feature.value}>
                        {feature.label}
                      </option>
                    ))}
                  </Select>
                  <FormErrorMessage>{errors.feature}</FormErrorMessage>
                </FormControl>

                <FormControl isInvalid={!!errors.feedback}>
                  <FormLabel>Feedback</FormLabel>
                  <Textarea
                    value={feedback.feedback}
                    onChange={(e) => setFeedback({ ...feedback, feedback: e.target.value })}
                    placeholder="Describe your experience, report bugs, or suggest improvements..."
                    rows={4}
                  />
                  <FormErrorMessage>{errors.feedback}</FormErrorMessage>
                </FormControl>

                <HStack spacing={4} width="100%">
                  <FormControl>
                    <FormLabel>Rating</FormLabel>
                    <Select
                      value={feedback.rating}
                      onChange={(e) => setFeedback({ ...feedback, rating: parseInt(e.target.value) })}
                    >
                      <option value={1}>1 - Poor</option>
                      <option value={2}>2 - Fair</option>
                      <option value={3}>3 - Good</option>
                      <option value={4}>4 - Very Good</option>
                      <option value={5}>5 - Excellent</option>
                    </Select>
                  </FormControl>

                  <FormControl>
                    <FormLabel>Category</FormLabel>
                    <Select
                      value={feedback.category}
                      onChange={(e) => setFeedback({ ...feedback, category: e.target.value as any })}
                    >
                      {categories.map((category) => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl>
                    <FormLabel>Priority</FormLabel>
                    <Select
                      value={feedback.priority}
                      onChange={(e) => setFeedback({ ...feedback, priority: e.target.value as any })}
                    >
                      {priorities.map((priority) => (
                        <option key={priority.value} value={priority.value}>
                          {priority.label}
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                </HStack>

                <Button
                  type="submit"
                  colorScheme="blue"
                  width="100%"
                  isLoading={isLoading}
                  loadingText="Submitting..."
                >
                  Submit Feedback
                </Button>
              </VStack>
            </form>
          </CardBody>
        </Card>

        {/* Previous Feedback */}
        {userFeedback.length > 0 && (
          <Card>
            <CardHeader>
              <Heading size="md">Your Previous Feedback</Heading>
            </CardHeader>
            <CardBody>
              <VStack spacing={4} align="stretch">
                {userFeedback.map((item) => (
                  <Box
                    key={item.id}
                    p={4}
                    borderWidth="1px"
                    borderRadius="md"
                    borderColor="gray.200"
                  >
                    <VStack align="start" spacing={2}>
                      <HStack justify="space-between" width="100%">
                        <HStack spacing={2}>
                          <Badge colorScheme={getCategoryColor(item.category)}>
                            {item.category}
                          </Badge>
                          <Badge colorScheme={getPriorityColor(item.priority)}>
                            {item.priority}
                          </Badge>
                          <Badge colorScheme={getStatusColor(item.status)}>
                            {item.status}
                          </Badge>
                        </HStack>
                        <Text fontSize="sm" color="gray.500">
                          {item.createdAt.toLocaleDateString()}
                        </Text>
                      </HStack>
                      
                      <Text fontWeight="medium" color="gray.800">
                        {availableFeatures.find(f => f.value === item.feature)?.label || item.feature}
                      </Text>
                      
                      <Text fontSize="sm" color="gray.600">
                        {item.feedback}
                      </Text>
                      
                      <HStack spacing={4}>
                        <HStack spacing={1}>
                          <Icon as={StarIcon} color="yellow.500" />
                          <Text fontSize="sm">{item.rating}/5</Text>
                        </HStack>
                        <Text fontSize="sm" color="gray.500">
                          Rating: {item.rating}/5
                        </Text>
                      </HStack>
                    </VStack>
                  </Box>
                ))}
              </VStack>
            </CardBody>
          </Card>
        )}
      </VStack>
    </Box>
  );
};

export default BetaFeedbackForm;
