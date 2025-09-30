import React from 'react';
import {
  Icon,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  useBreakpointValue,
  Button,
  HStack,
} from '@chakra-ui/react';
import { ClipboardList, LineChart, Settings } from 'lucide-react';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import WaitlistManager from '../../features/admin/components/WaitlistManager';

const AdminDashboard: React.FC = () => {
  const variant = useBreakpointValue<'enclosed' | 'line'>({ base: 'line', md: 'enclosed' });

  return (
    <DashboardLayout
      title="Admin Console"
      subtitle="Manage waitlist conversions, analytics, and platform configuration"
      actions={
        <HStack spacing={3}>
          <Button leftIcon={<Icon as={Settings} />} variant="outline" colorScheme="gray">
            Settings
          </Button>
        </HStack>
      }
    >
      <Tabs variant={variant} colorScheme="blue" isFitted>
        <TabList>
          <Tab>
            <Icon as={ClipboardList} mr={2} /> Waitlist
          </Tab>
          <Tab>
            <Icon as={LineChart} mr={2} /> Analytics
          </Tab>
          <Tab>
            <Icon as={Settings} mr={2} /> Platform
          </Tab>
        </TabList>
        <TabPanels mt={6}>
          <TabPanel px={0}>
            <WaitlistManager />
          </TabPanel>
          <TabPanel>
            Coming soon: analytics overview
          </TabPanel>
          <TabPanel>
            Coming soon: platform configuration
          </TabPanel>
        </TabPanels>
      </Tabs>
    </DashboardLayout>
  );
};

export default AdminDashboard;
