import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChakraProvider from '@chakra-ui/react';
import BrowserRouter from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import AIPlayGenerator from '../../components/AI/AIPlayGenerator';
import AIService from '../../services/ai/ai-service';
import { useAuth } from '../../hooks/useAuth';
import { subscriptionService } from '../../services/subscription/subscription-service';

// Mock AI Service
const mockGenerateCustomPlay = vi.fn();
const mockGeneratePracticePlan = vi.fn();
const mockAnalyzePlayerPerformance = vi.fn();

vi.mock('../../services/ai/ai-service', () => ({
  AIService: {
    generateCustomPlay: mockGenerateCustomPlay,
    generatePracticePlan: mockGeneratePracticePlan,
    analyzePlayerPerformance: mockAnalyzePlayerPerformance
  }
}));

// Mock auth hook
const mockUseAuth = {
  user: {
    uid: 'test-user-123',
    email: 'test@example.com',
    displayName: 'Test User'
  },
  profile: {
    id: 'test-user-123',
    email: 'test@example.com',
    displayName: 'Test User',
    subscription: { plan: 'pro', status: 'active' }
  },
  isAuthenticated: true
};

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth
}));

// Mock subscription service
vi.mock('../../services/subscription/subscription-service', () => ({
  subscriptionService: {
    getUserProfile: vi.fn(),
    getUserSubscription: vi.fn()
  }
}));

// Mock React Router
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

// Mock Chakra UI toast
const mockToast = vi.fn();
vi.mock('@chakra-ui/react', async () => {
  const actual = await vi.importActual('@chakra-ui/react');
  return {
    ...actual,
    useToast: () => mockToast
  };
});

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ChakraProvider>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </ChakraProvider>
    </QueryClientProvider>
  );
};

