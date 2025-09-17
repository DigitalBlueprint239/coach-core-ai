import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Input,
  Textarea,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  IconButton,
  Tooltip,
  useToast,
  Divider,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Grid,
  GridItem,
} from '@chakra-ui/react';
import { AddIcon, DeleteIcon, ViewIcon, StarIcon } from '@chakra-ui/icons';
import { useBetaEnrollment } from '../../hooks/useFeatureFlags';
import { BetaUser } from '../../services/feature-flags/feature-flag-service';
import secureLogger from '../../utils/secure-logger';

// Beta enrollment form component
export const BetaEnrollmentForm: React.FC = () => {
  const { isEnrolling, enrollmentError, enrollUser, removeUser, getAllBetaUsers } = useBetaEnrollment();
  const [betaUsers, setBetaUsers] = useState<BetaUser[]>([]);
  const [formData, setFormData] = useState({
    userId: '',
    email: '',
    name: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  // Load beta users on mount
  React.useEffect(() => {
    setBetaUsers(getAllBetaUsers());
  }, [getAllBetaUsers]);

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.userId.trim()) {
      newErrors.userId = 'User ID is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      const success = await enrollUser({
        userId: formData.userId.trim(),
        email: formData.email.trim(),
        name: formData.name.trim(),
        notes: formData.notes.trim() || undefined,
      });

      if (success) {
        toast({
          title: 'User enrolled successfully',
          description: `${formData.name} has been enrolled in the beta program`,
          status: 'success',
          duration: 5000,
        });

        // Reset form
        setFormData({ userId: '', email: '', name: '', notes: '' });
        setErrors({});

        // Refresh beta users list
        setBetaUsers(getAllBetaUsers());
      }
    } catch (error) {
      secureLogger.error('Failed to enroll user', { error });
    }
  };

  // Handle user removal
  const handleRemoveUser = async (userId: string) => {
    try {
      const success = await removeUser(userId);
      
      if (success) {
        toast({
          title: 'User removed successfully',
          description: 'User has been removed from the beta program',
          status: 'success',
          duration: 5000,
        });

        // Refresh beta users list
        setBetaUsers(getAllBetaUsers());
      }
    } catch (error) {
      secureLogger.error('Failed to remove user', { error });
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'green';
      case 'inactive': return 'gray';
      case 'suspended': return 'red';
      default: return 'gray';
    }
  };

  // Calculate statistics
  const stats = React.useMemo(() => {
    const total = betaUsers.length;
    const active = betaUsers.filter(user => user.status === 'active').length;
    const totalFeedback = betaUsers.reduce((sum, user) => sum + user.feedbackCount, 0);
    const totalErrors = betaUsers.reduce((sum, user) => sum + user.errorCount, 0);

    return { total, active, totalFeedback, totalErrors };
  }, [betaUsers]);

  return (
    <Box p={6}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <HStack justify="space-between" align="start">
          <VStack align="start" spacing={1}>
            <Heading size="lg" color="gray.800">
              Beta User Management
            </Heading>
            <Text color="gray.600">
              Manage beta users and feature access
            </Text>
          </VStack>
          <Button
            leftIcon={<AddIcon />}
            colorScheme="blue"
            onClick={onOpen}
          >
            Enroll User
          </Button>
        </HStack>

        {/* Statistics */}
        <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={4}>
          <Stat>
            <StatLabel>Total Beta Users</StatLabel>
            <StatNumber>{stats.total}</StatNumber>
            <StatHelpText>
              <StatArrow type="increase" />
              {stats.active} active
            </StatHelpText>
          </Stat>
          <Stat>
            <StatLabel>Total Feedback</StatLabel>
            <StatNumber>{stats.totalFeedback}</StatNumber>
            <StatHelpText>
              <StatArrow type="increase" />
              User feedback
            </StatHelpText>
          </Stat>
          <Stat>
            <StatLabel>Total Errors</StatLabel>
            <StatNumber>{stats.totalErrors}</StatNumber>
            <StatHelpText>
              <StatArrow type="decrease" />
              Error reports
            </StatHelpText>
          </Stat>
        </Grid>

        {/* Error Alert */}
        {enrollmentError && (
          <Alert status="error">
            <AlertIcon />
            <AlertTitle>Enrollment Error</AlertTitle>
            <AlertDescription>{enrollmentError}</AlertDescription>
          </Alert>
        )}

        {/* Beta Users Table */}
        <Card>
          <CardHeader>
            <Heading size="md">Beta Users</Heading>
          </CardHeader>
          <CardBody>
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Status</Th>
                  <Th>Enrolled</Th>
                  <Th>Last Active</Th>
                  <Th>Feedback</Th>
                  <Th>Errors</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {betaUsers.map((user) => (
                  <Tr key={user.userId}>
                    <Td>
                      <VStack align="start" spacing={1}>
                        <Text fontWeight="medium">{user.name}</Text>
                        <Text fontSize="sm" color="gray.500">
                          {user.userId}
                        </Text>
                      </VStack>
                    </Td>
                    <Td>{user.email}</Td>
                    <Td>
                      <Badge colorScheme={getStatusColor(user.status)}>
                        {user.status}
                      </Badge>
                    </Td>
                    <Td>
                      <Text fontSize="sm">
                        {user.enrolledAt.toLocaleDateString()}
                      </Text>
                    </Td>
                    <Td>
                      <Text fontSize="sm">
                        {user.lastActiveAt.toLocaleDateString()}
                      </Text>
                    </Td>
                    <Td>
                      <HStack spacing={1}>
                        <StarIcon color="yellow.500" />
                        <Text fontSize="sm">{user.feedbackCount}</Text>
                      </HStack>
                    </Td>
                    <Td>
                      <Text fontSize="sm" color="red.500">
                        {user.errorCount}
                      </Text>
                    </Td>
                    <Td>
                      <HStack spacing={2}>
                        <Tooltip label="View Details">
                          <IconButton
                            aria-label="View details"
                            icon={<ViewIcon />}
                            size="sm"
                            variant="ghost"
                          />
                        </Tooltip>
                        <Tooltip label="Remove User">
                          <IconButton
                            aria-label="Remove user"
                            icon={<DeleteIcon />}
                            size="sm"
                            variant="ghost"
                            colorScheme="red"
                            onClick={() => handleRemoveUser(user.userId)}
                          />
                        </Tooltip>
                      </HStack>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </CardBody>
        </Card>

        {/* Enrollment Modal */}
        <Modal isOpen={isOpen} onClose={onClose}>
          <ModalOverlay />
          <ModalContent>
            <form onSubmit={handleSubmit}>
              <ModalHeader>Enroll Beta User</ModalHeader>
              <ModalCloseButton />
              <ModalBody>
                <VStack spacing={4}>
                  <FormControl isInvalid={!!errors.userId}>
                    <FormLabel>User ID</FormLabel>
                    <Input
                      value={formData.userId}
                      onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                      placeholder="Enter user ID"
                    />
                    <FormErrorMessage>{errors.userId}</FormErrorMessage>
                  </FormControl>

                  <FormControl isInvalid={!!errors.email}>
                    <FormLabel>Email</FormLabel>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="Enter email address"
                    />
                    <FormErrorMessage>{errors.email}</FormErrorMessage>
                  </FormControl>

                  <FormControl isInvalid={!!errors.name}>
                    <FormLabel>Name</FormLabel>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter full name"
                    />
                    <FormErrorMessage>{errors.name}</FormErrorMessage>
                  </FormControl>

                  <FormControl>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Add any notes about this user"
                      rows={3}
                    />
                  </FormControl>
                </VStack>
              </ModalBody>
              <ModalFooter>
                <Button variant="ghost" mr={3} onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  colorScheme="blue"
                  isLoading={isEnrolling}
                  loadingText="Enrolling..."
                >
                  Enroll User
                </Button>
              </ModalFooter>
            </form>
          </ModalContent>
        </Modal>
      </VStack>
    </Box>
  );
};

export default BetaEnrollmentForm;
