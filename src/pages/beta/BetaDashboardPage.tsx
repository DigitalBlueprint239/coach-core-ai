import React from 'react';
import { Box, Container } from '@chakra-ui/react';
import BetaGate from '../../components/beta/BetaGate';
import BetaLaunchDashboard from '../../components/beta/BetaLaunchDashboard';

const BetaDashboardPage: React.FC = () => {
  return (
    <Box bg="gray.50" minH="100vh" py={10}>
      <Container maxW="7xl">
        <BetaGate featureKey="dashboard" analyticsContext={{ surface: 'beta-launch-dashboard' }}>
          <BetaLaunchDashboard />
        </BetaGate>
      </Container>
    </Box>
  );
};

export default BetaDashboardPage;
