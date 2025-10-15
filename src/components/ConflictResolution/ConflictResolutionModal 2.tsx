import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  VStack,
  HStack,
  Text,
  Box,
  Badge,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useColorModeValue,
  Code,
  Select,
  Textarea,
  FormControl,
  FormLabel,
  FormHelperText,
} from '@chakra-ui/react';
import { ConflictData, ConflictResolution } from '../../services/data/conflict-resolution';

interface ConflictResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflicts: ConflictData[];
  onResolve: (resolutions: ConflictResolution[]) => void;
}

const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  isOpen,
  onClose,
  conflicts,
  onResolve,
}) => {
  const [resolutions, setResolutions] = useState<ConflictResolution[]>([]);
  const [isResolving, setIsResolving] = useState(false);
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const handleResolutionChange = (conflictId: string, resolution: 'local' | 'remote' | 'merge' | 'manual', customValue?: string) => {
    setResolutions(prev => {
      const existing = prev.find(r => r.id === conflictId);
      if (existing) {
        return prev.map(r => 
          r.id === conflictId 
            ? { ...r, resolution, resolvedValue: customValue || (resolution === 'local' ? conflicts.find(c => c.id === conflictId)?.localValue : conflicts.find(c => c.id === conflictId)?.remoteValue) }
            : r
        );
      } else {
        return [...prev, {
          id: conflictId,
          field: conflicts.find(c => c.id === conflictId)?.field || '',
          resolvedValue: customValue || (resolution === 'local' ? conflicts.find(c => c.id === conflictId)?.localValue : conflicts.find(c => c.id === conflictId)?.remoteValue),
          resolution,
          timestamp: new Date(),
          userId: 'current-user',
        }];
      }
    });
  };

  const handleResolve = async () => {
    setIsResolving(true);
    try {
      await onResolve(resolutions);
      onClose();
    } finally {
      setIsResolving(false);
    }
  };

  const getResolutionColor = (resolution: string) => {
    switch (resolution) {
      case 'local': return 'blue';
      case 'remote': return 'green';
      case 'merge': return 'purple';
      case 'manual': return 'orange';
      default: return 'gray';
    }
  };

  const formatValue = (value: unknown) => {
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" isCentered>
      <ModalOverlay />
      <ModalContent maxH="80vh" overflowY="auto">
        <ModalHeader>
          <HStack>
            <Text>Resolve Data Conflicts</Text>
            <Badge colorScheme="orange" variant="solid">
              {conflicts.length} conflicts
            </Badge>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Alert status="warning" borderRadius="md">
              <AlertIcon />
              <Box>
                <AlertTitle>Data Conflicts Detected</AlertTitle>
                <AlertDescription>
                  The following fields have conflicting values between your local changes and the server. 
                  Please choose how to resolve each conflict.
                </AlertDescription>
              </Box>
            </Alert>

            {conflicts.map((conflict) => {
              const resolution = resolutions.find(r => r.id === conflict.id);
              const currentResolution = resolution?.resolution || 'manual';
              
              return (
                <Box key={conflict.id} p={4} border="1px" borderColor={borderColor} borderRadius="md" bg={bgColor}>
                  <VStack spacing={3} align="stretch">
                    <HStack justify="space-between">
                      <Text fontWeight="bold" fontSize="sm" color="gray.600">
                        Field: {conflict.field}
                      </Text>
                      <Badge colorScheme={getResolutionColor(currentResolution)}>
                        {currentResolution}
                      </Badge>
                    </HStack>

                    <HStack spacing={4} align="start">
                      <Box flex={1}>
                        <Text fontSize="sm" fontWeight="medium" color="blue.600" mb={2}>
                          Local Value (Your Changes)
                        </Text>
                        <Code p={2} borderRadius="md" fontSize="xs" whiteSpace="pre-wrap">
                          {formatValue(conflict.localValue)}
                        </Code>
                      </Box>

                      <Box flex={1}>
                        <Text fontSize="sm" fontWeight="medium" color="green.600" mb={2}>
                          Remote Value (Server)
                        </Text>
                        <Code p={2} borderRadius="md" fontSize="xs" whiteSpace="pre-wrap">
                          {formatValue(conflict.remoteValue)}
                        </Code>
                      </Box>
                    </HStack>

                    <FormControl>
                      <FormLabel fontSize="sm">Resolution Strategy</FormLabel>
                      <Select
                        value={currentResolution}
                        onChange={(e) => handleResolutionChange(conflict.id, e.target.value as 'local' | 'remote' | 'merge' | 'manual')}
                        size="sm"
                      >
                        <option value="local">Use Local Value</option>
                        <option value="remote">Use Remote Value</option>
                        <option value="merge">Merge Values</option>
                        <option value="manual">Manual Resolution</option>
                      </Select>
                      <FormHelperText fontSize="xs">
                        {currentResolution === 'local' && 'Keep your local changes'}
                        {currentResolution === 'remote' && 'Use the server value'}
                        {currentResolution === 'merge' && 'Combine both values'}
                        {currentResolution === 'manual' && 'Enter a custom value below'}
                      </FormHelperText>
                    </FormControl>

                    {currentResolution === 'manual' && (
                      <FormControl>
                        <FormLabel fontSize="sm">Custom Value</FormLabel>
                        <Textarea
                          value={resolution?.resolvedValue || ''}
                          onChange={(e) => handleResolutionChange(conflict.id, 'manual', e.target.value)}
                          size="sm"
                          rows={3}
                          fontFamily="mono"
                        />
                      </FormControl>
                    )}

                    {currentResolution === 'merge' && (
                      <Box p={3} bg="purple.50" borderRadius="md">
                        <Text fontSize="sm" fontWeight="medium" color="purple.700" mb={2}>
                          Merged Value Preview
                        </Text>
                        <Code p={2} borderRadius="md" fontSize="xs" whiteSpace="pre-wrap">
                          {formatValue(resolution?.resolvedValue || 'Values will be merged automatically')}
                        </Code>
                      </Box>
                    )}
                  </VStack>
                </Box>
              );
            })}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={3}>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleResolve}
              isLoading={isResolving}
              loadingText="Resolving..."
              isDisabled={resolutions.length !== conflicts.length}
            >
              Resolve All Conflicts
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ConflictResolutionModal;
