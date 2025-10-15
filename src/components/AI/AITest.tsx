import React, { useState } from 'react';
import { Box, Button, Text, VStack, Heading } from '@chakra-ui/react';
import { aiService } from '../../services/ai/ai-service';

const AITest: React.FC = () => {
  const [testResult, setTestResult] = useState<string>('');

  const testAIService = async () => {
    try {
      setTestResult('Testing AI service...');
      
      // Test with demo data
      const demoTeamProfile = {
        sport: 'basketball',
        playerCount: 5,
        strengths: ['fast break', 'defense'],
        weaknesses: ['free throw shooting'],
        experienceLevel: 'intermediate' as const,
        preferredStyle: 'balanced' as const,
        ageGroup: 'high-school',
        teamName: 'Test Team',
      };

      const demoRequirements = {
        objective: 'scoring' as const,
        difficulty: 'intermediate' as const,
        timeOnShotClock: 15,
        specialSituations: ['end-of-game'],
        playerCount: 5,
      };

      const result = await aiService.generateCustomPlay(
        demoTeamProfile,
        demoRequirements
      );

      if (result.success && result.play) {
        const { play } = result;
        setTestResult(
          `✅ AI Service Test Successful!\n\nGenerated Play: ${play.name}\n\nDescription: ${play.description.substring(0, 120)}...`
        );
      } else {
        setTestResult('⚠️ AI service responded without a play suggestion.');
      }
    } catch (error: any) {
      setTestResult(`❌ AI Service Test Failed: ${error.message}`);
    }
  };

  return (
    <Box p={6}>
      <VStack spacing={4}>
        <Heading>🧠 AI Service Test</Heading>
        <Button onClick={testAIService} colorScheme="blue">
          Test AI Service
        </Button>
        <Text whiteSpace="pre-wrap" textAlign="center">
          {testResult}
        </Text>
      </VStack>
    </Box>
  );
};

export default AITest;
