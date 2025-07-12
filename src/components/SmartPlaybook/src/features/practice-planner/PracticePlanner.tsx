import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Input,
  Textarea,
  Select,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Badge,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Spinner,
  useToast,
} from '@chakra-ui/react';

// Stub implementation for useAI hook
const useAI = () => ({
  generatePracticePlan: async (params: any) => ({
    activities: [
      {
        name: 'Warm-up Drills',
        duration: 15,
        description: 'Dynamic stretching and mobility exercises',
        focus: 'Preparation'
      },
      {
        name: 'Skill Development',
        duration: 30,
        description: 'Focused practice on specific skills',
        focus: 'Technique'
      },
      {
        name: 'Team Scrimmage',
        duration: 15,
        description: 'Game-like practice scenarios',
        focus: 'Application'
      }
    ],
    insights: 'AI-generated insights based on your goals and team composition.',
    confidence: 0.85
  })
});

interface PracticePlan {
  id: string;
  title: string;
  duration: number;
  goals: string[];
  activities: Array<{
    name: string;
    duration: number;
    description: string;
    focus: string;
  }>;
  aiInsights: string;
  confidence: number;
  createdAt: Date;
}

const PracticePlanner: React.FC = () => {
  const [duration, setDuration] = useState<number>(60);
  const [goals, setGoals] = useState<string>('');
  const [sport, setSport] = useState<string>('football');
  const [ageGroup, setAgeGroup] = useState<string>('12-14');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [currentPlan, setCurrentPlan] = useState<PracticePlan | null>(null);
  
  const { generatePracticePlan } = useAI();
  const toast = useToast();

  const handleGeneratePlan = async () => {
    if (!goals.trim()) {
      toast({
        title: 'Goals Required',
        description: 'Please enter practice goals before generating a plan.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      const planData = await generatePracticePlan({
        duration,
        goals: goals.split(',').map(g => g.trim()),
        sport,
        ageGroup,
      });

      const newPlan: PracticePlan = {
        id: Date.now().toString(),
        title: `${sport} Practice Plan`,
        duration,
        goals: goals.split(',').map(g => g.trim()),
        activities: planData.activities || [],
        aiInsights: planData.insights || 'AI-generated insights will appear here.',
        confidence: planData.confidence || 0.85,
        createdAt: new Date(),
      };

      setCurrentPlan(newPlan);
      
      toast({
        title: 'Plan Generated!',
        description: 'Your AI-powered practice plan is ready.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Generation Failed',
        description: 'Unable to generate practice plan. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSavePlan = () => {
    if (currentPlan) {
      // Save to localStorage or database
      const savedPlans = JSON.parse(localStorage.getItem('practicePlans') || '[]');
      savedPlans.push(currentPlan);
      localStorage.setItem('practicePlans', JSON.stringify(savedPlans));
      
      toast({
        title: 'Plan Saved!',
        description: 'Practice plan has been saved to your library.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <Box
      bg="white"
      borderRadius="lg"
      boxShadow="base"
      p={6}
      border="1px solid"
      borderColor="gray.200"
    >
      <VStack spacing={6} align="stretch">
        <Box>
          <Heading size="lg" color="brand.600" mb={2}>
            AI Practice Planner
          </Heading>
          <Text color="gray.600">
            Generate personalized practice plans using AI insights
          </Text>
        </Box>

        <VStack spacing={4} align="stretch">
          <HStack spacing={4}>
            <Box flex={1}>
              <Text fontWeight="medium" mb={2}>Sport</Text>
              <Select value={sport} onChange={(e) => setSport(e.target.value)}>
                <option value="football">Football</option>
                <option value="basketball">Basketball</option>
                <option value="soccer">Soccer</option>
                <option value="baseball">Baseball</option>
                <option value="volleyball">Volleyball</option>
              </Select>
            </Box>
            
            <Box flex={1}>
              <Text fontWeight="medium" mb={2}>Age Group</Text>
              <Select value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)}>
                <option value="8-10">8-10 years</option>
                <option value="11-13">11-13 years</option>
                <option value="14-16">14-16 years</option>
                <option value="17-18">17-18 years</option>
              </Select>
            </Box>
          </HStack>

          <Box>
            <Text fontWeight="medium" mb={2}>Practice Duration (minutes)</Text>
            <NumberInput 
              value={duration} 
              onChange={(_, value) => setDuration(value)}
              min={15}
              max={180}
              step={15}
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          </Box>

          <Box>
            <Text fontWeight="medium" mb={2}>Practice Goals</Text>
            <Textarea
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              placeholder="Enter practice goals (e.g., improve passing accuracy, work on team communication, develop shooting skills)"
              rows={3}
            />
          </Box>

          <Button
            colorScheme="blue"
            size="lg"
            onClick={handleGeneratePlan}
            isLoading={isGenerating}
            loadingText="Generating Plan..."
          >
            Generate Practice Plan
          </Button>
        </VStack>

        {currentPlan && (
          <Box
            mt={6}
            p={4}
            bg="blue.50"
            borderRadius="md"
            border="1px solid"
            borderColor="blue.200"
          >
            <VStack spacing={4} align="stretch">
              <HStack justify="space-between">
                <Heading size="md" color="blue.800">
                  {currentPlan.title}
                </Heading>
                <Badge colorScheme="blue" variant="solid">
                  {Math.round(currentPlan.confidence * 100)}% Confidence
                </Badge>
              </HStack>

              <Box>
                <Text fontWeight="medium" mb={2}>Goals:</Text>
                <VStack align="start" spacing={1}>
                  {currentPlan.goals.map((goal, index) => (
                    <Text key={index} fontSize="sm" color="gray.700">
                      • {goal}
                    </Text>
                  ))}
                </VStack>
              </Box>

              <Box>
                <Text fontWeight="medium" mb={2}>Activities:</Text>
                <VStack spacing={3}>
                  {currentPlan.activities.map((activity, index) => (
                    <Box
                      key={index}
                      p={3}
                      bg="white"
                      borderRadius="md"
                      border="1px solid"
                      borderColor="gray.200"
                      w="full"
                    >
                      <HStack justify="space-between" mb={2}>
                        <Text fontWeight="medium">{activity.name}</Text>
                        <Badge colorScheme="green">{activity.duration} min</Badge>
                      </HStack>
                      <Text fontSize="sm" color="gray.600" mb={1}>
                        {activity.description}
                      </Text>
                      <Text fontSize="xs" color="blue.600">
                        Focus: {activity.focus}
                      </Text>
                    </Box>
                  ))}
                </VStack>
              </Box>

              <Box>
                <Text fontWeight="medium" mb={2}>AI Insights:</Text>
                <Text fontSize="sm" color="gray.700">
                  {currentPlan.aiInsights}
                </Text>
              </Box>

              <HStack spacing={3}>
                <Button
                  colorScheme="green"
                  size="sm"
                  onClick={handleSavePlan}
                >
                  Save Plan
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPlan(null)}
                >
                  Generate New Plan
                </Button>
              </HStack>
            </VStack>
          </Box>
        )}
      </VStack>
    </Box>
  );
};

export default PracticePlanner; 