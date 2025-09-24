import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Input,
  Select,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  useColorModeValue,
  Spinner,
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
  FormControl,
  FormLabel,
  Textarea,
  Switch,
  Divider,
  Flex,
  Icon,
  Tooltip,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useToast,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Card,
  CardBody,
  CardHeader,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Progress,
} from '@chakra-ui/react';
import {
  Search,
  Filter,
  Download,
  Mail,
  UserPlus,
  UserMinus,
  Edit,
  Eye,
  MoreVertical,
  RefreshCw,
  Send,
  Users,
  TrendingUp,
  Target,
  Award,
  Calendar,
  BarChart3,
  Settings,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Star,
} from 'lucide-react';
import { collection, query, orderBy, getDocs, where, limit, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../services/firebase/firebase-config';
import { trackUserAction } from '../../services/monitoring';
import WaitlistAnalyticsDashboard from './WaitlistAnalyticsDashboard';
import { waitlistService } from '../../services/waitlist/waitlist-service';

interface WaitlistUser {
  id: string;
  email: string;
  name: string;
  role: string;
  teamLevel: string;
  source: string;
  experience?: string;
  teamSize?: string;
  interests?: string[];
  marketingConsent?: boolean;
  newsletterConsent?: boolean;
  betaInterest?: boolean;
  referrerEmail?: string;
  referralCode?: string;
  leadScore?: number;
  segment?: string;
  createdAt: Date;
  lastActivity?: Date;
  status: 'active' | 'inactive' | 'converted' | 'bounced';
  notes?: string;
}

interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  content: string;
  segment: string;
  status: 'draft' | 'scheduled' | 'sent' | 'paused';
  scheduledAt?: Date;
  sentAt?: Date;
  openRate?: number;
  clickRate?: number;
  conversionRate?: number;
  createdAt: Date;
}

interface WaitlistManagementPanelProps {
  showAnalytics?: boolean;
  showEmailCampaigns?: boolean;
  showUserManagement?: boolean;
  enableBulkActions?: boolean;
  enableEmailSending?: boolean;
}

