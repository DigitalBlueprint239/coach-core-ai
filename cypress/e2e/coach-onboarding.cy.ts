// cypress/e2e/coach-onboarding.cy.ts

import { UserFactory } from '../factories/UserFactory';
import { TeamFactory } from '../factories/TeamFactory';

describe('Coach Onboarding Flow', () => {
  const testCoach = UserFactory.createCoach({
    email: 'newcoach@coachcore.ai',
    firstName: 'John',
    lastName: 'Coach'
  });

  const testTeam = TeamFactory.create({
    name: 'Championship Team',
    sport: 'football',
    level: 'high-school'
  });

  beforeEach(() => {
    cy.resetDatabase();
    cy.seedTestData();
  });

  it('should complete full coach onboarding flow', () => {
    // Step 1: Sign up
    cy.visit('/signup');
    cy.get('[data-testid="email-input"]').type(testCoach.email);
    cy.get('[data-testid="password-input"]').type(testCoach.password);
    cy.get('[data-testid="confirm-password-input"]').type(testCoach.password);
    cy.get('[data-testid="first-name-input"]').type(testCoach.firstName);
    cy.get('[data-testid="last-name-input"]').type(testCoach.lastName);
    cy.get('[data-testid="role-select"]').select('coach');
    cy.get('[data-testid="signup-button"]').click();

    // Verify email verification page
    cy.url().should('include', '/verify-email');
    cy.get('[data-testid="verification-message"]').should('be.visible');
    cy.get('[data-testid="verification-message"]').should('contain', testCoach.email);

    // Step 2: Email verification (mock)
    cy.task('ai:mock', {
      type: 'email-verification',
      response: { verified: true }
    });

    // Simulate email verification
    cy.visit('/verify-email/confirm?token=mock-verification-token');
    cy.url().should('include', '/onboarding');

    // Step 3: Team creation
    cy.get('[data-testid="team-name-input"]').type(testTeam.name);
    cy.get('[data-testid="sport-select"]').select(testTeam.sport);
    cy.get('[data-testid="level-select"]').select(testTeam.level);
    cy.get('[data-testid="create-team-button"]').click();

    // Verify team creation
    cy.url().should('include', '/teams/');
    cy.get('[data-testid="team-name"]').should('contain', testTeam.name);
    cy.get('[data-testid="team-sport"]').should('contain', testTeam.sport);
    cy.get('[data-testid="team-level"]').should('contain', testTeam.level);

    // Step 4: Player invites
    const testPlayers = [
      { email: 'player1@coachcore.ai', role: 'QB' },
      { email: 'player2@coachcore.ai', role: 'RB' },
      { email: 'player3@coachcore.ai', role: 'WR' }
    ];

    testPlayers.forEach(player => {
      cy.get('[data-testid="invite-player-button"]').click();
      cy.get('[data-testid="player-email-input"]').type(player.email);
      cy.get('[data-testid="player-role-select"]').select(player.role);
      cy.get('[data-testid="send-invite-button"]').click();
      cy.get('[data-testid="invite-sent-message"]').should('be.visible');
    });

    // Step 5: First play design with AI enhancement
    cy.get('[data-testid="create-first-play-button"]').click();
    cy.url().should('include', '/plays/create');

    const firstPlay = {
      name: 'First Play - QB Sneak',
      description: 'Simple quarterback sneak for short yardage',
      formation: '4-3-4'
    };

    cy.get('[data-testid="play-name-input"]').type(firstPlay.name);
    cy.get('[data-testid="play-description-input"]').type(firstPlay.description);
    cy.get('[data-testid="formation-select"]').select(firstPlay.formation);

    // Mock AI suggestion
    cy.mockAISuggestion({
      suggestion: 'Consider adding a fake handoff to the running back to mislead the defense.',
      confidence: 0.85
    });

    cy.get('[data-testid="ai-suggest-button"]').click();
    cy.waitForAIResponse();
    cy.get('[data-testid="ai-suggestion"]').should('contain', 'fake handoff');

    // Apply AI suggestion
    cy.get('[data-testid="apply-suggestion-button"]').click();
    cy.get('[data-testid="play-description-input"]').should('contain', 'fake handoff');

    // Save the play
    cy.get('[data-testid="save-play-button"]').click();
    cy.url().should('include', '/plays/');
    cy.get('[data-testid="play-name"]').should('contain', firstPlay.name);

    // Step 6: Verify onboarding completion
    cy.visit('/dashboard');
    cy.get('[data-testid="onboarding-complete"]').should('be.visible');
    cy.get('[data-testid="team-stats"]').should('contain', '1');
    cy.get('[data-testid="player-count"]').should('contain', '3');
    cy.get('[data-testid="play-count"]').should('contain', '1');
  });

  it('should handle email verification failure gracefully', () => {
    cy.visit('/signup');
    cy.get('[data-testid="email-input"]').type('invalid@coachcore.ai');
    cy.get('[data-testid="password-input"]').type('TestPassword123!');
    cy.get('[data-testid="confirm-password-input"]').type('TestPassword123!');
    cy.get('[data-testid="first-name-input"]').type('Test');
    cy.get('[data-testid="last-name-input"]').type('Coach');
    cy.get('[data-testid="role-select"]').select('coach');
    cy.get('[data-testid="signup-button"]').click();

    // Mock failed verification
    cy.task('ai:mock', {
      type: 'email-verification',
      response: { verified: false, error: 'Invalid email domain' }
    });

    cy.visit('/verify-email/confirm?token=invalid-token');
    cy.get('[data-testid="verification-error"]').should('be.visible');
    cy.get('[data-testid="verification-error"]').should('contain', 'Invalid email domain');
  });

  it('should validate team creation requirements', () => {
    cy.login(testCoach.email, testCoach.password);
    cy.visit('/teams/create');

    // Try to create team without required fields
    cy.get('[data-testid="create-team-button"]').click();
    cy.get('[data-testid="team-name-error"]').should('be.visible');
    cy.get('[data-testid="sport-error"]').should('be.visible');

    // Fill required fields
    cy.get('[data-testid="team-name-input"]').type(testTeam.name);
    cy.get('[data-testid="sport-select"]').select(testTeam.sport);
    cy.get('[data-testid="level-select"]').select(testTeam.level);

    // Verify validation passes
    cy.get('[data-testid="team-name-error"]').should('not.exist');
    cy.get('[data-testid="sport-error"]').should('not.exist');
  });

  it('should handle player invite validation', () => {
    cy.login(testCoach.email, testCoach.password);
    cy.createTeam(testTeam.name);

    // Try to invite invalid email
    cy.get('[data-testid="invite-player-button"]').click();
    cy.get('[data-testid="player-email-input"]').type('invalid-email');
    cy.get('[data-testid="player-role-select"]').select('QB');
    cy.get('[data-testid="send-invite-button"]').click();
    cy.get('[data-testid="email-error"]').should('be.visible');

    // Try to invite without role
    cy.get('[data-testid="player-email-input"]').clear().type('valid@coachcore.ai');
    cy.get('[data-testid="player-role-select"]').select('');
    cy.get('[data-testid="send-invite-button"]').click();
    cy.get('[data-testid="role-error"]').should('be.visible');

    // Valid invite
    cy.get('[data-testid="player-role-select"]').select('QB');
    cy.get('[data-testid="send-invite-button"]').click();
    cy.get('[data-testid="invite-sent-message"]').should('be.visible');
  });

  it('should provide AI suggestions for first play', () => {
    cy.login(testCoach.email, testCoach.password);
    cy.createTeam(testTeam.name);
    cy.visit('/plays/create');

    // Mock multiple AI suggestions
    cy.mockAISuggestion({
      suggestions: [
        {
          type: 'formation',
          suggestion: 'Consider using a 4-3-4 formation for better offensive balance',
          confidence: 0.9
        },
        {
          type: 'tactics',
          suggestion: 'Add a play-action pass to keep the defense guessing',
          confidence: 0.85
        },
        {
          type: 'timing',
          suggestion: 'Use a quick snap count to catch the defense off guard',
          confidence: 0.75
        }
      ]
    });

    cy.get('[data-testid="play-name-input"]').type('AI Enhanced Play');
    cy.get('[data-testid="play-description-input"]').type('A play designed with AI assistance');
    cy.get('[data-testid="formation-select"]').select('4-3-4');

    // Request AI suggestions
    cy.get('[data-testid="ai-suggest-button"]').click();
    cy.waitForAIResponse();

    // Verify suggestions are displayed
    cy.get('[data-testid="ai-suggestion"]').should('have.length', 3);
    cy.get('[data-testid="ai-suggestion"]').first().should('contain', '4-3-4 formation');
    cy.get('[data-testid="ai-suggestion"]').eq(1).should('contain', 'play-action pass');
    cy.get('[data-testid="ai-suggestion"]').eq(2).should('contain', 'quick snap count');

    // Apply a suggestion
    cy.get('[data-testid="apply-suggestion-button"]').first().click();
    cy.get('[data-testid="play-description-input"]').should('contain', '4-3-4 formation');
  });

  it('should complete onboarding with retry logic', () => {
    // Test with network failures and retries
    cy.visit('/signup');
    
    // Simulate network failure during signup
    cy.intercept('POST', '/api/auth/signup', { statusCode: 500 }).as('signupFailure');
    cy.get('[data-testid="email-input"]').type(testCoach.email);
    cy.get('[data-testid="password-input"]').type(testCoach.password);
    cy.get('[data-testid="confirm-password-input"]').type(testCoach.password);
    cy.get('[data-testid="first-name-input"]').type(testCoach.firstName);
    cy.get('[data-testid="last-name-input"]').type(testCoach.lastName);
    cy.get('[data-testid="role-select"]').select('coach');
    cy.get('[data-testid="signup-button"]').click();
    
    cy.wait('@signupFailure');
    cy.get('[data-testid="error-message"]').should('be.visible');

    // Retry with success
    cy.intercept('POST', '/api/auth/signup', { statusCode: 200, body: { success: true } }).as('signupSuccess');
    cy.get('[data-testid="retry-button"]').click();
    cy.wait('@signupSuccess');
    cy.url().should('include', '/verify-email');
  });
}); 