import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { BrowserRouter } from 'react-router-dom';
import EnhancedWaitlistForm from '../Waitlist/EnhancedWaitlistForm';

// Mock Firebase
jest.mock('../../services/firebase/firebase-config', () => ({
  db: {},
}));

// Mock Firestore
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn(),
  serverTimestamp: jest.fn(() => new Date()),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(() => Promise.resolve({ empty: true })),
}));

// Mock monitoring
jest.mock('../../services/monitoring', () => ({
  trackUserAction: jest.fn(),
  trackError: jest.fn(),
}));

// Mock analytics
jest.mock('../../services/analytics', () => ({
  trackWaitlistSignup: jest.fn(),
  trackWaitlistSignupSuccess: jest.fn(),
  trackWaitlistSignupError: jest.fn(),
}));

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <ChakraProvider>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </ChakraProvider>
  );
};

describe('EnhancedWaitlistForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders form with all required fields', () => {
    renderWithProviders(<EnhancedWaitlistForm />);
    
    expect(screen.getByText('Join Beta Access')).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
  });

  test('validates required fields', async () => {
    renderWithProviders(<EnhancedWaitlistForm />);
    
    const submitButton = screen.getByText('Continue');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
    });
  });

  test('validates email format', async () => {
    renderWithProviders(<EnhancedWaitlistForm />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    
    const nameInput = screen.getByLabelText(/full name/i);
    fireEvent.change(nameInput, { target: { value: 'Test User' } });
    
    const submitButton = screen.getByText('Continue');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });
  });

  test('progresses through form steps', async () => {
    renderWithProviders(<EnhancedWaitlistForm />);
    
    // Step 1: Fill basic info
    const emailInput = screen.getByLabelText(/email address/i);
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    
    const nameInput = screen.getByLabelText(/full name/i);
    fireEvent.change(nameInput, { target: { value: 'Test User' } });
    
    const continueButton = screen.getByText('Continue');
    fireEvent.click(continueButton);
    
    await waitFor(() => {
      expect(screen.getByText('Coaching Role')).toBeInTheDocument();
    });
  });

  test('shows role and team level options', async () => {
    renderWithProviders(<EnhancedWaitlistForm />);
    
    // Fill step 1 and proceed
    const emailInput = screen.getByLabelText(/email address/i);
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    
    const nameInput = screen.getByLabelText(/full name/i);
    fireEvent.change(nameInput, { target: { value: 'Test User' } });
    
    const continueButton = screen.getByText('Continue');
    fireEvent.click(continueButton);
    
    await waitFor(() => {
      expect(screen.getByText('Coaching Role')).toBeInTheDocument();
      expect(screen.getByText('Team Level')).toBeInTheDocument();
    });
  });

  test('handles form submission successfully', async () => {
    const mockOnSuccess = jest.fn();
    renderWithProviders(<EnhancedWaitlistForm onSuccess={mockOnSuccess} />);
    
    // Fill all steps
    const emailInput = screen.getByLabelText(/email address/i);
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    
    const nameInput = screen.getByLabelText(/full name/i);
    fireEvent.change(nameInput, { target: { value: 'Test User' } });
    
    const continueButton = screen.getByText('Continue');
    fireEvent.click(continueButton);
    
    await waitFor(() => {
      const roleSelect = screen.getByDisplayValue('Select your coaching role');
      fireEvent.change(roleSelect, { target: { value: 'head-coach' } });
    });
    
    await waitFor(() => {
      const teamLevelSelect = screen.getByDisplayValue('Select your team level');
      fireEvent.change(teamLevelSelect, { target: { value: 'high-school' } });
    });
    
    const continueButton2 = screen.getByText('Continue');
    fireEvent.click(continueButton2);
    
    await waitFor(() => {
      const termsCheckbox = screen.getByRole('checkbox');
      fireEvent.click(termsCheckbox);
    });
    
    const submitButton = screen.getByText('Join Beta');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  test('shows success message after submission', async () => {
    renderWithProviders(<EnhancedWaitlistForm />);
    
    // Complete form submission (mocked)
    const emailInput = screen.getByLabelText(/email address/i);
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    
    const nameInput = screen.getByLabelText(/full name/i);
    fireEvent.change(nameInput, { target: { value: 'Test User' } });
    
    const continueButton = screen.getByText('Continue');
    fireEvent.click(continueButton);
    
    // Mock successful submission
    jest.spyOn(require('firebase/firestore'), 'addDoc').mockResolvedValue({ id: 'test-id' });
    
    await waitFor(() => {
      const roleSelect = screen.getByDisplayValue('Select your coaching role');
      fireEvent.change(roleSelect, { target: { value: 'head-coach' } });
    });
    
    await waitFor(() => {
      const teamLevelSelect = screen.getByDisplayValue('Select your team level');
      fireEvent.change(teamLevelSelect, { target: { value: 'high-school' } });
    });
    
    const continueButton2 = screen.getByText('Continue');
    fireEvent.click(continueButton2);
    
    await waitFor(() => {
      const termsCheckbox = screen.getByRole('checkbox');
      fireEvent.click(termsCheckbox);
    });
    
    const submitButton = screen.getByText('Join Beta');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Welcome to Beta!')).toBeInTheDocument();
    });
  });
});