const WaitlistManagementPanel: React.FC<WaitlistManagementPanelProps> = ({
  showAnalytics = true,
  showEmailCampaigns = true,
  showUserManagement = true,
  enableBulkActions = true,
  enableEmailSending = true,
}) => {
  const [users, setUsers] = useState<WaitlistUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<WaitlistUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterSegment, setFilterSegment] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<WaitlistUser | null>(null);
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  const [newCampaign, setNewCampaign] = useState<Partial<EmailCampaign>>({});

  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const bgColor = useColorModeValue('white', 'gray.800');
  const cardBg = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.600', 'gray.300');
  const headingColor = useColorModeValue('gray.800', 'white');

  useEffect(() => {
    fetchUsers();
    if (showEmailCampaigns) {
      fetchCampaigns();
    }
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, filterRole, filterSegment, filterStatus]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const waitlistQuery = query(
        collection(db, 'waitlist'),
        orderBy('timestamp', 'desc')
      );
      const waitlistSnapshot = await getDocs(waitlistQuery);

      const usersData: WaitlistUser[] = [];
      waitlistSnapshot.forEach((doc) => {
        const data = doc.data();
        usersData.push({
          id: doc.id,
          email: data.email,
          name: data.name || '',
          role: data.role || 'unknown',
          teamLevel: data.teamLevel || 'unknown',
          source: data.source || 'unknown',
          experience: data.experience,
          teamSize: data.teamSize,
          interests: data.interests || [],
          marketingConsent: data.marketingConsent || false,
          newsletterConsent: data.newsletterConsent || false,
          betaInterest: data.betaInterest || false,
          referrerEmail: data.referrerEmail,
          referralCode: data.referralCode,
          leadScore: data.leadScore || waitlistService.calculateLeadScore(data),
          segment: data.segment || waitlistService.determineSegment(data.leadScore || waitlistService.calculateLeadScore(data)),
          createdAt: data.timestamp?.toDate() || new Date(),
          lastActivity: data.lastActivity?.toDate(),
          status: data.status || 'active',
          notes: data.notes,
        });
      });

      setUsers(usersData);

      trackUserAction('waitlist_management_viewed', {
        totalUsers: usersData.length,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCampaigns = async () => {
    try {
      // This would fetch from a campaigns collection
      // For now, using mock data
      const mockCampaigns: EmailCampaign[] = [
        {
          id: '1',
          name: 'Welcome Series - Day 1',
          subject: 'Welcome to Coach Core AI!',
          content: 'Thank you for joining our waitlist...',
          segment: 'all',
          status: 'sent',
          sentAt: new Date(Date.now() - 86400000),
          openRate: 45.2,
          clickRate: 12.8,
          conversionRate: 8.5,
          createdAt: new Date(Date.now() - 172800000),
        },
        {
          id: '2',
          name: 'High-Value Leads Follow-up',
          subject: 'Exclusive Beta Access for High-Value Coaches',
          content: 'As a high-value coach, you get early access...',
          segment: 'high-value',
          status: 'scheduled',
          scheduledAt: new Date(Date.now() + 86400000),
          createdAt: new Date(Date.now() - 86400000),
        },
      ];
      setCampaigns(mockCampaigns);
    } catch (err: any) {
      console.error('Error fetching campaigns:', err);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterRole) {
      filtered = filtered.filter(user => user.role === filterRole);
    }

    if (filterSegment) {
      filtered = filtered.filter(user => user.segment === filterSegment);
    }

    if (filterStatus) {
      filtered = filtered.filter(user => user.status === filterStatus);
    }

    setFilteredUsers(filtered);
  };

  const handleUserSelect = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(user => user.id));
    }
  };

  const handleEditUser = (user: WaitlistUser) => {
    setEditingUser(user);
    setIsEditingUser(true);
    onOpen();
  };

  const handleUpdateUser = async (updatedUser: WaitlistUser) => {
    try {
      await updateDoc(doc(db, 'waitlist', updatedUser.id), {
        ...updatedUser,
        lastActivity: new Date(),
      });

      setUsers(prev =>
        prev.map(user =>
          user.id === updatedUser.id ? updatedUser : user
        )
      );

      toast({
        title: 'User updated',
        description: 'User information has been updated successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      trackUserAction('waitlist_user_updated', {
        userId: updatedUser.id,
        changes: Object.keys(updatedUser),
      });
    } catch (err: any) {
      console.error('Error updating user:', err);
      toast({
        title: 'Error',
        description: 'Failed to update user information.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteDoc(doc(db, 'waitlist', userId));
      setUsers(prev => prev.filter(user => user.id !== userId));

      toast({
        title: 'User deleted',
        description: 'User has been removed from the waitlist.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      trackUserAction('waitlist_user_deleted', { userId });
    } catch (err: any) {
      console.error('Error deleting user:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete user.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedUsers.length === 0) {
      toast({
        title: 'No users selected',
        description: 'Please select users to perform bulk actions.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      switch (action) {
        case 'export':
          exportUsers(selectedUsers);
          break;
        case 'email':
          // Open email composer for selected users
          break;
        case 'delete':
          // Confirm and delete selected users
          break;
        case 'update_segment':
          // Update segment for selected users
          break;
        default:
          break;
      }

      trackUserAction('waitlist_bulk_action', {
        action,
        userCount: selectedUsers.length,
      });
    } catch (err: any) {
      console.error('Error performing bulk action:', err);
      toast({
        title: 'Error',
        description: 'Failed to perform bulk action.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const exportUsers = (userIds: string[]) => {
    const usersToExport = users.filter(user => userIds.includes(user.id));
    const csvData = [
      ['Email', 'Name', 'Role', 'Team Level', 'Lead Score', 'Segment', 'Status', 'Created At'],
      ...usersToExport.map(user => [
        user.email,
        user.name,
        user.role,
        user.teamLevel,
        user.leadScore?.toString() || '0',
        user.segment || 'unknown',
        user.status,
        user.createdAt.toISOString(),
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `waitlist-users-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Export completed',
      description: `${usersToExport.length} users exported successfully.`,
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  const getSegmentColor = (segment: string): string => {
    switch (segment) {
      case 'high-value': return 'green';
      case 'medium-value': return 'blue';
      case 'low-value': return 'yellow';
      default: return 'gray';
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active': return 'green';
      case 'inactive': return 'gray';
      case 'converted': return 'blue';
      case 'bounced': return 'red';
      default: return 'gray';
    }
  };

  if (isLoading) {
    return (
      <Box textAlign="center" py={8}>
        <Spinner size="xl" color="blue.500" />
        <Text mt={4} color={textColor}>Loading waitlist management...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert status="error" borderRadius="md">
        <AlertIcon />
        <Box>
          <AlertTitle>Error loading waitlist</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Box>
      </Alert>
    );
  }

  return (
    <Box p={6}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <Flex justify="space-between" align="center" wrap="wrap" gap={4}>
          <VStack align="start" spacing={1}>
            <Heading size="lg" color={headingColor}>
              Waitlist Management
            </Heading>
            <Text color={textColor}>
              Manage {users.length} waitlist users and email campaigns
            </Text>
          </VStack>
          
          <HStack spacing={3}>
            <Button
              leftIcon={<Icon as={RefreshCw} />}
              onClick={fetchUsers}
              isLoading={isLoading}
              variant="outline"
            >
              Refresh
            </Button>
            <Button
              leftIcon={<Icon as={Download} />}
              onClick={() => exportUsers(selectedUsers.length > 0 ? selectedUsers : users.map(u => u.id))}
              colorScheme="blue"
            >
              Export
            </Button>
          </HStack>
        </Flex>

        {/* Tabs */}
        <Tabs>
          <TabList>
            {showUserManagement && <Tab>User Management</Tab>}
            {showEmailCampaigns && <Tab>Email Campaigns</Tab>}
            {showAnalytics && <Tab>Analytics</Tab>}
          </TabList>

          <TabPanels>
            {/* User Management Tab */}
            {showUserManagement && (
              <TabPanel p={0}>
                <VStack spacing={6} align="stretch">
                  {/* Filters and Search */}
                  <Card bg={bgColor} borderColor={borderColor}>
                    <CardBody>
                      <VStack spacing={4}>
                        <HStack spacing={4} w="full" wrap="wrap">
                          <Input
                            placeholder="Search users..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            leftIcon={<Icon as={Search} />}
                            flex={1}
                            minW="200px"
                          />
                          <Select
                            placeholder="Filter by role"
                            value={filterRole}
                            onChange={(e) => setFilterRole(e.target.value)}
                            w="150px"
                          >
                            <option value="head-coach">Head Coach</option>
                            <option value="assistant-coach">Assistant Coach</option>
                            <option value="coordinator">Coordinator</option>
                            <option value="position-coach">Position Coach</option>
                            <option value="volunteer">Volunteer</option>
                            <option value="athletic-director">Athletic Director</option>
                          </Select>
                          <Select
                            placeholder="Filter by segment"
                            value={filterSegment}
                            onChange={(e) => setFilterSegment(e.target.value)}
                            w="150px"
                          >
                            <option value="high-value">High Value</option>
                            <option value="medium-value">Medium Value</option>
                            <option value="low-value">Low Value</option>
                            <option value="cold">Cold</option>
                          </Select>
                          <Select
                            placeholder="Filter by status"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            w="150px"
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="converted">Converted</option>
                            <option value="bounced">Bounced</option>
                          </Select>
                        </HStack>

                        {/* Bulk Actions */}
                        {enableBulkActions && selectedUsers.length > 0 && (
                          <HStack spacing={2} w="full" justify="space-between">
                            <Text fontSize="sm" color={textColor}>
                              {selectedUsers.length} users selected
                            </Text>
                            <HStack spacing={2}>
                              <Button
                                size="sm"
                                leftIcon={<Icon as={Mail} />}
                                onClick={() => handleBulkAction('email')}
                              >
                                Send Email
                              </Button>
                              <Button
                                size="sm"
                                leftIcon={<Icon as={Download} />}
                                onClick={() => handleBulkAction('export')}
                              >
                                Export Selected
                              </Button>
                              <Button
                                size="sm"
                                colorScheme="red"
                                leftIcon={<Icon as={Trash2} />}
                                onClick={() => handleBulkAction('delete')}
                              >
                                Delete Selected
                              </Button>
                            </HStack>
                          </HStack>
                        )}
                      </VStack>
                    </CardBody>
                  </Card>

                  {/* Users Table */}
                  <Card bg={bgColor} borderColor={borderColor}>
                    <CardBody p={0}>
                      <Table size="sm">
                        <Thead>
                          <Tr>
                            <Th>
                              <input
                                type="checkbox"
                                checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                                onChange={handleSelectAll}
                              />
                            </Th>
                            <Th>Name</Th>
                            <Th>Email</Th>
                            <Th>Role</Th>
                            <Th>Lead Score</Th>
                            <Th>Segment</Th>
                            <Th>Status</Th>
                            <Th>Created</Th>
                            <Th>Actions</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {filteredUsers.map((user) => (
                            <Tr key={user.id}>
                              <Td>
                                <input
                                  type="checkbox"
                                  checked={selectedUsers.includes(user.id)}
                                  onChange={() => handleUserSelect(user.id)}
                                />
                              </Td>
                              <Td fontWeight="medium">{user.name}</Td>
                              <Td fontSize="sm" color={textColor}>{user.email}</Td>
                              <Td textTransform="capitalize">{user.role.replace('-', ' ')}</Td>
                              <Td>
                                <Badge
                                  colorScheme={
                                    (user.leadScore || 0) >= 80 ? 'green' :
                                    (user.leadScore || 0) >= 60 ? 'blue' :
                                    (user.leadScore || 0) >= 40 ? 'yellow' : 'gray'
                                  }
                                >
                                  {user.leadScore || 0}
                                </Badge>
                              </Td>
                              <Td>
                                <Badge colorScheme={getSegmentColor(user.segment || 'cold')}>
                                  {user.segment || 'cold'}
                                </Badge>
                              </Td>
                              <Td>
                                <Badge colorScheme={getStatusColor(user.status)}>
                                  {user.status}
                                </Badge>
                              </Td>
                              <Td fontSize="sm" color={textColor}>
                                {user.createdAt.toLocaleDateString()}
                              </Td>
                              <Td>
                                <Menu>
                                  <MenuButton as={Button} size="sm" variant="ghost">
                                    <Icon as={MoreVertical} />
                                  </MenuButton>
                                  <MenuList>
                                    <MenuItem
                                      icon={<Icon as={Eye} />}
                                      onClick={() => handleEditUser(user)}
                                    >
                                      View/Edit
                                    </MenuItem>
                                    <MenuItem
                                      icon={<Icon as={Mail} />}
                                      onClick={() => handleBulkAction('email')}
                                    >
                                      Send Email
                                    </MenuItem>
                                    <MenuItem
                                      icon={<Icon as={Trash2} />}
                                      onClick={() => handleDeleteUser(user.id)}
                                      color="red.500"
                                    >
                                      Delete
                                    </MenuItem>
                                  </MenuList>
                                </Menu>
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </CardBody>
                  </Card>
                </VStack>
              </TabPanel>
            )}

            {/* Email Campaigns Tab */}
            {showEmailCampaigns && (
              <TabPanel p={0}>
                <VStack spacing={6} align="stretch">
                  <Flex justify="space-between" align="center">
                    <Heading size="md" color={headingColor}>
                      Email Campaigns
                    </Heading>
                    <Button
                      leftIcon={<Icon as={Plus} />}
                      onClick={() => setIsCreatingCampaign(true)}
                      colorScheme="blue"
                    >
                      Create Campaign
                    </Button>
                  </Flex>

                  <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                    {campaigns.map((campaign) => (
                      <Card key={campaign.id} bg={bgColor} borderColor={borderColor}>
                        <CardHeader>
                          <Heading size="sm" color={headingColor}>
                            {campaign.name}
                          </Heading>
                        </CardHeader>
                        <CardBody>
                          <VStack spacing={3} align="stretch">
                            <Text fontSize="sm" color={textColor}>
                              {campaign.subject}
                            </Text>
                            <HStack justify="space-between">
                              <Badge colorScheme={
                                campaign.status === 'sent' ? 'green' :
                                campaign.status === 'scheduled' ? 'blue' :
                                campaign.status === 'draft' ? 'gray' : 'yellow'
                              }>
                                {campaign.status}
                              </Badge>
                              <Text fontSize="xs" color={textColor}>
                                {campaign.segment}
                              </Text>
                            </HStack>
                            {campaign.status === 'sent' && (
                              <VStack spacing={1} align="stretch">
                                <HStack justify="space-between">
                                  <Text fontSize="xs" color={textColor}>Open Rate:</Text>
                                  <Text fontSize="xs" fontWeight="semibold">{campaign.openRate}%</Text>
                                </HStack>
                                <HStack justify="space-between">
                                  <Text fontSize="xs" color={textColor}>Click Rate:</Text>
                                  <Text fontSize="xs" fontWeight="semibold">{campaign.clickRate}%</Text>
                                </HStack>
                                <HStack justify="space-between">
                                  <Text fontSize="xs" color={textColor}>Conversion:</Text>
                                  <Text fontSize="xs" fontWeight="semibold">{campaign.conversionRate}%</Text>
                                </HStack>
                              </VStack>
                            )}
                          </VStack>
                        </CardBody>
                      </Card>
                    ))}
                  </SimpleGrid>
                </VStack>
              </TabPanel>
            )}

            {/* Analytics Tab */}
            {showAnalytics && (
              <TabPanel p={0}>
                <WaitlistAnalyticsDashboard
                  showRecentSignups={true}
                  showTopReferrers={true}
                  showLeadScoring={true}
                />
              </TabPanel>
            )}
          </TabPanels>
        </Tabs>
      </VStack>

      {/* Edit User Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit User</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {editingUser && (
              <VStack spacing={4}>
                <FormControl>
                  <FormLabel>Name</FormLabel>
                  <Input
                    value={editingUser.name}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Email</FormLabel>
                  <Input
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Role</FormLabel>
                  <Select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  >
                    <option value="head-coach">Head Coach</option>
                    <option value="assistant-coach">Assistant Coach</option>
                    <option value="coordinator">Coordinator</option>
                    <option value="position-coach">Position Coach</option>
                    <option value="volunteer">Volunteer</option>
                    <option value="athletic-director">Athletic Director</option>
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>Status</FormLabel>
                  <Select
                    value={editingUser.status}
                    onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value as any })}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="converted">Converted</option>
                    <option value="bounced">Bounced</option>
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>Notes</FormLabel>
                  <Textarea
                    value={editingUser.notes || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, notes: e.target.value })}
                    placeholder="Add notes about this user..."
                  />
                </FormControl>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={() => {
                if (editingUser) {
                  handleUpdateUser(editingUser);
                  onClose();
                }
              }}
            >
              Save Changes
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default WaitlistManagementPanel;
