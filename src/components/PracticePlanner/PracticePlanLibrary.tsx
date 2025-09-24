// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Card,
  CardBody,
  CardHeader,
  Button,
  Icon,
  Badge,
  useToast,
  useColorModeValue,
  SimpleGrid,
  IconButton,
  Tooltip,
  Flex,
  Spinner,
  Center,
} from '@chakra-ui/react';
import {
  Play,
  Edit,
  Trash2,
  Download,
  Share,
  Calendar,
  Clock,
  Users,
  Target,
} from 'lucide-react';
import PracticeService from '../../services/practice/practice-service';
import { PracticePlan } from './ModernPracticePlanner';

interface PracticePlanLibraryProps {
  onSelectPlan: (plan: PracticePlan) => void;
  onEditPlan: (plan: PracticePlan) => void;
}

const PracticePlanLibrary: React.FC<PracticePlanLibraryProps> = ({
  onSelectPlan,
  onEditPlan,
}) => {
  const [plans, setPlans] = useState<PracticePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<PracticePlan | null>(null);
  const toast = useToast();

  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const practiceService = new PracticeService();
      const result = await practiceService.getPracticePlans();

      if (result.success && result.data) {
        setPlans(result.data);
      }
    } catch (error) {
      console.error('Failed to load plans:', error);
      toast({
        title: 'Error',
        description: 'Failed to load practice plans',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    try {
      const practiceService = new PracticeService();
      const result = await practiceService.deletePracticePlan(planId);

      if (result.success) {
        toast({
          title: 'Plan Deleted',
          description: 'Practice plan deleted successfully',
          status: 'success',
          duration: 2000,
          isClosable: true,
        });
        loadPlans(); // Reload the list
      } else {
        toast({
          title: 'Delete Failed',
          description: result.message,
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: 'Delete Failed',
        description: 'Failed to delete practice plan',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleExportPlan = (plan: PracticePlan, format: 'json' | 'csv') => {
    try {
      let data: string;
      let mimeType: string;
      let extension: string;

      if (format === 'json') {
        data = JSON.stringify(plan, null, 2);
        mimeType = 'application/json';
        extension = 'json';
      } else {
        // Simple CSV export
        const headers = [
          'Title',
          'Sport',
          'Age Group',
          'Duration',
          'Goals',
          'Notes',
        ];
        const rows = [
          plan.title,
          plan.sport,
          plan.ageGroup,
          `${plan.totalDuration} min`,
          plan.goals.join('; '),
          plan.notes,
        ];
        data = [headers, rows]
          .map(row => row.map(cell => `"${cell}"`).join(','))
          .join('\n');
        mimeType = 'text/csv';
        extension = 'csv';
      }

      const blob = new Blob([data], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${plan.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Plan Exported',
        description: `Practice plan exported as ${format.toUpperCase()}`,
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to export practice plan',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };

  if (loading) {
    return (
      <Center minH="200px">
        <VStack spacing={4}>
          <Spinner size="lg" color="blue.500" />
          <Text color="gray.600">Loading practice plans...</Text>
        </VStack>
      </Center>
    );
  }

  if (plans.length === 0) {
    return (
      <Card variant="elevated" bg={cardBg}>
        <CardBody textAlign="center" py={8}>
          <Icon as={Target} boxSize={12} color="gray.400" mb={4} />
          <Heading size="md" color="gray.600" mb={2}>
            No Practice Plans Yet
          </Heading>
          <Text color="gray.500" mb={4}>
            Create your first practice plan or generate one with AI to get
            started.
          </Text>
        </CardBody>
      </Card>
    );
  }

  return (
    <VStack spacing={4} align="stretch">
      <Heading size="md" color="gray.800">
        Practice Plan Library ({plans.length})
      </Heading>

      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
        {plans.map(plan => (
          <Card
            key={plan.id}
            variant="elevated"
            bg={cardBg}
            border="1px"
            borderColor={borderColor}
            _hover={{
              transform: 'translateY(-2px)',
              boxShadow: 'lg',
            }}
            transition="all 0.2s"
            cursor="pointer"
            onClick={() => onSelectPlan(plan)}
          >
            <CardHeader pb={2}>
              <VStack align="start" spacing={2}>
                <Heading size="sm" color="gray.800" noOfLines={1}>
                  {plan.title}
                </Heading>
                <HStack spacing={2}>
                  <Badge colorScheme="blue" variant="subtle">
                    {plan.sport}
                  </Badge>
                  <Badge colorScheme="green" variant="subtle">
                    {plan.ageGroup}
                  </Badge>
                </HStack>
              </VStack>
            </CardHeader>

            <CardBody pt={0}>
              <VStack align="start" spacing={3}>
                <HStack spacing={4} fontSize="sm" color="gray.600">
                  <HStack spacing={1}>
                    <Icon as={Clock} boxSize={4} />
                    <Text>{plan.totalDuration} min</Text>
                  </HStack>
                  <HStack spacing={1}>
                    <Icon as={Users} boxSize={4} />
                    <Text>{plan.periods.length} periods</Text>
                  </HStack>
                </HStack>

                {plan.goals.length > 0 && (
                  <Box>
                    <Text
                      fontSize="xs"
                      fontWeight="medium"
                      color="gray.700"
                      mb={1}
                    >
                      Goals:
                    </Text>
                    <Text fontSize="xs" color="gray.600" noOfLines={2}>
                      {plan.goals.slice(0, 2).join(', ')}
                      {plan.goals.length > 2 && '...'}
                    </Text>
                  </Box>
                )}

                <Text fontSize="xs" color="gray.500">
                  Created: {formatDate(plan.createdAt)}
                </Text>

                <HStack spacing={2} w="full" justify="space-between">
                  <Button
                    size="sm"
                    variant="ghost"
                    colorScheme="blue"
                    leftIcon={<Icon as={Edit} boxSize={4} />}
                    onClick={e => {
                      e.stopPropagation();
                      onEditPlan(plan);
                    }}
                  >
                    Edit
                  </Button>

                  <HStack spacing={1}>
                    <Tooltip label="Export as JSON">
                      <IconButton
                        size="sm"
                        variant="ghost"
                        colorScheme="gray"
                        icon={<Icon as={Download} boxSize={4} />}
                        aria-label="Export as JSON"
                        onClick={e => {
                          e.stopPropagation();
                          handleExportPlan(plan, 'json');
                        }}
                      />
                    </Tooltip>

                    <Tooltip label="Export as CSV">
                      <IconButton
                        size="sm"
                        variant="ghost"
                        colorScheme="gray"
                        icon={<Icon as={Download} boxSize={4} />}
                        aria-label="Export as CSV"
                        onClick={e => {
                          e.stopPropagation();
                          handleExportPlan(plan, 'csv');
                        }}
                      />
                    </Tooltip>

                    <Tooltip label="Delete Plan">
                      <IconButton
                        size="sm"
                        variant="ghost"
                        colorScheme="red"
                        icon={<Icon as={Trash2} boxSize={4} />}
                        aria-label="Delete Plan"
                        onClick={e => {
                          e.stopPropagation();
                          handleDeletePlan(plan.id);
                        }}
                      />
                    </Tooltip>
                  </HStack>
                </HStack>
              </VStack>
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>
    </VStack>
  );
};

export default PracticePlanLibrary;
