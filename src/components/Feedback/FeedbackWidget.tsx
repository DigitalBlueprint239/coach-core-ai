import React, { useState } from 'react';
import {
  Box,
  Button,
  Icon,
  IconButton,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Stack,
  Textarea,
  useDisclosure,
  useToast,
  Checkbox,
} from '@chakra-ui/react';
import { MessageSquare, Send } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useBetaProgram } from '../../hooks/useBetaProgram';
import type { BetaFeedback } from '../../services/beta/beta-program.service';

const FeedbackWidget: React.FC = () => {
  const { user, profile } = useAuth();
  const { submitFeedback } = useBetaProgram();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [category, setCategory] = useState<BetaFeedback['category']>('other');
  const [message, setMessage] = useState('');
  const [allowContact, setAllowContact] = useState(true);

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast({ title: 'Please provide feedback details', status: 'warning' });
      return;
    }

    try {
      await submitFeedback({
        userId: profile?.uid || user?.uid || 'anonymous',
        cohortId: 'beta',
        category,
        message,
        metadata: { allowContact },
      } as any);
      toast({ title: 'Thank you for your feedback!', status: 'success' });
      setMessage('');
      setCategory('other');
      onClose();
    } catch (error) {
      toast({
        title: 'Failed to submit feedback',
        description: (error as Error).message,
        status: 'error',
      });
    }
  };

  return (
    <Box position="fixed" bottom={4} right={4} zIndex={1400}>
      <IconButton
        aria-label="Send feedback"
        icon={<Icon as={MessageSquare} />}
        colorScheme="blue"
        size="lg"
        shadow="lg"
        onClick={onOpen}
      />

      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Share feedback</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={4}>
              <Select value={category} onChange={(event) => setCategory(event.target.value as BetaFeedback['category'])}>
                <option value="bug">Bug report</option>
                <option value="feature_request">Feature request</option>
                <option value="ux">UX / usability</option>
                <option value="other">Other</option>
              </Select>
              <Textarea
                minH="160px"
                placeholder="Tell us what happened or how we can improve..."
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
              <Checkbox isChecked={allowContact} onChange={(event) => setAllowContact(event.target.checked)}>
                The team can reach out if more info is needed.
              </Checkbox>
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" leftIcon={<Icon as={Send} />} onClick={handleSubmit}>
              Submit feedback
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default FeedbackWidget;