describe('AI Play Generation - Comprehensive Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AIPlayGenerator Component', () => {
    it('should render play generator form with all required fields', () => {
      render(
        <TestWrapper>
          <AIPlayGenerator />
        </TestWrapper>
      );

      expect(screen.getByText(/ai play generator/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/sport/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/player count/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/experience level/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/play objective/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/difficulty level/i)).toBeInTheDocument();
    });

    it('should handle successful play generation', async () => {
      const mockGeneratedPlay = {
        name: 'Fast Break Play',
        description: 'A quick transition play for scoring',
        steps: [
          { player: 'Point Guard', action: 'Push the ball up court' },
          { player: 'Shooting Guard', action: 'Fill the wing' },
          { player: 'Small Forward', action: 'Cut to the basket' }
        ],
        success: true,
        usage: {
          tokensUsed: 150,
          cost: 0.002,
          remainingPlays: 48
        }
      };

      mockGenerateCustomPlay.mockResolvedValue({
        success: true,
        data: mockGeneratedPlay
      });

      render(
        <TestWrapper>
          <AIPlayGenerator />
        </TestWrapper>
      );

      // Fill out the form
      const sportSelect = screen.getByLabelText(/sport/i);
      const playerCountInput = screen.getByLabelText(/player count/i);
      const experienceSelect = screen.getByLabelText(/experience level/i);
      const objectiveInput = screen.getByLabelText(/play objective/i);
      const difficultySelect = screen.getByLabelText(/difficulty level/i);
      const generateButton = screen.getByRole('button', { name: /generate play/i });

      fireEvent.change(sportSelect, { target: { value: 'Basketball' } });
      fireEvent.change(playerCountInput, { target: { value: '5' } });
      fireEvent.change(experienceSelect, { target: { value: 'Intermediate' } });
      fireEvent.change(objectiveInput, { target: { value: 'Score quickly' } });
      fireEvent.change(difficultySelect, { target: { value: 'Medium' } });

      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(mockGenerateCustomPlay).toHaveBeenCalledWith(
          expect.objectContaining({
            sport: 'Basketball',
            playerCount: 5,
            experienceLevel: 'Intermediate'
          }),
          expect.objectContaining({
            objective: 'Score quickly',
            difficulty: 'Medium'
          })
        );
        expect(screen.getByText(/fast break play/i)).toBeInTheDocument();
        expect(screen.getByText(/a quick transition play for scoring/i)).toBeInTheDocument();
      });
    });

    it('should handle play generation errors', async () => {
      mockGenerateCustomPlay.mockRejectedValue(new Error('AI service unavailable'));

      render(
        <TestWrapper>
          <AIPlayGenerator />
        </TestWrapper>
      );

      const generateButton = screen.getByRole('button', { name: /generate play/i });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/ai service unavailable/i)).toBeInTheDocument();
      });
    });

    it('should show loading state during generation', async () => {
      mockGenerateCustomPlay.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      render(
        <TestWrapper>
          <AIPlayGenerator />
        </TestWrapper>
      );

      const generateButton = screen.getByRole('button', { name: /generate play/i });
      fireEvent.click(generateButton);

      expect(screen.getByText(/generating play/i)).toBeInTheDocument();
    });

    it('should validate required fields before generation', async () => {
      render(
        <TestWrapper>
          <AIPlayGenerator />
        </TestWrapper>
      );

      const generateButton = screen.getByRole('button', { name: /generate play/i });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/sport is required/i)).toBeInTheDocument();
        expect(screen.getByText(/player count is required/i)).toBeInTheDocument();
        expect(screen.getByText(/experience level is required/i)).toBeInTheDocument();
        expect(screen.getByText(/play objective is required/i)).toBeInTheDocument();
        expect(screen.getByText(/difficulty level is required/i)).toBeInTheDocument();
      });
    });

    it('should handle team profile customization', async () => {
      render(
        <TestWrapper>
          <AIPlayGenerator />
        </TestWrapper>
      );

      // Test strength selection
      const speedCheckbox = screen.getByLabelText(/speed/i);
      const shootingCheckbox = screen.getByLabelText(/shooting/i);
      
      fireEvent.click(speedCheckbox);
      fireEvent.click(shootingCheckbox);

      expect(speedCheckbox).toBeChecked();
      expect(shootingCheckbox).toBeChecked();

      // Test weakness selection
      const defenseCheckbox = screen.getByLabelText(/defense/i);
      const reboundingCheckbox = screen.getByLabelText(/rebounding/i);
      
      fireEvent.click(defenseCheckbox);
      fireEvent.click(reboundingCheckbox);

      expect(defenseCheckbox).toBeChecked();
      expect(reboundingCheckbox).toBeChecked();
    });

    it('should handle special situations selection', async () => {
      render(
        <TestWrapper>
          <AIPlayGenerator />
        </TestWrapper>
      );

      const fastBreakCheckbox = screen.getByLabelText(/fast break/i);
      const halfCourtCheckbox = screen.getByLabelText(/half court/i);
      
      fireEvent.click(fastBreakCheckbox);
      fireEvent.click(halfCourtCheckbox);

      expect(fastBreakCheckbox).toBeChecked();
      expect(halfCourtCheckbox).toBeChecked();
    });

    it('should display usage information after generation', async () => {
      const mockGeneratedPlay = {
        name: 'Test Play',
        description: 'A test play',
        steps: [],
        success: true,
        usage: {
          tokensUsed: 150,
          cost: 0.002,
          remainingPlays: 48
        }
      };

      mockGenerateCustomPlay.mockResolvedValue({
        success: true,
        data: mockGeneratedPlay
      });

      render(
        <TestWrapper>
          <AIPlayGenerator />
        </TestWrapper>
      );

      // Fill out minimal form
      const sportSelect = screen.getByLabelText(/sport/i);
      const playerCountInput = screen.getByLabelText(/player count/i);
      const experienceSelect = screen.getByLabelText(/experience level/i);
      const objectiveInput = screen.getByLabelText(/play objective/i);
      const difficultySelect = screen.getByLabelText(/difficulty level/i);
      const generateButton = screen.getByRole('button', { name: /generate play/i });

      fireEvent.change(sportSelect, { target: { value: 'Basketball' } });
      fireEvent.change(playerCountInput, { target: { value: '5' } });
      fireEvent.change(experienceSelect, { target: { value: 'Intermediate' } });
      fireEvent.change(objectiveInput, { target: { value: 'Score' } });
      fireEvent.change(difficultySelect, { target: { value: 'Medium' } });

      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/tokens used: 150/i)).toBeInTheDocument();
        expect(screen.getByText(/cost: \$0\.002/i)).toBeInTheDocument();
        expect(screen.getByText(/remaining plays: 48/i)).toBeInTheDocument();
      });
    });
  });

  describe('Subscription Access Control', () => {
    it('should show upgrade prompt for free users', () => {
      mockUseAuth.profile.subscription.plan = 'free';

      render(
        <TestWrapper>
          <AIPlayGenerator />
        </TestWrapper>
      );

      expect(screen.getByText(/upgrade to pro/i)).toBeInTheDocument();
      expect(screen.getByText(/unlock ai play generation/i)).toBeInTheDocument();
    });

    it('should allow play generation for pro users', () => {
      mockUseAuth.profile.subscription.plan = 'pro';

      render(
        <TestWrapper>
          <AIPlayGenerator />
        </TestWrapper>
      );

      expect(screen.getByRole('button', { name: /generate play/i })).toBeInTheDocument();
      expect(screen.queryByText(/upgrade to pro/i)).not.toBeInTheDocument();
    });

    it('should handle subscription check errors', () => {
      mockUseAuth.profile = null as any;

      render(
        <TestWrapper>
          <AIPlayGenerator />
        </TestWrapper>
      );

      expect(screen.getByText(/unable to verify subscription/i)).toBeInTheDocument();
    });
  });

  describe('Play Customization Options', () => {
    it('should allow time on shot clock specification', async () => {
      render(
        <TestWrapper>
          <AIPlayGenerator />
        </TestWrapper>
      );

      const timeInput = screen.getByLabelText(/time on shot clock/i);
      fireEvent.change(timeInput, { target: { value: '15' } });

      expect(timeInput).toHaveValue(15);
    });

    it('should allow age group selection', async () => {
      render(
        <TestWrapper>
          <AIPlayGenerator />
        </TestWrapper>
      );

      const ageGroupSelect = screen.getByLabelText(/age group/i);
      fireEvent.change(ageGroupSelect, { target: { value: 'High School' } });

      expect(ageGroupSelect).toHaveValue('High School');
    });

    it('should allow preferred style selection', async () => {
      render(
        <TestWrapper>
          <AIPlayGenerator />
        </TestWrapper>
      );

      const styleSelect = screen.getByLabelText(/preferred style/i);
      fireEvent.change(styleSelect, { target: { value: 'Fast-paced' } });

      expect(styleSelect).toHaveValue('Fast-paced');
    });
  });

  describe('Generated Play Display', () => {
    it('should display generated play with proper formatting', async () => {
      const mockGeneratedPlay = {
        name: 'Pick and Roll Play',
        description: 'A classic pick and roll play',
        steps: [
          { player: 'Point Guard', action: 'Call for pick' },
          { player: 'Center', action: 'Set screen' },
          { player: 'Point Guard', action: 'Use screen and drive' }
        ],
        success: true
      };

      mockGenerateCustomPlay.mockResolvedValue({
        success: true,
        data: mockGeneratedPlay
      });

      render(
        <TestWrapper>
          <AIPlayGenerator />
        </TestWrapper>
      );

      // Fill out form and generate
      const sportSelect = screen.getByLabelText(/sport/i);
      const playerCountInput = screen.getByLabelText(/player count/i);
      const experienceSelect = screen.getByLabelText(/experience level/i);
      const objectiveInput = screen.getByLabelText(/play objective/i);
      const difficultySelect = screen.getByLabelText(/difficulty level/i);
      const generateButton = screen.getByRole('button', { name: /generate play/i });

      fireEvent.change(sportSelect, { target: { value: 'Basketball' } });
      fireEvent.change(playerCountInput, { target: { value: '5' } });
      fireEvent.change(experienceSelect, { target: { value: 'Intermediate' } });
      fireEvent.change(objectiveInput, { target: { value: 'Score' } });
      fireEvent.change(difficultySelect, { target: { value: 'Medium' } });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/pick and roll play/i)).toBeInTheDocument();
        expect(screen.getByText(/a classic pick and roll play/i)).toBeInTheDocument();
        expect(screen.getByText(/call for pick/i)).toBeInTheDocument();
        expect(screen.getByText(/set screen/i)).toBeInTheDocument();
        expect(screen.getByText(/use screen and drive/i)).toBeInTheDocument();
      });
    });

    it('should allow saving generated play', async () => {
      const mockGeneratedPlay = {
        name: 'Test Play',
        description: 'A test play',
        steps: [],
        success: true
      };

      mockGenerateCustomPlay.mockResolvedValue({
        success: true,
        data: mockGeneratedPlay
      });

      render(
        <TestWrapper>
          <AIPlayGenerator />
        </TestWrapper>
      );

      // Generate play first
      const sportSelect = screen.getByLabelText(/sport/i);
      const playerCountInput = screen.getByLabelText(/player count/i);
      const experienceSelect = screen.getByLabelText(/experience level/i);
      const objectiveInput = screen.getByLabelText(/play objective/i);
      const difficultySelect = screen.getByLabelText(/difficulty level/i);
      const generateButton = screen.getByRole('button', { name: /generate play/i });

      fireEvent.change(sportSelect, { target: { value: 'Basketball' } });
      fireEvent.change(playerCountInput, { target: { value: '5' } });
      fireEvent.change(experienceSelect, { target: { value: 'Intermediate' } });
      fireEvent.change(objectiveInput, { target: { value: 'Score' } });
      fireEvent.change(difficultySelect, { target: { value: 'Medium' } });
      fireEvent.click(generateButton);

      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /save play/i });
        fireEvent.click(saveButton);
      });

      expect(screen.getByText(/play saved successfully/i)).toBeInTheDocument();
    });

    it('should allow regenerating play with same parameters', async () => {
      const mockGeneratedPlay = {
        name: 'Test Play',
        description: 'A test play',
        steps: [],
        success: true
      };

      mockGenerateCustomPlay.mockResolvedValue({
        success: true,
        data: mockGeneratedPlay
      });

      render(
        <TestWrapper>
          <AIPlayGenerator />
        </TestWrapper>
      );

      // Generate play first
      const sportSelect = screen.getByLabelText(/sport/i);
      const playerCountInput = screen.getByLabelText(/player count/i);
      const experienceSelect = screen.getByLabelText(/experience level/i);
      const objectiveInput = screen.getByLabelText(/play objective/i);
      const difficultySelect = screen.getByLabelText(/difficulty level/i);
      const generateButton = screen.getByRole('button', { name: /generate play/i });

      fireEvent.change(sportSelect, { target: { value: 'Basketball' } });
      fireEvent.change(playerCountInput, { target: { value: '5' } });
      fireEvent.change(experienceSelect, { target: { value: 'Intermediate' } });
      fireEvent.change(objectiveInput, { target: { value: 'Score' } });
      fireEvent.change(difficultySelect, { target: { value: 'Medium' } });
      fireEvent.click(generateButton);

      await waitFor(() => {
        const regenerateButton = screen.getByRole('button', { name: /regenerate play/i });
        fireEvent.click(regenerateButton);
      });

      expect(mockGenerateCustomPlay).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle network errors gracefully', async () => {
      mockGenerateCustomPlay.mockRejectedValue(new Error('Network error'));

      render(
        <TestWrapper>
          <AIPlayGenerator />
        </TestWrapper>
      );

      const generateButton = screen.getByRole('button', { name: /generate play/i });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    it('should handle invalid input parameters', async () => {
      render(
        <TestWrapper>
          <AIPlayGenerator />
        </TestWrapper>
      );

      const playerCountInput = screen.getByLabelText(/player count/i);
      fireEvent.change(playerCountInput, { target: { value: '0' } });

      const generateButton = screen.getByRole('button', { name: /generate play/i });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/player count must be at least 1/i)).toBeInTheDocument();
      });
    });

    it('should handle AI service rate limiting', async () => {
      mockGenerateCustomPlay.mockRejectedValue(new Error('Rate limit exceeded'));

      render(
        <TestWrapper>
          <AIPlayGenerator />
        </TestWrapper>
      );

      const generateButton = screen.getByRole('button', { name: /generate play/i });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/rate limit exceeded/i)).toBeInTheDocument();
        expect(screen.getByText(/please try again later/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(
        <TestWrapper>
          <AIPlayGenerator />
        </TestWrapper>
      );

      expect(screen.getByRole('form')).toBeInTheDocument();
      expect(screen.getByLabelText(/sport/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/player count/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/experience level/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/play objective/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/difficulty level/i)).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      render(
        <TestWrapper>
          <AIPlayGenerator />
        </TestWrapper>
      );

      const sportSelect = screen.getByLabelText(/sport/i);
      const playerCountInput = screen.getByLabelText(/player count/i);
      const experienceSelect = screen.getByLabelText(/experience level/i);

      sportSelect.focus();
      expect(document.activeElement).toBe(sportSelect);

      fireEvent.keyDown(sportSelect, { key: 'Tab' });
      expect(document.activeElement).toBe(playerCountInput);

      fireEvent.keyDown(playerCountInput, { key: 'Tab' });
      expect(document.activeElement).toBe(experienceSelect);
    });
  });

  describe('Performance Optimization', () => {
    it('should debounce form input changes', async () => {
      render(
        <TestWrapper>
          <AIPlayGenerator />
        </TestWrapper>
      );

      const objectiveInput = screen.getByLabelText(/play objective/i);
      
      // Rapidly change input
      fireEvent.change(objectiveInput, { target: { value: 'S' } });
      fireEvent.change(objectiveInput, { target: { value: 'Sc' } });
      fireEvent.change(objectiveInput, { target: { value: 'Sco' } });
      fireEvent.change(objectiveInput, { target: { value: 'Score' } });

      // Should not trigger validation on every keystroke
      await waitFor(() => {
        expect(objectiveInput).toHaveValue('Score');
      });
    });

    it('should cache AI service responses', async () => {
      const mockGeneratedPlay = {
        name: 'Cached Play',
        description: 'A cached play',
        steps: [],
        success: true
      };

      mockGenerateCustomPlay.mockResolvedValue({
        success: true,
        data: mockGeneratedPlay
      });

      render(
        <TestWrapper>
          <AIPlayGenerator />
        </TestWrapper>
      );

      // Generate play with same parameters twice
      const sportSelect = screen.getByLabelText(/sport/i);
      const playerCountInput = screen.getByLabelText(/player count/i);
      const experienceSelect = screen.getByLabelText(/experience level/i);
      const objectiveInput = screen.getByLabelText(/play objective/i);
      const difficultySelect = screen.getByLabelText(/difficulty level/i);
      const generateButton = screen.getByRole('button', { name: /generate play/i });

      fireEvent.change(sportSelect, { target: { value: 'Basketball' } });
      fireEvent.change(playerCountInput, { target: { value: '5' } });
      fireEvent.change(experienceSelect, { target: { value: 'Intermediate' } });
      fireEvent.change(objectiveInput, { target: { value: 'Score' } });
      fireEvent.change(difficultySelect, { target: { value: 'Medium' } });

      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/cached play/i)).toBeInTheDocument();
      });

      // Second generation should use cache
      const regenerateButton = screen.getByRole('button', { name: /regenerate play/i });
      fireEvent.click(regenerateButton);

      // Should not call AI service again for same parameters
      expect(mockGenerateCustomPlay).toHaveBeenCalledTimes(1);
    });
  });
});


