import React, { useState } from 'react';
import { Box, VStack, Text, Button, Input, Alert } from '@chakra-ui/react';

// Minimal AI Brain Interface
export interface AIBrainConfig {
  apiKey?: string;
  model?: string;
  temperature?: number;
}

export interface AIResponse {
  content: string;
  confidence: number;
  suggestions?: string[];
}

// Mock AI Service
export class AIBrainService {
  private config: AIBrainConfig;

  constructor(config: AIBrainConfig = {}) {
    this.config = config;
  }

  async generateResponse(prompt: string): Promise<AIResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      content: `Mock AI response to: "${prompt}". This is a placeholder response during recovery.`,
      confidence: 0.8,
      suggestions: [
        "Try a different approach",
        "Consider player safety",
        "Review team formation"
      ]
    };
  }

  async generatePracticePlan(teamContext: any): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return {
      title: "Mock Practice Plan",
      duration: 90,
      activities: [
        { name: "Warm-up", duration: 15, type: "conditioning" },
        { name: "Skill Drills", duration: 30, type: "skills" },
        { name: "Scrimmage", duration: 30, type: "game" },
        { name: "Cool-down", duration: 15, type: "conditioning" }
      ]
    };
  }
}

// AI Brain Component
export const AIBrainSetup: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState<AIResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const aiService = React.useMemo(() => new AIBrainService(), []);

  const handleSubmit = async () => {
    if (!prompt.trim()) return;
    
    setLoading(true);
    try {
      const result = await aiService.generateResponse(prompt);
      setResponse(result);
    } catch (error) {
      console.error('AI request failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p={4}>
      <Box bg="yellow.50" border="1px solid #f6e05e" color="yellow.800" borderRadius="md" p={4} mb={4}>
        ⚠️ AI Brain is in recovery mode - using mock responses
      </Box>
      
      <Text fontSize="lg" fontWeight="bold">AI Coaching Assistant</Text>
      
      <Input
        placeholder="Ask a coaching question..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
      />
      
      <Button 
        colorScheme="blue" 
        onClick={handleSubmit}
        isLoading={loading}
        loadingText="Thinking..."
      >
        Ask AI Coach
      </Button>
      
      {response && (
        <Box bg="gray.50" p={4} borderRadius="md">
          <Text fontWeight="bold" mb={2}>AI Response:</Text>
          <Text>{response.content}</Text>
          {response.suggestions && (
            <VStack mt={3} align="start">
              <Text fontWeight="bold" fontSize="sm">Suggestions:</Text>
              {response.suggestions.map((suggestion, index) => (
                <Text key={index} fontSize="sm" color="gray.600">
                  • {suggestion}
                </Text>
              ))}
            </VStack>
          )}
        </Box>
      )}
    </Box>
  );
};

export default AIBrainSetup; 