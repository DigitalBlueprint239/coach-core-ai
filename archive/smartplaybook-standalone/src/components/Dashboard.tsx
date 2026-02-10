import React from 'react';
import { Box, Container, Heading, VStack, SimpleGrid, Text } from '../components/ui';
import { Button } from '@chakra-ui/react';
import PracticePlanner from '../features/practice-planner/PracticePlanner';
import PlayAISuggestion from '../features/playbook/PlayAISuggestion';
import ProgressAnalytics from '../features/analytics/ProgressAnalytics';

const Dashboard = () => {
  const samplePlayContext = {
    down: 3,
    distance: 7,
    fieldPosition: 'red_zone',
    opponent: 'Rival High',
  };

  return (
    <Container maxW="6xl" py={8}>
      <VStack spacing={8} align="stretch">
        <Box textAlign="center">
          <Heading 
            as="h1" 
            size="2xl" 
            color="brand.600"
            mb={2}
          >
            Coach Core AI Dashboard
          </Heading>
          <Heading 
            as="h2" 
            size="md" 
            color="gray.600"
            fontWeight="normal"
          >
            Your AI-powered coaching assistant
          </Heading>
        </Box>
        
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={8}>
          <PracticePlanner />
          <PlayAISuggestion playContext={samplePlayContext} />
        </SimpleGrid>
        
        <ProgressAnalytics 
          userId={'demo-user'} 
          metricType={'speed'} 
          timeRange={{ 
            start: new Date(Date.now() - 7*24*60*60*1000), 
            end: new Date() 
          }} 
        />
      </VStack>
    </Container>
  );
};

export default Dashboard; 