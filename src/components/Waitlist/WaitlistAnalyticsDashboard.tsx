import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Card,
  CardBody,
  CardHeader,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Progress,
  useColorModeValue,
  Spinner,
  Alert,
  AlertIcon,
  Select,
  Button,
  Icon,
  Divider,
  Flex,
  Tooltip,
} from '@chakra-ui/react';
import {
  Users,
  TrendingUp,
  Mail,
  Target,
  Award,
  Calendar,
  BarChart3,
  RefreshCw,
  Download,
  Eye,
  Filter,
} from 'lucide-react';
import { collection, query, orderBy, getDocs, where, limit } from 'firebase/firestore';
import { db } from '../../services/firebase/firebase-config';
import { trackUserAction } from '../../services/monitoring';

interface WaitlistAnalytics {
  totalSignups: number;
  signupsBySource: Record<string, number>;
  signupsByRole: Record<string, number>;
  signupsByTeamLevel: Record<string, number>;
  conversionRate: number;
  topReferrers: Array<{ email: string; count: number }>;
  leadScoreDistribution: Record<string, number>;
  recentSignups: Array<{
    email: string;
    name: string;
    role: string;
    teamLevel: string;
    leadScore: number;
    segment: string;
    createdAt: Date;
  }>;
}

interface WaitlistAnalyticsDashboardProps {
  refreshInterval?: number; // in milliseconds
  showRecentSignups?: boolean;
  showTopReferrers?: boolean;
  showLeadScoring?: boolean;
}

