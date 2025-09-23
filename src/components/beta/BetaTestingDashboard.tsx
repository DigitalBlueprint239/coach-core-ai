import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  FormControl,
  FormLabel,
  Input,
  Select,
  Textarea,
  Switch,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useToast,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Grid,
  Divider,
  IconButton,
  Tooltip,
} from '@chakra-ui/react';
import { AddIcon, EditIcon, DeleteIcon } from '@chakra-ui/icons';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { useBetaFeedback } from '../../hooks/useUserBehavior';
import { BetaUser, featureFlagService } from '../../services/feature-flags/feature-flag-service';
import secureLogger from '../../utils/secure-logger';

// Beta testing dashboard component
export const BetaTestingDashboard: React.FC = () => {
  const { isFeatureEnabled } = useFeatureFlags();
  const { submitFeedback } = useBetaFeedback();
  
  const [selectedUser, setSelectedUser] = useState<BetaUser | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<BetaUser>>({});
  const [betaUsers, setBetaUsers] = useState<BetaUser[]>([]);
  const [feedbackData, setFeedbackData] = useState({
    feature: '',
    rating: 5,
    feedback: '',
    category: 'general' as 'bug' | 'feature_request' | 'general' | 'improvement',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
  });
  
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  // Available features for beta testing
  const availableFeatures = [
    'enablePlayDesigner',
    'enableAdvancedDashboard',
    'enableAIBrain',
    'enableTeamManagement',
    'enablePracticePlanner',
    'enableGameCalendar',
    'enablePerformanceDashboard',
  ];

  // Load beta users on component mount
  useEffect(() => {
    const loadBetaUsers = () => {
      const users = featureFlagService.getAllBetaUsers();
      setBetaUsers(users);
    };
    
    loadBetaUsers();
  }, []);

  // Helper functions using featureFlagService
  const addBetaUser = (userData: Omit<BetaUser, 'enrolledAt' | 'lastActiveAt' | 'joinedAt' | 'feedbackCount' | 'errorCount' | 'featuresUsed'>) => {
    featureFlagService.addBetaUser(userData);
    setBetaUsers(featureFlagService.getAllBetaUsers());
  };

  const updateBetaUser = (uid: string, updates: Partial<BetaUser>) => {
    featureFlagService.updateBetaUser(uid, updates);
    setBetaUsers(featureFlagService.getAllBetaUsers());
  };

  const removeBetaUser = (uid: string) => {
    featureFlagService.removeBetaUser(uid);
    setBetaUsers(featureFlagService.getAllBetaUsers());
  };

  // Handle add/edit user
  const handleSaveUser = () => {
    try {
      if (isEditing && selectedUser) {
        updateBetaUser(selectedUser.uid, formData);
        toast({
          title: 'User updated successfully',
          status: 'success',
          duration: 3000,
        });
      } else {
        addBetaUser(formData as Omit<BetaUser, 'joinedAt' | 'lastActiveAt'>);
        toast({
          title: 'User added successfully',
          status: 'success',
          duration: 3000,
        });
      }
      
      setSelectedUser(null);
      setIsEditing(false);
      setFormData({});
      onClose();
    } catch (error) {
      secureLogger.error('Failed to save user', { error });
      toast({
        title: 'Failed to save user',
        status: 'error',
        duration: 3000,
      });
    }
  };

  // Handle delete user
  const handleDeleteUser = (userId: string) => {
    try {
      removeBetaUser(userId);
      toast({
        title: 'User removed successfully',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      secureLogger.error('Failed to delete user', { error });
      toast({
        title: 'Failed to delete user',
        status: 'error',
        duration: 3000,
      });
    }
  };

  // Handle edit user
  const handleEditUser = (user: BetaUser) => {
    setSelectedUser(user);
    setIsEditing(true);
    setFormData(user);
    onOpen();
  };

  // Handle add new user
  const handleAddUser = () => {
    setSelectedUser(null);
    setIsEditing(false);
    setFormData({});
    onOpen();
  };

  // Handle feedback submission
  const handleSubmitFeedback = () => {
    try {
      submitFeedback(feedbackData);
      toast({
        title: 'Feedback submitted successfully',
        status: 'success',
        duration: 3000,
      });
      setFeedbackData({
        feature: '',
        rating: 5,
        feedback: '',
        category: 'general',
        priority: 'medium',
      });
    } catch (error) {
      secureLogger.error('Failed to submit feedback', { error });
      toast({
        title: 'Failed to submit feedback',
        status: 'error',
        duration: 3000,
      });
    }
  };

  // Get feature status
  const getFeatureStatus = (feature: string) => {
    return isFeatureEnabled(feature) ? 'Enabled' : 'Disabled';
  };

  // Get user role color
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'red';
      case 'coach': return 'blue';
      case 'tester': return 'green';
      default: return 'gray';
    }
  };

  return (
    <Box p={6} maxW="1200px" mx="auto">
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <HStack justify="space-between">
          <Text fontSize="2xl" fontWeight="bold">Beta Testing Dashboard</Text>
          <Button leftIcon={<AddIcon />} colorScheme="blue" onClick={handleAddUser}>
            Add Beta User
          </Button>
        </HStack>

        {/* Stats */}
        <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={4}>
          <Stat>
            <StatLabel>Total Beta Users</StatLabel>
            <StatNumber>{betaUsers.length}</StatNumber>
            <StatHelpText>
              <StatArrow type="increase" />
              Active testers
            </StatHelpText>
          </Stat>
          <Stat>
            <StatLabel>Active Features</StatLabel>
            <StatNumber>
              {availableFeatures.filter(feature => isFeatureEnabled(feature)).length}
            </StatNumber>
            <StatHelpText>Out of {availableFeatures.length} features</StatHelpText>
          </Stat>
          <Stat>
            <StatLabel>Admin Users</StatLabel>
            <StatNumber>{betaUsers.filter(user => user.role === 'admin').length}</StatNumber>
            <StatHelpText>Full access</StatHelpText>
          </Stat>
        </Grid>

        <Divider />

        {/* Tabs */}
        <Tabs>
          <TabList>
            <Tab>Beta Users</Tab>
            <Tab>Feature Status</Tab>
            <Tab>Feedback</Tab>
          </TabList>

          <TabPanels>
            {/* Beta Users Tab */}
            <TabPanel>
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Name</Th>
                    <Th>Email</Th>
                    <Th>Role</Th>
                    <Th>Features</Th>
                    <Th>Joined</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {betaUsers.map((user) => (
                    <Tr key={user.uid}>
                      <Td>{user.name}</Td>
                      <Td>{user.email}</Td>
                      <Td>
                        <Badge colorScheme={getRoleColor(user.role)}>
                          {user.role}
                        </Badge>
                      </Td>
                      <Td>
                        <VStack align="start" spacing={1}>
                          {user.features.map((feature) => (
                            <Badge key={feature} size="sm" colorScheme="green">
                              {feature}
                            </Badge>
                          ))}
                        </VStack>
                      </Td>
                      <Td>{new Date(user.joinedAt).toLocaleDateString()}</Td>
                      <Td>
                        <HStack spacing={2}>
                          <Tooltip label="Edit User">
                            <IconButton
                              aria-label="Edit user"
                              icon={<EditIcon />}
                              size="sm"
                              onClick={() => handleEditUser(user)}
                            />
                          </Tooltip>
                          <Tooltip label="Delete User">
                            <IconButton
                              aria-label="Delete user"
                              icon={<DeleteIcon />}
                              size="sm"
                              colorScheme="red"
                              onClick={() => handleDeleteUser(user.uid)}
                            />
                          </Tooltip>
                        </HStack>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TabPanel>

            {/* Feature Status Tab */}
            <TabPanel>
              <VStack spacing={4} align="stretch">
                {availableFeatures.map((feature) => (
                  <HStack key={feature} justify="space-between" p={4} border="1px" borderColor="gray.200" borderRadius="md">
                    <VStack align="start" spacing={1}>
                      <Text fontWeight="medium">{feature}</Text>
                      <Text fontSize="sm" color="gray.600">
                        {getFeatureStatus(feature)}
                      </Text>
                    </VStack>
                    <Badge colorScheme={isFeatureEnabled(feature) ? 'green' : 'red'}>
                      {getFeatureStatus(feature)}
                    </Badge>
                  </HStack>
                ))}
              </VStack>
            </TabPanel>

            {/* Feedback Tab */}
            <TabPanel>
              <VStack spacing={4} align="stretch">
                <Alert status="info">
                  <AlertIcon />
                  <AlertTitle>Beta Feedback</AlertTitle>
                  <AlertDescription>
                    Submit feedback about beta features to help improve the application.
                  </AlertDescription>
                </Alert>

                <FormControl>
                  <FormLabel>Feature</FormLabel>
                  <Select
                    value={feedbackData.feature}
                    onChange={(e) => setFeedbackData({ ...feedbackData, feature: e.target.value })}
                  >
                    <option value="">Select a feature</option>
                    {availableFeatures.map((feature) => (
                      <option key={feature} value={feature}>
                        {feature}
                      </option>
                    ))}
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>Rating (1-5)</FormLabel>
                  <Select
                    value={feedbackData.rating}
                    onChange={(e) => setFeedbackData({ ...feedbackData, rating: parseInt(e.target.value) })}
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
                    value={feedbackData.category}
                    onChange={(e) => setFeedbackData({ ...feedbackData, category: e.target.value as 'bug' | 'feature_request' | 'general' | 'improvement' })}
                  >
                    <option value="general">General Feedback</option>
                    <option value="bug">Bug Report</option>
                    <option value="feature_request">Feature Request</option>
                    <option value="improvement">Improvement Suggestion</option>
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>Priority</FormLabel>
                  <Select
                    value={feedbackData.priority}
                    onChange={(e) => setFeedbackData({ ...feedbackData, priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent' })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>Feedback</FormLabel>
                  <Textarea
                    value={feedbackData.feedback}
                    onChange={(e) => setFeedbackData({ ...feedbackData, feedback: e.target.value })}
                    placeholder="Describe your feedback, suggestions, or report bugs..."
                    rows={4}
                  />
                </FormControl>

                <Button colorScheme="blue" onClick={handleSubmitFeedback}>
                  Submit Feedback
                </Button>
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>

        {/* Add/Edit User Modal */}
        <Modal isOpen={isOpen} onClose={onClose} size="xl">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>
              {isEditing ? 'Edit Beta User' : 'Add Beta User'}
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={4}>
                <FormControl>
                  <FormLabel>Name</FormLabel>
                  <Input
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter user name"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Email</FormLabel>
                  <Input
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Enter user email"
                    type="email"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Role</FormLabel>
                  <Select
                    value={formData.role || ''}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'coach' | 'tester' })}
                  >
                    <option value="">Select role</option>
                    <option value="coach">Coach</option>
                    <option value="admin">Admin</option>
                    <option value="tester">Tester</option>
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>Team ID (Optional)</FormLabel>
                  <Input
                    value={formData.teamId || ''}
                    onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
                    placeholder="Enter team ID"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Sport (Optional)</FormLabel>
                  <Input
                    value={formData.sport || ''}
                    onChange={(e) => setFormData({ ...formData, sport: e.target.value })}
                    placeholder="Enter sport"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Age Group (Optional)</FormLabel>
                  <Input
                    value={formData.ageGroup || ''}
                    onChange={(e) => setFormData({ ...formData, ageGroup: e.target.value })}
                    placeholder="Enter age group"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Features</FormLabel>
                  <VStack align="start" spacing={2}>
                    {availableFeatures.map((feature) => (
                      <HStack key={feature} justify="space-between" w="full">
                        <Text fontSize="sm">{feature}</Text>
                        <Switch
                          isChecked={formData.features?.includes(feature) || false}
                          onChange={(e) => {
                            const features = formData.features || [];
                            if (e.target.checked) {
                              setFormData({ ...formData, features: [...features, feature] });
                            } else {
                              setFormData({ ...formData, features: features.filter(f => f !== feature) });
                            }
                          }}
                        />
                      </HStack>
                    ))}
                  </VStack>
                </FormControl>

                <FormControl>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <Textarea
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Enter notes about this user"
                    rows={3}
                  />
                </FormControl>

                <HStack spacing={4} w="full">
                  <Button onClick={onClose} flex={1}>
                    Cancel
                  </Button>
                  <Button colorScheme="blue" onClick={handleSaveUser} flex={1}>
                    {isEditing ? 'Update User' : 'Add User'}
                  </Button>
                </HStack>
              </VStack>
            </ModalBody>
          </ModalContent>
        </Modal>
      </VStack>
    </Box>
  );
};

export default BetaTestingDashboard;
