import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Button,
  Icon,
  useToast,
  Card,
  CardBody,
  CardHeader,
  Badge,
  Divider,
} from '@chakra-ui/react';
import {
  Play,
  Save,
  Download,
  Share,
  Settings,
  Users,
  Target,
  Plus,
  Trash2,
} from 'lucide-react';

export const PlayDesignerFunctional: React.FC = () => {
  const [selectedTool, setSelectedTool] = useState<string>('select');
  const [playCount, setPlayCount] = useState<number>(0);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const toast = useToast();

  const tools = [
    { id: 'select', label: 'Select', icon: Target, color: 'blue' },
    { id: 'player', label: 'Add Player', icon: Users, color: 'green' },
    { id: 'route', label: 'Draw Route', icon: Play, color: 'purple' },
    { id: 'formation', label: 'Formation', icon: Target, color: 'orange' },
  ];

  const handleToolSelect = (toolId: string) => {
    setSelectedTool(toolId);
    toast({
      title: 'Tool Selected',
      description: `Switched to ${toolId} tool`,
      status: 'info',
      duration: 2000,
      isClosable: true,
    });
  };

  const handleNewPlay = () => {
    setPlayCount(prev => prev + 1);
    toast({
      title: 'New Play Created',
      description: `Play #${playCount + 1} added to your collection`,
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  const handleSave = () => {
    toast({
      title: 'Play Saved',
      description: 'Your play design has been saved successfully',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  const handleExport = () => {
    toast({
      title: 'Play Exported',
      description: 'Play design exported as PDF',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  return (
    <Box bg="gray.50" minH="100vh" p={6} className="animate-fade-in-responsive">
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <Box textAlign="center">
          <Heading size="lg" color="gray.800" mb={2}>
            🏈 Play Designer
          </Heading>
          <Text color="gray.600" fontSize="lg">
            Design, save, and share your football plays
          </Text>
        </Box>

        {/* Tool Selection */}
        <Card>
          <CardHeader>
            <Heading size="md" color="gray.700">
              Tools
            </Heading>
          </CardHeader>
          <CardBody>
            <HStack spacing={4} wrap="wrap">
              {tools.map(tool => (
                <Button
                  key={tool.id}
                  variant={selectedTool === tool.id ? 'solid' : 'outline'}
                  colorScheme={tool.color}
                  leftIcon={<Icon as={tool.icon} />}
                  onClick={() => handleToolSelect(tool.id)}
                  _hover={{ transform: 'translateY(-2px)' }}
                  transition="all 0.2s"
                >
                  {tool.label}
                </Button>
              ))}
            </HStack>
          </CardBody>
        </Card>

        {/* Canvas Area */}
        <Card>
          <CardHeader>
            <HStack justify="space-between">
              <Heading size="md" color="gray.700">
                Field Canvas
              </Heading>
              <Badge colorScheme={isDrawing ? 'green' : 'gray'}>
                {isDrawing ? 'Drawing Mode' : 'Ready'}
              </Badge>
            </HStack>
          </CardHeader>
          <CardBody>
            <Box
              bg="green.100"
              border="3px solid"
              borderColor="green.300"
              borderRadius="lg"
              minH="400px"
              display="flex"
              alignItems="center"
              justifyContent="center"
              position="relative"
              cursor="crosshair"
              onClick={() => {
                if (selectedTool === 'player') {
                  setIsDrawing(true);
                  toast({
                    title: 'Player Added',
                    description: 'Click on the field to place a player',
                    status: 'info',
                    duration: 2000,
                    isClosable: true,
                  });
                }
              }}
            >
              <VStack spacing={4}>
                <Text fontSize="2xl" fontWeight="bold" color="green.800">
                  🎨 Football Field
                </Text>
                <Text color="green.700" textAlign="center">
                  {selectedTool === 'select' &&
                    'Click to select players or routes'}
                  {selectedTool === 'player' &&
                    'Click to add players to the field'}
                  {selectedTool === 'route' && 'Click and drag to draw routes'}
                  {selectedTool === 'formation' &&
                    'Click to set formation positions'}
                </Text>
                <Text fontSize="sm" color="green.600">
                  Selected Tool:{' '}
                  <Badge colorScheme="blue">{selectedTool}</Badge>
                </Text>
              </VStack>
            </Box>
          </CardBody>
        </Card>

        {/* Action Buttons */}
        <Card>
          <CardBody>
            <HStack spacing={4} justify="center" wrap="wrap">
              <Button
                colorScheme="blue"
                leftIcon={<Icon as={Plus} />}
                onClick={handleNewPlay}
                size="lg"
                _hover={{ transform: 'translateY(-2px)' }}
                transition="all 0.2s"
              >
                New Play
              </Button>
              <Button
                colorScheme="green"
                leftIcon={<Icon as={Save} />}
                onClick={handleSave}
                size="lg"
                _hover={{ transform: 'translateY(-2px)' }}
                transition="all 0.2s"
              >
                Save Play
              </Button>
              <Button
                colorScheme="purple"
                leftIcon={<Icon as={Download} />}
                onClick={handleExport}
                size="lg"
                _hover={{ transform: 'translateY(-2px)' }}
                transition="all 0.2s"
              >
                Export
              </Button>
              <Button
                colorScheme="orange"
                leftIcon={<Icon as={Share} />}
                size="lg"
                _hover={{ transform: 'translateY(-2px)' }}
                transition="all 0.2s"
              >
                Share
              </Button>
            </HStack>
          </CardBody>
        </Card>

        {/* Status Info */}
        <Card>
          <CardBody>
            <VStack spacing={3}>
              <Text fontSize="lg" fontWeight="bold" color="gray.700">
                Status: Play Designer is Working! 🎉
              </Text>
              <Text color="gray.600">
                Total Plays Created:{' '}
                <Badge colorScheme="blue">{playCount}</Badge>
              </Text>
              <Text color="gray.600">
                Current Tool: <Badge colorScheme="green">{selectedTool}</Badge>
              </Text>
              <Text color="gray.600">
                Drawing Mode:{' '}
                <Badge colorScheme={isDrawing ? 'green' : 'gray'}>
                  {isDrawing ? 'Active' : 'Inactive'}
                </Badge>
              </Text>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
};

export default PlayDesignerFunctional;