const WaitlistAnalyticsDashboard: React.FC<WaitlistAnalyticsDashboardProps> = ({
  refreshInterval = 30000, // 30 seconds
  showRecentSignups = true,
  showTopReferrers = true,
  showLeadScoring = true,
}) => {
  const [analytics, setAnalytics] = useState<WaitlistAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const bgColor = useColorModeValue('white', 'gray.800');
  const cardBg = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.600', 'gray.300');
  const headingColor = useColorModeValue('gray.800', 'white');

  useEffect(() => {
    fetchAnalytics();
    
    if (refreshInterval > 0) {
      const interval = setInterval(fetchAnalytics, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [timeRange, refreshInterval]);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Calculate date range
      const now = new Date();
      const daysAgo = timeRange === 'all' ? 0 : parseInt(timeRange.replace('d', ''));
      const startDate = timeRange === 'all' ? null : new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

      // Build query
      let waitlistQuery = query(
        collection(db, 'waitlist'),
        orderBy('createdAt', 'desc')
      );

      if (startDate) {
        waitlistQuery = query(waitlistQuery, where('createdAt', '>=', startDate));
      }

      const waitlistSnapshot = await getDocs(waitlistQuery);

      const analyticsData: WaitlistAnalytics = {
        totalSignups: waitlistSnapshot.size,
        signupsBySource: {},
        signupsByRole: {},
        signupsByTeamLevel: {},
        conversionRate: 0,
        topReferrers: [],
        leadScoreDistribution: {},
        recentSignups: [],
      };

      const referralsMap = new Map<string, number>();

      waitlistSnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Source breakdown
        analyticsData.signupsBySource[data.source] = (analyticsData.signupsBySource[data.source] || 0) + 1;
        
        // Role breakdown
        analyticsData.signupsByRole[data.role] = (analyticsData.signupsByRole[data.role] || 0) + 1;
        
        // Team level breakdown
        analyticsData.signupsByTeamLevel[data.teamLevel] = (analyticsData.signupsByTeamLevel[data.teamLevel] || 0) + 1;
        
        // Lead score distribution
        const scoreRange = getLeadScoreRange(data.leadScore || 0);
        analyticsData.leadScoreDistribution[scoreRange] = (analyticsData.leadScoreDistribution[scoreRange] || 0) + 1;
        
        // Track referrers
        if (data.referrerEmail) {
          referralsMap.set(data.referrerEmail, (referralsMap.get(data.referrerEmail) || 0) + 1);
        }

        // Recent signups
        if (analyticsData.recentSignups.length < 10) {
          analyticsData.recentSignups.push({
            email: data.email,
            name: data.name,
            role: data.role,
            teamLevel: data.teamLevel,
            leadScore: data.leadScore || 0,
            segment: data.segment || 'cold',
            createdAt: data.createdAt?.toDate() || new Date(),
          });
        }
      });

      // Convert referrals map to array
      analyticsData.topReferrers = Array.from(referralsMap.entries())
        .map(([email, count]) => ({ email, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Calculate conversion rate (placeholder - would need actual conversion data)
      analyticsData.conversionRate = 12.5; // This would come from actual conversion tracking

      setAnalytics(analyticsData);
      setLastUpdated(new Date());

      // Track analytics view
      trackUserAction('waitlist_analytics_viewed', {
        timeRange,
        totalSignups: analyticsData.totalSignups,
      });
    } catch (err: any) {
      console.error('Error fetching waitlist analytics:', err);
      setError(err.message || 'Failed to fetch analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const getLeadScoreRange = (score: number): string => {
    if (score >= 80) return '80-100';
    if (score >= 60) return '60-79';
    if (score >= 40) return '40-59';
    if (score >= 20) return '20-39';
    return '0-19';
  };

  const getSegmentColor = (segment: string): string => {
    switch (segment) {
      case 'high-value': return 'green';
      case 'medium-value': return 'blue';
      case 'low-value': return 'yellow';
      default: return 'gray';
    }
  };

  const exportData = () => {
    if (!analytics) return;
    
    const csvData = [
      ['Email', 'Name', 'Role', 'Team Level', 'Lead Score', 'Segment', 'Source', 'Created At'],
      ...analytics.recentSignups.map(signup => [
        signup.email,
        signup.name,
        signup.role,
        signup.teamLevel,
        signup.leadScore.toString(),
        signup.segment,
        'waitlist',
        signup.createdAt.toISOString(),
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `waitlist-analytics-${timeRange}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    trackUserAction('waitlist_analytics_exported', { timeRange });
  };

  if (isLoading && !analytics) {
    return (
      <Box textAlign="center" py={8}>
        <Spinner size="xl" color="blue.500" />
        <Text mt={4} color={textColor}>Loading analytics...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert status="error" borderRadius="md">
        <AlertIcon />
        <Box>
          <Text fontWeight="semibold">Error loading analytics</Text>
          <Text fontSize="sm">{error}</Text>
        </Box>
      </Alert>
    );
  }

  if (!analytics) {
    return (
      <Alert status="info" borderRadius="md">
        <AlertIcon />
        <Text>No analytics data available</Text>
      </Alert>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      {/* Header */}
      <Flex justify="space-between" align="center" wrap="wrap" gap={4}>
        <VStack align="start" spacing={1}>
          <Heading size="lg" color={headingColor}>
            Waitlist Analytics
          </Heading>
          <Text color={textColor} fontSize="sm">
            {lastUpdated && `Last updated: ${lastUpdated.toLocaleTimeString()}`}
          </Text>
        </VStack>
        
        <HStack spacing={3}>
          <Select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            size="sm"
            width="120px"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </Select>
          
          <Button
            size="sm"
            variant="outline"
            leftIcon={<Icon as={RefreshCw} />}
            onClick={fetchAnalytics}
            isLoading={isLoading}
          >
            Refresh
          </Button>
          
          <Button
            size="sm"
            colorScheme="blue"
            leftIcon={<Icon as={Download} />}
            onClick={exportData}
          >
            Export
          </Button>
        </HStack>
      </Flex>

      {/* Key Metrics */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
        <Card bg={bgColor} borderColor={borderColor}>
          <CardBody>
            <Stat>
              <StatLabel>
                <HStack>
                  <Icon as={Users} boxSize={4} />
                  <Text>Total Signups</Text>
                </HStack>
              </StatLabel>
              <StatNumber fontSize="2xl">{analytics.totalSignups.toLocaleString()}</StatNumber>
              <StatHelpText>
                <StatArrow type="increase" />
                {timeRange === '7d' ? 'This week' : timeRange === '30d' ? 'This month' : 'All time'}
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card bg={bgColor} borderColor={borderColor}>
          <CardBody>
            <Stat>
              <StatLabel>
                <HStack>
                  <Icon as={TrendingUp} boxSize={4} />
                  <Text>Conversion Rate</Text>
                </HStack>
              </StatLabel>
              <StatNumber fontSize="2xl">{analytics.conversionRate}%</StatNumber>
              <StatHelpText>
                <StatArrow type="increase" />
                Waitlist to active users
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card bg={bgColor} borderColor={borderColor}>
          <CardBody>
            <Stat>
              <StatLabel>
                <HStack>
                  <Icon as={Target} boxSize={4} />
                  <Text>High-Value Leads</Text>
                </HStack>
              </StatLabel>
              <StatNumber fontSize="2xl">
                {analytics.leadScoreDistribution['80-100'] || 0}
              </StatNumber>
              <StatHelpText>
                Lead score 80-100
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card bg={bgColor} borderColor={borderColor}>
          <CardBody>
            <Stat>
              <StatLabel>
                <HStack>
                  <Icon as={Award} boxSize={4} />
                  <Text>Top Referrers</Text>
                </HStack>
              </StatLabel>
              <StatNumber fontSize="2xl">{analytics.topReferrers.length}</StatNumber>
              <StatHelpText>
                Active referrers
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Breakdown Charts */}
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
        {/* Signups by Source */}
        <Card bg={bgColor} borderColor={borderColor}>
          <CardHeader>
            <Heading size="md" color={headingColor}>
              Signups by Source
            </Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={3} align="stretch">
              {Object.entries(analytics.signupsBySource)
                .sort(([,a], [,b]) => b - a)
                .map(([source, count]) => (
                  <Box key={source}>
                    <Flex justify="space-between" mb={1}>
                      <Text fontSize="sm" color={textColor} textTransform="capitalize">
                        {source.replace('-', ' ')}
                      </Text>
                      <Text fontSize="sm" fontWeight="semibold">
                        {count}
                      </Text>
                    </Flex>
                    <Progress
                      value={(count / analytics.totalSignups) * 100}
                      size="sm"
                      colorScheme="blue"
                      borderRadius="md"
                    />
                  </Box>
                ))}
            </VStack>
          </CardBody>
        </Card>

        {/* Signups by Role */}
        <Card bg={bgColor} borderColor={borderColor}>
          <CardHeader>
            <Heading size="md" color={headingColor}>
              Signups by Role
            </Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={3} align="stretch">
              {Object.entries(analytics.signupsByRole)
                .sort(([,a], [,b]) => b - a)
                .map(([role, count]) => (
                  <Box key={role}>
                    <Flex justify="space-between" mb={1}>
                      <Text fontSize="sm" color={textColor} textTransform="capitalize">
                        {role.replace('-', ' ')}
                      </Text>
                      <Text fontSize="sm" fontWeight="semibold">
                        {count}
                      </Text>
                    </Flex>
                    <Progress
                      value={(count / analytics.totalSignups) * 100}
                      size="sm"
                      colorScheme="green"
                      borderRadius="md"
                    />
                  </Box>
                ))}
            </VStack>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Lead Score Distribution */}
      {showLeadScoring && (
        <Card bg={bgColor} borderColor={borderColor}>
          <CardHeader>
            <Heading size="md" color={headingColor}>
              Lead Score Distribution
            </Heading>
          </CardHeader>
          <CardBody>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 5 }} spacing={4}>
              {Object.entries(analytics.leadScoreDistribution)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([range, count]) => (
                  <Box key={range} textAlign="center">
                    <Text fontSize="2xl" fontWeight="bold" color={headingColor}>
                      {count}
                    </Text>
                    <Text fontSize="sm" color={textColor}>
                      {range}
                    </Text>
                    <Progress
                      value={(count / analytics.totalSignups) * 100}
                      size="sm"
                      colorScheme={
                        range === '80-100' ? 'green' :
                        range === '60-79' ? 'blue' :
                        range === '40-59' ? 'yellow' :
                        'gray'
                      }
                      mt={2}
                    />
                  </Box>
                ))}
            </SimpleGrid>
          </CardBody>
        </Card>
      )}

      {/* Recent Signups */}
      {showRecentSignups && (
        <Card bg={bgColor} borderColor={borderColor}>
          <CardHeader>
            <Heading size="md" color={headingColor}>
              Recent Signups
            </Heading>
          </CardHeader>
          <CardBody>
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Role</Th>
                  <Th>Team Level</Th>
                  {showLeadScoring && <Th>Lead Score</Th>}
                  {showLeadScoring && <Th>Segment</Th>}
                  <Th>Created</Th>
                </Tr>
              </Thead>
              <Tbody>
                {analytics.recentSignups.map((signup, index) => (
                  <Tr key={index}>
                    <Td fontWeight="medium">{signup.name}</Td>
                    <Td fontSize="sm" color={textColor}>{signup.email}</Td>
                    <Td textTransform="capitalize">{signup.role.replace('-', ' ')}</Td>
                    <Td textTransform="capitalize">{signup.teamLevel.replace('-', ' ')}</Td>
                    {showLeadScoring && (
                      <Td>
                        <Badge
                          colorScheme={
                            signup.leadScore >= 80 ? 'green' :
                            signup.leadScore >= 60 ? 'blue' :
                            signup.leadScore >= 40 ? 'yellow' : 'gray'
                          }
                        >
                          {signup.leadScore}
                        </Badge>
                      </Td>
                    )}
                    {showLeadScoring && (
                      <Td>
                        <Badge colorScheme={getSegmentColor(signup.segment)}>
                          {signup.segment}
                        </Badge>
                      </Td>
                    )}
                    <Td fontSize="sm" color={textColor}>
                      {signup.createdAt.toLocaleDateString()}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </CardBody>
        </Card>
      )}

      {/* Top Referrers */}
      {showTopReferrers && analytics.topReferrers.length > 0 && (
        <Card bg={bgColor} borderColor={borderColor}>
          <CardHeader>
            <Heading size="md" color={headingColor}>
              Top Referrers
            </Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={3} align="stretch">
              {analytics.topReferrers.map((referrer, index) => (
                <Flex key={index} justify="space-between" align="center">
                  <Text fontSize="sm" color={textColor}>{referrer.email}</Text>
                  <Badge colorScheme="blue">{referrer.count} referrals</Badge>
                </Flex>
              ))}
            </VStack>
          </CardBody>
        </Card>
      )}
    </VStack>
  );
};

export default WaitlistAnalyticsDashboard;
