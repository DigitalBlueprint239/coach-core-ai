import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Divider,
  Flex,
  HStack,
  Icon,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Spinner,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { Download, Filter, RefreshCw, UserPlus } from 'lucide-react';
import dayjs from 'dayjs';
import QuickActions from '../../../components/Dashboard/QuickActions';
import StatCard from '../../../components/Dashboard/StatCard';
import { waitlistAdminService, WaitlistAdminEntry, WaitlistFilters } from '../../../services/waitlist/waitlist-admin-service';
import { UserRole } from '../../../types/user';

const ROLE_OPTIONS: Array<{ label: string; value: UserRole }> = [
  { label: 'Coach', value: 'coach' },
  { label: 'Head Coach', value: 'head-coach' },
  { label: 'Assistant Coach', value: 'assistant-coach' },
  { label: 'Team Admin', value: 'team-admin' },
  { label: 'Client', value: 'client' },
  { label: 'Admin', value: 'admin' },
];

const STATUS_COLORS: Record<string, string> = {
  converted: 'green',
  pending: 'orange',
  invited: 'purple',
};

const WaitlistManager: React.FC = () => {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [entries, setEntries] = useState<WaitlistAdminEntry[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeEntry, setActiveEntry] = useState<WaitlistAdminEntry | null>(null);
  const conversionModal = useDisclosure();
  const detailsModal = useDisclosure();
  const [selectedRole, setSelectedRole] = useState<UserRole>('coach');

  const fetchEntries = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters: WaitlistFilters = {};
      if (statusFilter) {
        filters.status = statusFilter as WaitlistFilters['status'];
      }
      const data = await waitlistAdminService.getAllWaitlistEntries(filters);
      setEntries(data);
    } catch (error) {
      toast({
        title: 'Failed to load waitlist entries',
        description: (error as Error).message,
        status: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, toast]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const filteredEntries = useMemo(() => {
    if (!search) return entries;
    const query = search.toLowerCase();
    return entries.filter((entry) =>
      [entry.email, (entry as any).name, entry.source]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(query))
    );
  }, [entries, search]);

  const toggleSelect = (entryId: string) => {
    setSelectedIds((prev) => (prev.includes(entryId) ? prev.filter((id) => id !== entryId) : [...prev, entryId]));
  };

  const selectAll = (checked: boolean) => {
    setSelectedIds(checked ? filteredEntries.map((entry) => entry.id) : []);
  };

  const handleConvert = async (entry: WaitlistAdminEntry) => {
    setActiveEntry(entry);
    conversionModal.onOpen();
  };

  const confirmConvert = async () => {
    if (!activeEntry) return;
    try {
      const result = await waitlistAdminService.convertToUser(activeEntry.id, selectedRole);
      if (!result.success) {
        throw new Error(result.message || 'Conversion failed');
      }
      toast({ title: 'User converted successfully', status: 'success' });
      conversionModal.onClose();
      setSelectedIds([]);
      fetchEntries();
    } catch (error) {
      toast({
        title: 'Conversion failed',
        description: (error as Error).message,
        status: 'error',
      });
    }
  };

  const handleBulkConvert = async () => {
    try {
      const results = await waitlistAdminService.bulkConvert(selectedIds, selectedRole);
      const failures = results.filter((result) => !result.success);
      if (failures.length) {
        toast({
          title: 'Bulk conversion completed with errors',
          description: `${failures.length} conversions failed`,
          status: 'warning',
        });
      } else {
        toast({ title: 'All selected users converted', status: 'success' });
      }
      setSelectedIds([]);
      fetchEntries();
    } catch (error) {
      toast({
        title: 'Bulk conversion failed',
        description: (error as Error).message,
        status: 'error',
      });
    }
  };

  const handleExport = async () => {
    try {
      const blob = await waitlistAdminService.exportToCSV();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `waitlist-export-${Date.now()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Waitlist export generated', status: 'success' });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: (error as Error).message,
        status: 'error',
      });
    }
  };

  const openDetails = (entry: WaitlistAdminEntry) => {
    setActiveEntry(entry);
    detailsModal.onOpen();
  };

  const pendingCount = useMemo(() => entries.filter((entry) => !(entry.converted || entry.status === 'converted')).length, [entries]);
  const convertedCount = entries.length - pendingCount;

  return (
    <Stack spacing={8}>
      <Flex gap={4} flexWrap="wrap">
        <Box flex="1" minW="220px">
          <StatCard label="Total Waitlist" value={entries.length} accentColor="purple.500" />
        </Box>
        <Box flex="1" minW="220px">
          <StatCard label="Pending" value={pendingCount} accentColor="orange.400" />
        </Box>
        <Box flex="1" minW="220px">
          <StatCard label="Converted" value={convertedCount} accentColor="green.500" />
        </Box>
        <Box flex="1" minW="220px">
          <StatCard label="Selected" value={selectedIds.length} accentColor="blue.500" />
        </Box>
      </Flex>

      <Stack spacing={4}>
        <Flex justify="space-between" align="center" flexWrap="wrap" gap={3}>
          <QuickActions
            actions={[
              {
                label: 'Refresh',
                onClick: fetchEntries,
                colorScheme: 'gray',
                leftIcon: <Icon as={RefreshCw} boxSize={4} />,
              },
              {
                label: 'Export CSV',
                onClick: handleExport,
                colorScheme: 'purple',
                leftIcon: <Icon as={Download} boxSize={4} />,
              },
            ]}
          />
          <HStack spacing={3} flexWrap="wrap">
            <InputGroup width={{ base: '100%', md: '280px' }}>
              <InputLeftElement pointerEvents="none">
                <Icon as={Filter} color="gray.400" />
              </InputLeftElement>
              <Input
                placeholder="Search by email, name, source"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </InputGroup>
            <Select
              placeholder="All statuses"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              width={{ base: '100%', md: '200px' }}
            >
              <option value="pending">Pending</option>
              <option value="invited">Invited</option>
              <option value="converted">Converted</option>
            </Select>
            <Menu>
              <MenuButton as={Button} leftIcon={<Icon as={UserPlus} />} colorScheme="blue">
                Convert
              </MenuButton>
              <MenuList>
                {ROLE_OPTIONS.map((option) => (
                  <MenuItem
                    key={option.value}
                    onClick={() => {
                      setSelectedRole(option.value);
                      if (selectedIds.length > 0) {
                        handleBulkConvert();
                      } else {
                        toast({
                          title: 'No entries selected',
                          description: 'Select one or more waitlist entries to convert.',
                          status: 'info',
                        });
                      }
                    }}
                  >
                    {option.label}
                  </MenuItem>
                ))}
              </MenuList>
            </Menu>
          </HStack>
        </Flex>

        <Box borderWidth="1px" borderColor="gray.200" borderRadius="lg" overflow="hidden" bg="white" shadow="sm">
          <Table size="md">
            <Thead bg="gray.50">
              <Tr>
                <Th width="40px">
                  <Checkbox
                    isChecked={selectedIds.length > 0 && selectedIds.length === filteredEntries.length}
                    isIndeterminate={selectedIds.length > 0 && selectedIds.length < filteredEntries.length}
                    onChange={(event) => selectAll(event.target.checked)}
                  />
                </Th>
                <Th>Email</Th>
                <Th>Name</Th>
                <Th>Source</Th>
                <Th>Status</Th>
                <Th>Submitted</Th>
                <Th textAlign="right">Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {isLoading ? (
                <Tr>
                  <Td colSpan={7} textAlign="center" py={10}>
                    <Spinner />
                  </Td>
                </Tr>
              ) : filteredEntries.length === 0 ? (
                <Tr>
                  <Td colSpan={7} textAlign="center" py={10}>
                    <Text color="gray.500">No entries match the current filters.</Text>
                  </Td>
                </Tr>
              ) : (
                filteredEntries.map((entry) => {
                  const status = entry.status || (entry.converted ? 'converted' : 'pending');
                  return (
                    <Tr key={entry.id} _hover={{ bg: 'gray.50' }}>
                      <Td>
                        <Checkbox
                          isChecked={selectedIds.includes(entry.id)}
                          onChange={() => toggleSelect(entry.id)}
                        />
                      </Td>
                      <Td>
                        <Text fontWeight="medium" color="gray.700">
                          {entry.email}
                        </Text>
                      </Td>
                      <Td>{(entry as any).name || '—'}</Td>
                      <Td>{entry.source || '—'}</Td>
                      <Td>
                        <Badge colorScheme={STATUS_COLORS[status] || 'gray'} textTransform="capitalize">
                          {status}
                        </Badge>
                      </Td>
                      <Td>{entry.timestamp ? dayjs(entry.timestamp).format('MMM D, YYYY h:mm A') : '—'}</Td>
                      <Td textAlign="right">
                        <HStack spacing={2} justify="flex-end">
                          <IconButton
                            aria-label="View details"
                            icon={<Icon as={Filter} />}
                            size="sm"
                            variant="ghost"
                            onClick={() => openDetails(entry)}
                          />
                          <IconButton
                            aria-label="Convert to user"
                            icon={<Icon as={UserPlus} />}
                            size="sm"
                            colorScheme="blue"
                            onClick={() => handleConvert(entry)}
                          />
                        </HStack>
                      </Td>
                    </Tr>
                  );
                })
              )}
            </Tbody>
          </Table>
        </Box>
      </Stack>

      <Modal isOpen={conversionModal.isOpen} onClose={conversionModal.onClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Convert Waitlist Entry</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={4}>
              <Text>
                Convert <strong>{activeEntry?.email}</strong> to a full account.
              </Text>
              <Select value={selectedRole} onChange={(event) => setSelectedRole(event.target.value as UserRole)}>
                {ROLE_OPTIONS.map((option) => (
                  <option value={option.value} key={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={conversionModal.onClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={confirmConvert}>
              Convert
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={detailsModal.isOpen} onClose={detailsModal.onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Waitlist Entry Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={4}>
              <Box>
                <Text fontWeight="semibold">Email</Text>
                <Text color="gray.600">{activeEntry?.email}</Text>
              </Box>
              <Box>
                <Text fontWeight="semibold">Source</Text>
                <Text color="gray.600">{activeEntry?.source || 'Direct'}</Text>
              </Box>
              <Box>
                <Text fontWeight="semibold">Status</Text>
                <Badge colorScheme={STATUS_COLORS[activeEntry?.status || 'pending'] || 'gray'}>
                  {activeEntry?.status || (activeEntry?.converted ? 'converted' : 'pending')}
                </Badge>
              </Box>
              <Divider />
              <Box>
                <Text fontWeight="semibold">Metadata</Text>
                <Box as="pre" bg="gray.100" p={3} borderRadius="md" fontSize="sm" overflowX="auto">
                  {JSON.stringify(activeEntry, null, 2)}
                </Box>
              </Box>
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button onClick={detailsModal.onClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Stack>
  );
};

export default WaitlistManager;
