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
  Textarea,
  Select,
  VStack,
  HStack,
  Text,
  useToast,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Spinner,
  Box,
  Badge,
  Divider
} from '@chakra-ui/react';
import { feedbackService } from '../../services/feedback/feedback-service';
import { useAuth } from '../../hooks/useAuth';
import { trackEvent } from '../../services/analytics';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const [feedback, setFeedback] = useState('');
  const [category, setCategory] = useState<'bug' | 'feature' | 'ui' | 'performance' | 'other'>('other');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const toast = useToast();
  const { user, profile } = useAuth();

  // Track when modal is opened
  React.useEffect(() => {
    if (isOpen) {
      trackEvent('feedback_modal_opened', {
        event_category: 'feedback',
        event_label: 'modal_opened',
        has_user: !!user
      });
    }
  }, [isOpen, user]);

  const handleSubmit = async () => {
    if (!feedback.trim()) {
      toast({
        title: 'Feedback required',
        description: 'Please enter your feedback before submitting.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Track feedback modal interaction
    trackEvent('feedback_modal_submit_attempt', {
      event_category: 'feedback',
      event_label: 'modal_submit',
      category,
      priority,
      has_user: !!user
    });

    setIsSubmitting(true);
    try {
      await feedbackService.submitFeedback(
        feedback,
        category,
        priority,
        user?.uid,
        user?.email || profile?.email
      );

      setIsSubmitted(true);
      toast({
        title: 'Feedback submitted!',
        description: 'Thank you for your feedback. We\'ll review it soon.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      // Track successful submission
      trackEvent('feedback_modal_submit_success', {
        event_category: 'feedback',
        event_label: 'modal_submit_success',
        category,
        priority,
        has_user: !!user
      });

      // Reset form after a delay
      setTimeout(() => {
        setFeedback('');
        setCategory('other');
        setPriority('medium');
        setIsSubmitted(false);
        onClose();
      }, 2000);
    } catch (error: any) {
      // Track submission error
      trackEvent('feedback_modal_submit_error', {
        event_category: 'feedback',
        event_label: 'modal_submit_error',
        category,
        priority,
        error: error.message,
        has_user: !!user
      });

      toast({
        title: 'Submission failed',
        description: error.message || 'Failed to submit feedback. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFeedback('');
      setCategory('other');
      setPriority('medium');
      setIsSubmitted(false);
      onClose();
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'red';
      case 'high': return 'orange';
      case 'medium': return 'yellow';
      case 'low': return 'green';
      default: return 'gray';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'bug': return '🐛';
      case 'feature': return '✨';
      case 'ui': return '🎨';
      case 'performance': return '⚡';
      case 'other': return '💬';
      default: return '💬';
    }
  };

  if (isSubmitted) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader color="green.500">✅ Feedback Submitted!</ModalHeader>
          <ModalBody>
            <VStack spacing={4} textAlign="center">
              <Text fontSize="lg" color="gray.600">
                Thank you for your feedback! We'll review it and get back to you if needed.
              </Text>
              <Box>
                <Badge colorScheme={getPriorityColor(priority)} size="lg">
                  {getCategoryIcon(category)} {category} • {priority}
                </Badge>
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button onClick={handleClose} colorScheme="green">
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} isCentered size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <HStack spacing={2}>
            <Text>💬 Staging Feedback</Text>
            <Badge colorScheme="blue" variant="subtle">
              Beta
            </Badge>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Text color="gray.600" fontSize="sm">
              Help us improve Coach Core AI by sharing your feedback, reporting bugs, or suggesting features.
            </Text>

            <FormControl isRequired>
              <FormLabel>Feedback</FormLabel>
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Describe your feedback, bug report, or feature request..."
                rows={4}
                resize="vertical"
                maxLength={1000}
              />
              <Text fontSize="xs" color="gray.500" textAlign="right">
                {feedback.length}/1000 characters
              </Text>
            </FormControl>

            <HStack spacing={4}>
              <FormControl>
                <FormLabel>Category</FormLabel>
                <Select value={category} onChange={(e) => setCategory(e.target.value as any)}>
                  <option value="bug">🐛 Bug Report</option>
                  <option value="feature">✨ Feature Request</option>
                  <option value="ui">🎨 UI/UX Issue</option>
                  <option value="performance">⚡ Performance Issue</option>
                  <option value="other">💬 General Feedback</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Priority</FormLabel>
                <Select value={priority} onChange={(e) => setPriority(e.target.value as any)}>
                  <option value="low">🟢 Low</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="high">🟠 High</option>
                  <option value="critical">🔴 Critical</option>
                </Select>
              </FormControl>
            </HStack>

            <Divider />

            <Box p={3} bg="blue.50" borderRadius="md">
              <Text fontSize="sm" color="blue.700">
                <strong>Note:</strong> This feedback is only visible to the development team and will help us improve the app.
              </Text>
            </Box>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={3}>
            <Button variant="ghost" onClick={handleClose} isDisabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleSubmit}
              isLoading={isSubmitting}
              loadingText="Submitting..."
              isDisabled={!feedback.trim()}
            >
              Submit Feedback
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default FeedbackModal;
