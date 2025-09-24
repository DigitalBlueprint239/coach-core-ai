import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Container,
  useColorModeValue,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Divider,
  Badge,
  Icon,
  SimpleGrid,
  Card,
  CardBody,
  CardHeader,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
} from '@chakra-ui/react';
import {
  Users,
  Mail,
  BarChart3,
  Settings,
  Target,
  TrendingUp,
  Award,
  Clock,
  Star,
  CheckCircle,
} from 'lucide-react';
import WaitlistLandingPage from '../components/Waitlist/WaitlistLandingPage';
import WaitlistAnalyticsDashboard from '../components/Waitlist/WaitlistAnalyticsDashboard';
import WaitlistManagementPanel from '../components/Waitlist/WaitlistManagementPanel';
import EnhancedWaitlistForm from '../components/Waitlist/EnhancedWaitlistForm';

interface WaitlistPageProps {
  mode?: 'landing' | 'analytics' | 'management' | 'form';
  variant?: 'beta' | 'launch' | 'pre-launch';
  enableMarketingFields?: boolean;
  enableLeadScoring?: boolean;
  enableReferrals?: boolean;
  showAdminFeatures?: boolean;
}

const WaitlistPage: React.FC<WaitlistPageProps> = ({
  mode = 'landing',
  variant = 'pre-launch',
  enableMarketingFields = true,
  enableLeadScoring = true,
  enableReferrals = true,
  showAdminFeatures = false,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  
  const bgColor = useColorModeValue('white', 'gray.900');
  const cardBg = useColorModeValue('gray.50', 'gray.800');
  const textColor = useColorModeValue('gray.600', 'gray.300');
  const headingColor = useColorModeValue('gray.800', 'white');

  // Quick stats for admin dashboard
  const quickStats = [
    {
      label: 'Total Signups',
      value: '1,247',
      change: '+12%',
      changeType: 'increase' as const,
      icon: Users,
      color: 'blue',
    },
    {
      label: 'High-Value Leads',
      value: '89',
      change: '+8%',
      changeType: 'increase' as const,
      icon: Target,
      color: 'green',
    },
    {
      label: 'Conversion Rate',
      value: '12.5%',
      change: '+2.1%',
      changeType: 'increase' as const,
      icon: TrendingUp,
      color: 'purple',
    },
    {
      label: 'Email Open Rate',
      value: '45.2%',
      change: '+5.3%',
      changeType: 'increase' as const,
      icon: Mail,
      color: 'orange',
    },
  ];

  if (mode === 'landing') {
    return (
      <WaitlistLandingPage
        variant={variant}
        showStats={true}
        showTestimonials={true}
        showFeatures={true}
        showPricing={false}
        showSocialProof={true}
        enableMarketingFields={enableMarketingFields}
        enableLeadScoring={enableLeadScoring}
        enableReferrals={enableReferrals}
      />
    );
  }

  if (mode === 'form') {
    return (
      <Container maxW="2xl" py={20}>
        <VStack spacing={8}>
          <VStack spacing={4} textAlign="center">
            <Heading size="xl" color={headingColor}>
              Join the Waitlist
            </Heading>
            <Text color={textColor} fontSize="lg">
              Be the first to experience the future of coaching with AI
            </Text>
          </VStack>
          
          <EnhancedWaitlistForm
            variant={variant}
            showFeatures={true}
            autoInvite={variant === 'beta'}
            showMarketingFields={enableMarketingFields}
            showReferralField={enableReferrals}
            enableLeadScoring={enableLeadScoring}
            onSuccess={(entry) => {
              console.log('Waitlist signup successful:', entry);
            }}
          />
        </VStack>
      </Container>
    );
  }

  if (mode === 'analytics') {
    return (
      <Box bg={bgColor} minH="100vh">
        <Container maxW="7xl" py={8}>
          <VStack spacing={6} align="stretch">
            <VStack spacing={2} textAlign="center">
              <Heading size="lg" color={headingColor}>
                Waitlist Analytics
              </Heading>
              <Text color={textColor}>
                Track your waitlist performance and user engagement
              </Text>
            </VStack>
            
            <WaitlistAnalyticsDashboard
              showRecentSignups={true}
              showTopReferrers={true}
              showLeadScoring={true}
            />
          </VStack>
        </Container>
      </Box>
    );
  }

  if (mode === 'management') {
    return (
      <Box bg={bgColor} minH="100vh">
        <Container maxW="7xl" py={8}>
          <VStack spacing={6} align="stretch">
            <VStack spacing={2} textAlign="center">
              <Heading size="lg" color={headingColor}>
                Waitlist Management
              </Heading>
              <Text color={textColor}>
                Manage users, campaigns, and analytics
              </Text>
            </VStack>
            
            <WaitlistManagementPanel
              showAnalytics={true}
              showEmailCampaigns={true}
              showUserManagement={true}
              enableBulkActions={true}
              enableEmailSending={true}
            />
          </VStack>
        </Container>
      </Box>
    );
  }

  // Admin dashboard with tabs
  return (
    <Box bg={bgColor} minH="100vh">
      <Container maxW="7xl" py={8}>
        <VStack spacing={6} align="stretch">
          {/* Header */}
          <VStack spacing={4} textAlign="center">
            <Heading size="xl" color={headingColor}>
              Waitlist Administration
            </Heading>
            <Text color={textColor} fontSize="lg">
              Manage your waitlist, campaigns, and analytics
            </Text>
          </VStack>

          {/* Quick Stats */}
          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
            {quickStats.map((stat, index) => (
              <Card key={index} bg={cardBg} borderColor="gray.200">
                <CardBody>
                  <Stat>
                    <StatLabel>
                      <HStack>
                        <Icon as={stat.icon} boxSize={4} color={`${stat.color}.500`} />
                        <Text>{stat.label}</Text>
                      </HStack>
                    </StatLabel>
                    <StatNumber fontSize="2xl">{stat.value}</StatNumber>
                    <StatHelpText>
                      <StatArrow type={stat.changeType} />
                      {stat.change}
                    </StatHelpText>
                  </Stat>
                </CardBody>
              </Card>
            ))}
          </SimpleGrid>

          {/* Main Content Tabs */}
          <Tabs index={activeTab} onChange={setActiveTab}>
            <TabList>
              <Tab>
                <HStack>
                  <Icon as={Users} boxSize={4} />
                  <Text>User Management</Text>
                </HStack>
              </Tab>
              <Tab>
                <HStack>
                  <Icon as={Mail} boxSize={4} />
                  <Text>Email Campaigns</Text>
                </HStack>
              </Tab>
              <Tab>
                <HStack>
                  <Icon as={BarChart3} boxSize={4} />
                  <Text>Analytics</Text>
                </HStack>
              </Tab>
              <Tab>
                <HStack>
                  <Icon as={Settings} boxSize={4} />
                  <Text>Settings</Text>
                </HStack>
              </Tab>
            </TabList>

            <TabPanels>
              <TabPanel p={0}>
                <WaitlistManagementPanel
                  showAnalytics={false}
                  showEmailCampaigns={false}
                  showUserManagement={true}
                  enableBulkActions={true}
                  enableEmailSending={true}
                />
              </TabPanel>
              
              <TabPanel p={0}>
                <WaitlistManagementPanel
                  showAnalytics={false}
                  showEmailCampaigns={true}
                  showUserManagement={false}
                  enableBulkActions={false}
                  enableEmailSending={true}
                />
              </TabPanel>
              
              <TabPanel p={0}>
                <WaitlistAnalyticsDashboard
                  showRecentSignups={true}
                  showTopReferrers={true}
                  showLeadScoring={true}
                />
              </TabPanel>
              
              <TabPanel p={0}>
                <Card bg={cardBg} borderColor="gray.200">
                  <CardHeader>
                    <Heading size="md" color={headingColor}>
                      Waitlist Settings
                    </Heading>
                  </CardHeader>
                  <CardBody>
                    <VStack spacing={4} align="stretch">
                      <Text color={textColor}>
                        Configure your waitlist settings, email templates, and automation rules.
                      </Text>
                      <HStack spacing={4}>
                        <Button colorScheme="blue" size="sm">
                          Email Templates
                        </Button>
                        <Button colorScheme="blue" size="sm">
                          Automation Rules
                        </Button>
                        <Button colorScheme="blue" size="sm">
                          Integration Settings
                        </Button>
                      </HStack>
                    </VStack>
                  </CardBody>
                </Card>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </VStack>
      </Container>
    </Box>
  );
};

export default WaitlistPage;
