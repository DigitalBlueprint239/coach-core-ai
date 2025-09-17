import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  Select,
  Input,
  InputGroup,
  InputLeftElement,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Tfoot,
  TableContainer,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Divider,
  useToast,
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
  Textarea,
  useDisclosure,
  IconButton,
  Tooltip,
  Flex,
  Grid,
  GridItem,
  Heading,
  Tag,
  TagLabel,
  TagCloseButton,
  Wrap,
  WrapItem,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Code,
  Link,
  useColorModeValue
} from '@chakra-ui/react';
import {
  Search,
  Filter,
  RefreshCw,
  MessageSquare,
  Bug,
  Star,
  Palette,
  Zap,
  MoreHorizontal,
  Eye,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  User,
  Calendar,
  Globe,
  Smartphone
} from 'lucide-react';
import { Icon } from '@chakra-ui/react';
import { feedbackService, StagingFeedback, FeedbackFilters } from '../../services/feedback/feedback-service';
import { useAuth } from '../../hooks/useAuth';

const FeedbackDashboard: React.FC = () => {
  const [feedback, setFeedback] = useState<StagingFeedback[]>([]);
  const [filteredFeedback, setFilteredFeedback] = useState<StagingFeedback[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FeedbackFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState<StagingFeedback | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [adminNotes, setAdminNotes] = useState('');
  const [newStatus, setNewStatus] = useState<StagingFeedback['status']>('new');
  const toast = useToast();
  const { user, profile } = useAuth();

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  // Check if user is admin
  const isAdmin = feedbackService.isAdmin(user?.uid, user?.email || profile?.email);

  useEffect(() => {
    if (isAdmin) {
      loadFeedback();
    }
  }, [isAdmin]);

  useEffect(() => {
    applyFilters();
  }, [feedback, filters, searchTerm]);

  const loadFeedback = async () => {
    try {
      setLoading(true);
      setError(null);
      const [feedbackData, statsData] = await Promise.all([
        feedbackService.getAllFeedback(filters, 100),
        feedbackService.getFeedbackStats()
      ]);
      setFeedback(feedbackData);
      setStats(statsData);
    } catch (err: any) {
      setError(err.message);
      toast({
        title: 'Failed to load feedback',
        description: err.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...feedback];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.feedback.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredFeedback(filtered);
  };

  const handleStatusUpdate = async (feedbackId: string, status: StagingFeedback['status']) => {
    try {
      await feedbackService.updateFeedbackStatus(
        feedbackId,
        status,
        adminNotes,
        user?.uid,
        user?.email || profile?.email
      );
      
      // Update local state
      setFeedback(prev => prev.map(item => 
        item.id === feedbackId 
          ? { ...item, status, adminNotes, adminId: user?.uid, adminEmail: user?.email || profile?.email }
          : item
      ));

      toast({
        title: 'Status updated',
        description: `Feedback status updated to ${status}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      onClose();
    } catch (err: any) {
      toast({
        title: 'Update failed',
        description: err.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const openFeedbackModal = (item: StagingFeedback) => {
    setSelectedFeedback(item);
    setAdminNotes(item.adminNotes || '');
    setNewStatus(item.status || 'new');
    onOpen();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'blue';
      case 'reviewed': return 'yellow';
      case 'in_progress': return 'orange';
      case 'resolved': return 'green';
      case 'closed': return 'gray';
      default: return 'gray';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'red';
      case 'high': return 'orange';
      case 'medium': return 'yellow';
      case 'low': return 'green';
      default: return 'gray';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'bug': return <Icon as={Bug} boxSize={4} />;
      case 'feature': return <Icon as={Star} boxSize={4} />;
      case 'ui': return <Icon as={Palette} boxSize={4} />;
      case 'performance': return <Icon as={Zap} boxSize={4} />;
      case 'other': return <Icon as={MessageSquare} boxSize={4} />;
      default: return <Icon as={MessageSquare} boxSize={4} />;
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (!isAdmin) {
    return (
      <Alert status="error">
        <AlertIcon />
        <AlertTitle>Access Denied</AlertTitle>
        <AlertDescription>
          You don't have permission to access the feedback dashboard.
        </AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return (
      <Box textAlign="center" py={8}>
        <Spinner size="xl" color="brand.500" />
        <Text mt={4}>Loading feedback...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert status="error">
        <AlertIcon />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Box p={6}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <Flex justify="space-between" align="center">
          <VStack align="start" spacing={1}>
            <Heading size="lg">Feedback Dashboard</Heading>
            <Text color="gray.600">Review and manage staging feedback</Text>
          </VStack>
          <HStack spacing={3}>
            <Button
              leftIcon={<Icon as={RefreshCw} boxSize={4} />}
              onClick={loadFeedback}
              variant="outline"
            >
              Refresh
            </Button>
          </HStack>
        </Flex>

        {/* Stats Cards */}
        {stats && (
          <Grid templateColumns={{ base: '1fr', md: 'repeat(4, 1fr)' }} gap={4}>
            <GridItem>
              <Card>
                <CardBody>
                  <Stat>
                    <StatLabel>Total Feedback</StatLabel>
                    <StatNumber>{stats.total}</StatNumber>
                    <StatHelpText>
                      <StatArrow type="increase" />
                      {stats.recentCount} this week
                    </StatHelpText>
                  </Stat>
                </CardBody>
              </Card>
            </GridItem>
            <GridItem>
              <Card>
                <CardBody>
                  <Stat>
                    <StatLabel>New</StatLabel>
                    <StatNumber color="blue.500">{stats.byStatus.new || 0}</StatNumber>
                  </Stat>
                </CardBody>
              </Card>
            </GridItem>
            <GridItem>
              <Card>
                <CardBody>
                  <Stat>
                    <StatLabel>In Progress</StatLabel>
                    <StatNumber color="orange.500">{stats.byStatus.in_progress || 0}</StatNumber>
                  </Stat>
                </CardBody>
              </Card>
            </GridItem>
            <GridItem>
              <Card>
                <CardBody>
                  <Stat>
                    <StatLabel>Resolved</StatLabel>
                    <StatNumber color="green.500">{stats.byStatus.resolved || 0}</StatNumber>
                  </Stat>
                </CardBody>
              </Card>
            </GridItem>
          </Grid>
        )}

        {/* Filters */}
        <Card>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <HStack spacing={4} wrap="wrap">
                <InputGroup maxW="300px">
                  <InputLeftElement>
                    <Icon as={Search} boxSize={4} color="gray.400" />
                  </InputLeftElement>
                  <Input
                    placeholder="Search feedback..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </InputGroup>
                <Select
                  placeholder="Filter by category"
                  value={filters.category || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value || undefined }))}
                  maxW="200px"
                >
                  <option value="bug">🐛 Bug</option>
                  <option value="feature">✨ Feature</option>
                  <option value="ui">🎨 UI/UX</option>
                  <option value="performance">⚡ Performance</option>
                  <option value="other">💬 Other</option>
                </Select>
                <Select
                  placeholder="Filter by priority"
                  value={filters.priority || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value || undefined }))}
                  maxW="200px"
                >
                  <option value="critical">🔴 Critical</option>
                  <option value="high">🟠 High</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="low">🟢 Low</option>
                </Select>
                <Select
                  placeholder="Filter by status"
                  value={filters.status || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value || undefined }))}
                  maxW="200px"
                >
                  <option value="new">New</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </Select>
              </HStack>
            </VStack>
          </CardBody>
        </Card>

        {/* Feedback Table */}
        <Card>
          <CardHeader>
            <HStack justify="space-between">
              <Text fontSize="lg" fontWeight="semibold">
                Feedback ({filteredFeedback.length})
              </Text>
            </HStack>
          </CardHeader>
          <CardBody>
            <TableContainer>
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Feedback</Th>
                    <Th>Category</Th>
                    <Th>Priority</Th>
                    <Th>Status</Th>
                    <Th>User</Th>
                    <Th>Date</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredFeedback.map((item) => (
                    <Tr key={item.id}>
                      <Td maxW="300px">
                        <Text
                          noOfLines={2}
                          fontSize="sm"
                          title={item.feedback}
                        >
                          {item.feedback}
                        </Text>
                      </Td>
                      <Td>
                        <HStack spacing={2}>
                          {getCategoryIcon(item.category || 'other')}
                          <Text fontSize="sm" textTransform="capitalize">
                            {item.category}
                          </Text>
                        </HStack>
                      </Td>
                      <Td>
                        <Badge
                          colorScheme={getPriorityColor(item.priority || 'medium')}
                          variant="subtle"
                        >
                          {item.priority}
                        </Badge>
                      </Td>
                      <Td>
                        <Badge
                          colorScheme={getStatusColor(item.status || 'new')}
                          variant="solid"
                        >
                          {item.status}
                        </Badge>
                      </Td>
                      <Td>
                        <VStack align="start" spacing={1}>
                          <Text fontSize="sm" fontWeight="medium">
                            {item.userEmail || 'Anonymous'}
                          </Text>
                          {item.userId && (
                            <Text fontSize="xs" color="gray.500">
                              ID: {item.userId.slice(0, 8)}...
                            </Text>
                          )}
                        </VStack>
                      </Td>
                      <Td>
                        <Text fontSize="sm">
                          {formatDate(item.timestamp)}
                        </Text>
                      </Td>
                      <Td>
                        <Tooltip label="View Details">
                          <IconButton
                            aria-label="View feedback"
                            icon={<Icon as={Eye} boxSize={4} />}
                            size="sm"
                            variant="ghost"
                            onClick={() => openFeedbackModal(item)}
                          />
                        </Tooltip>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          </CardBody>
        </Card>

        {/* Feedback Detail Modal */}
        <Modal isOpen={isOpen} onClose={onClose} size="xl">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Feedback Details</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              {selectedFeedback && (
                <VStack spacing={4} align="stretch">
                  <Box>
                    <Text fontWeight="semibold" mb={2}>Feedback:</Text>
                    <Text p={3} bg="gray.50" borderRadius="md">
                      {selectedFeedback.feedback}
                    </Text>
                  </Box>

                  <HStack spacing={4}>
                    <Box>
                      <Text fontWeight="semibold" mb={1}>Category:</Text>
                      <HStack spacing={2}>
                        {getCategoryIcon(selectedFeedback.category || 'other')}
                        <Text textTransform="capitalize">
                          {selectedFeedback.category}
                        </Text>
                      </HStack>
                    </Box>
                    <Box>
                      <Text fontWeight="semibold" mb={1}>Priority:</Text>
                      <Badge
                        colorScheme={getPriorityColor(selectedFeedback.priority || 'medium')}
                        variant="subtle"
                      >
                        {selectedFeedback.priority}
                      </Badge>
                    </Box>
                    <Box>
                      <Text fontWeight="semibold" mb={1}>Status:</Text>
                      <Badge
                        colorScheme={getStatusColor(selectedFeedback.status || 'new')}
                        variant="solid"
                      >
                        {selectedFeedback.status}
                      </Badge>
                    </Box>
                  </HStack>

                  <Divider />

                  <Box>
                    <Text fontWeight="semibold" mb={2}>User Information:</Text>
                    <VStack align="start" spacing={1}>
                      <Text fontSize="sm">
                        <strong>Email:</strong> {selectedFeedback.userEmail || 'Anonymous'}
                      </Text>
                      {selectedFeedback.userId && (
                        <Text fontSize="sm">
                          <strong>User ID:</strong> {selectedFeedback.userId}
                        </Text>
                      )}
                      <Text fontSize="sm">
                        <strong>Submitted:</strong> {formatDate(selectedFeedback.timestamp)}
                      </Text>
                      {selectedFeedback.pageUrl && (
                        <Text fontSize="sm">
                          <strong>Page:</strong> 
                          <Link href={selectedFeedback.pageUrl} isExternal color="blue.500">
                            {selectedFeedback.pageUrl}
                          </Link>
                        </Text>
                      )}
                    </VStack>
                  </Box>

                  <Box>
                    <Text fontWeight="semibold" mb={2}>Update Status:</Text>
                    <VStack spacing={3} align="stretch">
                      <Select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value as StagingFeedback['status'])}
                      >
                        <option value="new">New</option>
                        <option value="reviewed">Reviewed</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </Select>
                      <Textarea
                        placeholder="Add admin notes..."
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        rows={3}
                      />
                    </VStack>
                  </Box>
                </VStack>
              )}
            </ModalBody>
            <ModalFooter>
              <HStack spacing={3}>
                <Button variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  colorScheme="blue"
                  onClick={() => selectedFeedback && handleStatusUpdate(selectedFeedback.id!, newStatus)}
                >
                  Update Status
                </Button>
              </HStack>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </VStack>
    </Box>
  );
};

export default FeedbackDashboard;

