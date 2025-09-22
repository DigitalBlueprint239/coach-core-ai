import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Button,
  VStack,
  HStack,
  Select,
  useToast,
} from '@chakra-ui/react';
import { Game, GameFormData } from '../../types/game';

interface GameFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (gameData: GameFormData) => void;
  game?: Game | null;
}

const GameForm: React.FC<GameFormProps> = ({ isOpen, onClose, onSave, game }) => {
  const [formData, setFormData] = useState<GameFormData>({
    opponent: '',
    date: '',
    venue: '',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (game) {
      // Pre-fill form for editing
      setFormData({
        opponent: game.opponent,
        date: game.date.toISOString().slice(0, 16), // Format for datetime-local input
        venue: game.venue,
        notes: game.notes,
      });
    } else {
      // Reset form for new game
      setFormData({
        opponent: '',
        date: '',
        venue: '',
        notes: '',
      });
    }
  }, [game, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.opponent.trim() || !formData.date || !formData.venue.trim()) {
      toast({
        title: 'Missing required fields',
        description: 'Please fill in opponent, date, and venue.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave(formData);
      toast({
        title: game ? 'Game updated' : 'Game created',
        description: `Successfully ${game ? 'updated' : 'created'} game vs ${formData.opponent}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error saving game:', error);
      toast({
        title: 'Error',
        description: 'Failed to save game. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof GameFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <form onSubmit={handleSubmit}>
          <ModalHeader>
            {game ? 'Edit Game' : 'Add New Game'}
          </ModalHeader>
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Opponent Team</FormLabel>
                <Input
                  value={formData.opponent}
                  onChange={(e) => handleInputChange('opponent', e.target.value)}
                  placeholder="Enter opponent team name"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Date & Time</FormLabel>
                <Input
                  type="datetime-local"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Venue</FormLabel>
                <Input
                  value={formData.venue}
                  onChange={(e) => handleInputChange('venue', e.target.value)}
                  placeholder="Enter venue name or address"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Notes (Optional)</FormLabel>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Any additional notes about this game"
                  rows={3}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack spacing={3}>
              <Button variant="ghost" onClick={onClose} isDisabled={isSubmitting}>
                Cancel
              </Button>
              <Button 
                colorScheme="blue" 
                type="submit"
                isLoading={isSubmitting}
                loadingText={game ? 'Updating...' : 'Creating...'}
              >
                {game ? 'Update Game' : 'Create Game'}
              </Button>
            </HStack>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};

export default GameForm;
