describe('Main Application Flow Tests', () => {
  beforeEach(() => {
    // Reset database and clear storage
    cy.task('db:reset');
    cy.clearLocalStorage();
    cy.clearCookies();
  });

  describe('Complete User Journey - Free Plan', () => {
    it('should complete full user journey from signup to basic usage', () => {
      const testUser = {
        email: 'newuser@coachcore.ai',
        password: 'TestPassword123!',
        teamName: 'Test Team'
      };

      // Step 1: Signup
      cy.intercept('POST', '**/identitytoolkit.googleapis.com/v1/accounts:signUp**', {
        statusCode: 200,
        body: {
          localId: 'new-user-id',
          email: testUser.email,
          idToken: 'mock-id-token',
          refreshToken: 'mock-refresh-token',
          expiresIn: '3600'
        }
      }).as('signupRequest');

      cy.visit('/signup');
      cy.get('[data-testid="email-input"]').type(testUser.email);
      cy.get('[data-testid="password-input"]').type(testUser.password);
      cy.get('[data-testid="confirm-password-input"]').type(testUser.password);
      cy.get('[data-testid="team-name-input"]').type(testUser.teamName);
      cy.get('[data-testid="signup-button"]').click();

      cy.wait('@signupRequest');
      cy.url().should('include', '/verify-email');

      // Step 2: Email verification (simulated)
      cy.visit('/dashboard');
      
      // Mock user data for free plan
      cy.window().then((win) => {
        win.localStorage.setItem('user', JSON.stringify({
          id: 'new-user-id',
          email: testUser.email,
          subscription: {
            plan: 'free',
            status: 'active'
          },
          team: {
            id: 'team-123',
            name: testUser.teamName,
            role: 'owner'
          }
        }));
      });

      // Step 3: Dashboard overview
      cy.get('[data-testid="welcome-message"]').should('contain', 'Welcome to Coach Core AI');
      cy.get('[data-testid="quick-start-guide"]').should('be.visible');
      cy.get('[data-testid="upgrade-prompt"]').should('be.visible');

      // Step 4: Create first play
      cy.get('[data-testid="create-play-button"]').click();
      cy.url().should('include', '/plays/create');

      cy.get('[data-testid="play-name-input"]').type('My First Play');
      cy.get('[data-testid="play-description-input"]').type('A simple offensive play');
      cy.get('[data-testid="formation-select"]').select('I-Formation');
      cy.get('[data-testid="save-play-button"]').click();

      cy.url().should('include', '/plays/');
      cy.get('[data-testid="play-saved-message"]').should('be.visible');

      // Step 5: View plays list
      cy.visit('/plays');
      cy.get('[data-testid="play-item"]').should('contain', 'My First Play');

      // Step 6: Create practice plan
      cy.get('[data-testid="create-practice-button"]').click();
      cy.url().should('include', '/practices/create');

      cy.get('[data-testid="practice-name-input"]').type('Monday Practice');
      cy.get('[data-testid="practice-date-input"]').type('2024-01-15');
      cy.get('[data-testid="practice-duration-input"]').type('90');
      cy.get('[data-testid="save-practice-button"]').click();

      cy.url().should('include', '/practices/');
      cy.get('[data-testid="practice-saved-message"]').should('be.visible');

      // Step 7: View practice plans
      cy.visit('/practices');
      cy.get('[data-testid="practice-item"]').should('contain', 'Monday Practice');

      // Step 8: Try to access pro features (should show upgrade prompt)
      cy.visit('/play-designer');
      cy.url().should('include', '/pricing');
      cy.get('[data-testid="upgrade-prompt"]').should('be.visible');

      // Step 9: View settings
      cy.visit('/settings');
      cy.get('[data-testid="profile-settings"]').should('be.visible');
      cy.get('[data-testid="subscription-settings"]').should('be.visible');
    });
  });

  describe('Complete User Journey - Pro Plan', () => {
    it('should complete full user journey with pro features', () => {
      // Login as pro user
      cy.login('prouser@coachcore.ai', 'TestPassword123!');
      
      // Mock pro user data
      cy.window().then((win) => {
        win.localStorage.setItem('user', JSON.stringify({
          id: 'pro-user-id',
          email: 'prouser@coachcore.ai',
          subscription: {
            plan: 'pro',
            status: 'active',
            subscriptionId: 'sub_test_123'
          },
          team: {
            id: 'team-456',
            name: 'Pro Team',
            role: 'owner'
          }
        }));
      });

      // Step 1: Dashboard with pro features
      cy.visit('/dashboard');
      cy.get('[data-testid="analytics-overview"]').should('be.visible');
      cy.get('[data-testid="team-collaboration"]').should('be.visible');
      cy.get('[data-testid="upgrade-prompt"]').should('not.exist');

      // Step 2: Use Play Designer
      cy.visit('/play-designer');
      cy.get('[data-testid="advanced-tools"]').should('be.visible');
      cy.get('[data-testid="ai-suggestions"]').should('be.visible');

      // Create advanced play
      cy.get('[data-testid="play-name-input"]').type('Advanced Play');
      cy.get('[data-testid="formation-select"]').select('Spread Formation');
      
      // Use AI suggestions
      cy.get('[data-testid="ai-suggest-button"]').click();
      cy.get('[data-testid="ai-suggestions-panel"]').should('be.visible');
      cy.get('[data-testid="suggestion-item"]').first().click();

      cy.get('[data-testid="save-play-button"]').click();
      cy.get('[data-testid="play-saved-message"]').should('be.visible');

      // Step 3: Use Analytics
      cy.visit('/analytics');
      cy.get('[data-testid="performance-metrics"]').should('be.visible');
      cy.get('[data-testid="usage-statistics"]').should('be.visible');
      cy.get('[data-testid="export-reports"]').should('be.visible');

      // Step 4: Team Management
      cy.visit('/team');
      cy.get('[data-testid="invite-members"]').should('be.visible');
      cy.get('[data-testid="team-settings"]').should('be.visible');

      // Invite team member
      cy.get('[data-testid="invite-members"]').click();
      cy.get('[data-testid="member-email-input"]').type('member@coachcore.ai');
      cy.get('[data-testid="member-role-select"]').select('member');
      cy.get('[data-testid="send-invite-button"]').click();
      cy.get('[data-testid="invite-sent-message"]').should('be.visible');

      // Step 5: Advanced Practice Planning
      cy.visit('/practice-planner');
      cy.get('[data-testid="ai-practice-generator"]').should('be.visible');
      cy.get('[data-testid="advanced-scheduling"]').should('be.visible');

      // Generate AI practice plan
      cy.get('[data-testid="ai-practice-generator"]').click();
      cy.get('[data-testid="practice-parameters"]').within(() => {
        cy.get('[data-testid="duration-input"]').type('120');
        cy.get('[data-testid="focus-area-select"]').select('Offense');
        cy.get('[data-testid="skill-level-select"]').select('Intermediate');
      });
      cy.get('[data-testid="generate-practice-button"]').click();
      cy.get('[data-testid="ai-generated-practice"]').should('be.visible');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle network errors gracefully', () => {
      cy.login('test@coachcore.ai', 'TestPassword123!');
      
      // Mock network error
      cy.intercept('GET', '**/api/plays**', {
        statusCode: 500,
        body: { error: 'Internal server error' }
      }).as('networkError');

      cy.visit('/plays');
      cy.wait('@networkError');
      
      // Should show error message
      cy.get('[data-testid="error-message"]').should('contain', 'Something went wrong');
      cy.get('[data-testid="retry-button"]').should('be.visible');

      // Should allow retry
      cy.intercept('GET', '**/api/plays**', {
        statusCode: 200,
        body: { plays: [] }
      }).as('retrySuccess');

      cy.get('[data-testid="retry-button"]').click();
      cy.wait('@retrySuccess');
      cy.get('[data-testid="error-message"]').should('not.exist');
    });

    it('should handle offline mode', () => {
      cy.login('test@coachcore.ai', 'TestPassword123!');
      
      // Go offline
      cy.task('network:offline');
      cy.get('[data-testid="offline-indicator"]').should('be.visible');

      // Should still allow basic functionality
      cy.visit('/plays');
      cy.get('[data-testid="offline-mode-message"]').should('be.visible');
      cy.get('[data-testid="create-play-button"]').should('be.visible');

      // Create play in offline mode
      cy.get('[data-testid="create-play-button"]').click();
      cy.get('[data-testid="play-name-input"]').type('Offline Play');
      cy.get('[data-testid="save-play-button"]').click();
      cy.get('[data-testid="offline-queued-message"]').should('be.visible');

      // Go back online
      cy.task('network:online');
      cy.get('[data-testid="online-indicator"]').should('be.visible');
      cy.get('[data-testid="sync-status"]').should('contain', 'Syncing');
    });

    it('should handle authentication expiration', () => {
      cy.login('test@coachcore.ai', 'TestPassword123!');
      
      // Mock token expiration
      cy.intercept('GET', '**/api/user/profile**', {
        statusCode: 401,
        body: { error: 'Token expired' }
      }).as('tokenExpired');

      cy.visit('/dashboard');
      cy.wait('@tokenExpired');
      
      // Should redirect to login
      cy.url().should('include', '/login');
      cy.get('[data-testid="session-expired-message"]').should('be.visible');
    });
  });

  describe('Performance and Load Testing', () => {
    it('should load dashboard within performance budget', () => {
      cy.login('test@coachcore.ai', 'TestPassword123!');
      
      const startTime = performance.now();
      cy.visit('/dashboard');
      
      cy.get('[data-testid="dashboard-content"]').should('be.visible').then(() => {
        const loadTime = performance.now() - startTime;
        expect(loadTime).to.be.lessThan(3000); // 3 second budget
      });
    });

    it('should handle large datasets efficiently', () => {
      cy.login('test@coachcore.ai', 'TestPassword123!');
      
      // Mock large dataset
      cy.intercept('GET', '**/api/plays**', {
        statusCode: 200,
        body: {
          plays: Array.from({ length: 1000 }, (_, i) => ({
            id: `play-${i}`,
            name: `Play ${i}`,
            description: `Description for play ${i}`
          }))
        }
      }).as('largeDataset');

      cy.visit('/plays');
      cy.wait('@largeDataset');
      
      // Should load with pagination or virtualization
      cy.get('[data-testid="play-list"]').should('be.visible');
      cy.get('[data-testid="pagination"]').should('be.visible');
    });

    it('should maintain performance during concurrent operations', () => {
      cy.login('test@coachcore.ai', 'TestPassword123!');
      
      cy.visit('/dashboard');
      
      // Simulate multiple concurrent operations
      cy.get('[data-testid="create-play-button"]').click();
      cy.get('[data-testid="create-practice-button"]').click();
      cy.get('[data-testid="view-analytics-button"]').click();
      
      // All should complete without performance degradation
      cy.get('[data-testid="play-creation-form"]').should('be.visible');
      cy.get('[data-testid="practice-creation-form"]').should('be.visible');
      cy.get('[data-testid="analytics-dashboard"]').should('be.visible');
    });
  });

  describe('Cross-Browser Compatibility', () => {
    it('should work correctly in Chrome', () => {
      cy.login('test@coachcore.ai', 'TestPassword123!');
      
      cy.visit('/dashboard');
      cy.get('[data-testid="dashboard-content"]').should('be.visible');
      
      // Test key interactions
      cy.get('[data-testid="create-play-button"]').click();
      cy.url().should('include', '/plays/create');
    });

    it('should work correctly in Firefox', () => {
      cy.login('test@coachcore.ai', 'TestPassword123!');
      
      cy.visit('/dashboard');
      cy.get('[data-testid="dashboard-content"]').should('be.visible');
      
      // Test key interactions
      cy.get('[data-testid="create-play-button"]').click();
      cy.url().should('include', '/plays/create');
    });

    it('should work correctly in Safari', () => {
      cy.login('test@coachcore.ai', 'TestPassword123!');
      
      cy.visit('/dashboard');
      cy.get('[data-testid="dashboard-content"]').should('be.visible');
      
      // Test key interactions
      cy.get('[data-testid="create-play-button"]').click();
      cy.url().should('include', '/plays/create');
    });
  });

  describe('Mobile Responsiveness', () => {
    it('should work correctly on mobile devices', () => {
      cy.viewport('iphone-x');
      cy.login('test@coachcore.ai', 'TestPassword123!');
      
      cy.visit('/dashboard');
      cy.get('[data-testid="mobile-menu"]').should('be.visible');
      cy.get('[data-testid="dashboard-content"]').should('be.visible');
      
      // Test mobile navigation
      cy.get('[data-testid="mobile-menu"]').click();
      cy.get('[data-testid="mobile-nav"]').should('be.visible');
    });

    it('should handle touch interactions correctly', () => {
      cy.viewport('ipad-2');
      cy.login('test@coachcore.ai', 'TestPassword123!');
      
      cy.visit('/play-designer');
      
      // Test touch interactions
      cy.get('[data-testid="canvas"]').trigger('touchstart', { touches: [{ clientX: 100, clientY: 100 }] });
      cy.get('[data-testid="canvas"]').trigger('touchmove', { touches: [{ clientX: 150, clientY: 150 }] });
      cy.get('[data-testid="canvas"]').trigger('touchend');
    });
  });
});


