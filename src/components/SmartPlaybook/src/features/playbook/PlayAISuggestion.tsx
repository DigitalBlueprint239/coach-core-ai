import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Badge,
  Alert,
  AlertTitle,
  AlertDescription,
  Spinner,
  useToast,
  Divider,
  Icon,
} from '@chakra-ui/react';
import { useAI } from '../../ai-brain/AIContext';

interface PlayContext {
  down: number;
  distance: number;
  fieldPosition: string;
  opponent: string;
  timeRemaining?: string;
  score?: string;
  weather?: string;
}

interface PlaySuggestion {
  id: string;
  playName: string;
  description: string;
  formation: string;
  keyPlayers: string[];
  reasoning: string;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
  expectedOutcome: string;
}

const PlayAISuggestion: React.FC<{ playContext: PlayContext }> = ({ playContext }) => {
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [currentSuggestion, setCurrentSuggestion] = useState<PlaySuggestion | null>(null);
  const [suggestionHistory, setSuggestionHistory] = useState<PlaySuggestion[]>([]);
  
  const { generatePlaySuggestion } = useAI();
  const toast = useToast();

  const handleGenerateSuggestion = async () => {
    setIsGenerating(true);
    
    try {
      const suggestionData = await generatePlaySuggestion(playContext);

      const newSuggestion: PlaySuggestion = {
        id: Date.now().toString(),
        playName: suggestionData.playName || 'AI Recommended Play',
        description: suggestionData.description || 'Strategic play recommendation based on current game situation.',
        formation: suggestionData.formation || 'Standard Formation',
        keyPlayers: suggestionData.keyPlayers || ['QB', 'RB', 'WR'],
        reasoning: suggestionData.reasoning || 'AI analysis of current game context and opponent tendencies.',
        confidence: suggestionData.confidence || 0.82,
        riskLevel: suggestionData.riskLevel || 'medium',
        expectedOutcome: suggestionData.expectedOutcome || 'Expected positive yardage gain.',
      };

      setCurrentSuggestion(newSuggestion);
      setSuggestionHistory(prev => [newSuggestion, ...prev.slice(0, 2)]);
      
      toast({
        title: 'Play Suggestion Ready!',
        description: 'AI has analyzed the situation and provided a recommendation.',
        status: 'success',
        duration: 4000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Suggestion Failed',
        description: 'Unable to generate play suggestion. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'green';
      case 'medium': return 'yellow';
      case 'high': return 'red';
      default: return 'gray';
    }
  };

  const getFieldPositionColor = (position: string) => {
    if (position.includes('red_zone')) return 'red';
    if (position.includes('goal')) return 'orange';
    return 'blue';
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
            AI Play Suggestions
          </Heading>
          <Text color="gray.600">
            Real-time strategic recommendations based on game context
          </Text>
        </Box>

        {/* Game Context Display */}
        <Box
          bg="gray.50"
          borderRadius="md"
          p={4}
          border="1px solid"
          borderColor="gray.200"
        >
          <Text fontWeight="medium" mb={3}>Current Game Situation:</Text>
          <HStack spacing={4} flexWrap="wrap">
            <Badge colorScheme="blue" variant="subtle">
              {playContext.down}rd & {playContext.distance}
            </Badge>
            <Badge 
              colorScheme={getFieldPositionColor(playContext.fieldPosition)} 
              variant="subtle"
            >
              {playContext.fieldPosition.replace('_', ' ')}
            </Badge>
            <Badge colorScheme="purple" variant="subtle">
              vs {playContext.opponent}
            </Badge>
            {playContext.timeRemaining && (
              <Badge colorScheme="orange" variant="subtle">
                {playContext.timeRemaining}
              </Badge>
            )}
          </HStack>
        </Box>

        <Button
          colorScheme="blue"
          size="lg"
          onClick={handleGenerateSuggestion}
          isLoading={isGenerating}
          loadingText="Analyzing Situation..."
          leftIcon={isGenerating ? <Spinner size="sm" /> : undefined}
        >
          Get AI Suggestion
        </Button>

        {currentSuggestion && (
          <Box
            bg="blue.50"
            borderRadius="md"
            p={4}
            border="1px solid"
            borderColor="blue.200"
          >
            <VStack spacing={4} align="stretch">
              <HStack justify="space-between">
                <Heading size="md" color="blue.700">
                  {currentSuggestion.playName}
                </Heading>
                <Badge colorScheme="green" variant="subtle">
                  {Math.round(currentSuggestion.confidence * 100)}% Confidence
                </Badge>
              </HStack>

              <Text color="blue.800">
                {currentSuggestion.description}
              </Text>

              <HStack spacing={4}>
                <Box>
                  <Text fontWeight="medium" fontSize="sm" color="blue.700">Formation:</Text>
                  <Text fontSize="sm">{currentSuggestion.formation}</Text>
                </Box>
                <Box>
                  <Text fontWeight="medium" fontSize="sm" color="blue.700">Risk Level:</Text>
                  <Badge 
                    colorScheme={getRiskColor(currentSuggestion.riskLevel)} 
                    size="sm"
                  >
                    {currentSuggestion.riskLevel.toUpperCase()}
                  </Badge>
                </Box>
              </HStack>

              <Box>
                <Text fontWeight="medium" fontSize="sm" color="blue.700" mb={1}>
                  Key Players:
                </Text>
                <HStack spacing={2} flexWrap="wrap">
                  {currentSuggestion.keyPlayers.map((player, index) => (
                    <Badge key={index} colorScheme="blue" variant="outline" size="sm">
                      {player}
                    </Badge>
                  ))}
                </HStack>
              </Box>

              <Alert status="info" borderRadius="md">
                <Box>
                  <AlertTitle>AI Reasoning</AlertTitle>
                  <AlertDescription>
                    {currentSuggestion.reasoning}
                  </AlertDescription>
                </Box>
              </Alert>

              <Box>
                <Text fontWeight="medium" fontSize="sm" color="blue.700" mb={1}>
                  Expected Outcome:
                </Text>
                <Text fontSize="sm" color="blue.800">
                  {currentSuggestion.expectedOutcome}
                </Text>
              </Box>

              <HStack spacing={3}>
                <Button variant="outline" size="sm">
                  Accept Suggestion
                </Button>
                <Button variant="ghost" size="sm">
                  Modify Play
                </Button>
                <Button variant="ghost" size="sm">
                  Get Alternative
                </Button>
              </HStack>
            </VStack>
          </Box>
        )}

        {suggestionHistory.length > 0 && (
          <Box>
            <Text fontWeight="medium" mb={3}>Recent Suggestions:</Text>
            <VStack spacing={2} align="stretch">
              {suggestionHistory.slice(1).map((suggestion) => (
                <Box
                  key={suggestion.id}
                  bg="gray.50"
                  p={3}
                  borderRadius="md"
                  border="1px solid"
                  borderColor="gray.200"
                >
                  <HStack justify="space-between" mb={1}>
                    <Text fontWeight="medium" fontSize="sm">
                      {suggestion.playName}
                    </Text>
                    <Badge 
                      colorScheme={getRiskColor(suggestion.riskLevel)} 
                      size="sm"
                    >
                      {suggestion.riskLevel}
                    </Badge>
                  </HStack>
                  <Text fontSize="xs" color="gray.600">
                    {suggestion.description}
                  </Text>
                </Box>
              ))}
            </VStack>
          </Box>
        )}
      </VStack>
    </Box>
  );
};

export default PlayAISuggestion; 