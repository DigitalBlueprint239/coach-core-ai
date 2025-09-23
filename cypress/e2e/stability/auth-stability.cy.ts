describe('Authentication Stability E2E Tests', () => {
  beforeEach(() => {
    // Clear all storage before each test
    cy.clearAllStorage();
    
    // Mock network conditions
    cy.intercept('POST', '**/identitytoolkit.googleapis.com/**', (req) => {
      // Simulate network delay
      req.reply((res) => {
        res.delay(1000);
      });
    }).as('authRequest');
  });

  describe('Network Failure Scenarios', () => {
    it('should handle network timeout during login', () => {
      // Simulate network timeout
      cy.intercept('POST', '**/identitytoolkit.googleapis.com/**', {
        statusCode: 408,
        body: { error: { message: 'Request timeout' } }
      }).as('authTimeout');

      cy.visit('/login');
      
      cy.get('input[type="email"]').type('test@example.com');
      cy.get('input[type="password"]').type('password123');
      cy.get('button[type="submit"]').click();

      // Should show error message, not crash
      cy.contains('Network error').should('be.visible');
      cy.contains('Please check your connection').should('be.visible');
    });

    it('should handle intermittent network failures', () => {
      let requestCount = 0;
      
      cy.intercept('POST', '**/identitytoolkit.googleapis.com/**', (req) => {
        requestCount++;
        if (requestCount === 1) {
          // First request fails
          req.reply({ statusCode: 500, body: { error: { message: 'Internal server error' } } });
        } else {
          // Second request succeeds
          req.reply({ 
            statusCode: 200, 
            body: { 
              localId: 'test-user-id',
              email: 'test@example.com',
              displayName: 'Test User'
            } 
          });
        }
      }).as('authRequest');

      cy.visit('/login');
      
      cy.get('input[type="email"]').type('test@example.com');
      cy.get('input[type="password"]').type('password123');
      cy.get('button[type="submit"]').click();

      // First attempt should fail
      cy.contains('Sign in failed').should('be.visible');

      // Retry should succeed
      cy.get('button[type="submit"]').click();
      cy.contains('Welcome back').should('be.visible');
    });

    it('should handle Google OAuth popup blocked', () => {
      // Mock Google OAuth popup being blocked
      cy.window().then((win) => {
        cy.stub(win, 'open').returns(null);
      });

      cy.visit('/login');
      
      cy.get('button').contains('Google').click();

      // Should show error message, not crash
      cy.contains('Popup was blocked').should('be.visible');
      cy.contains('Please allow popups').should('be.visible');
    });
  });

  describe('Data Validation Scenarios', () => {
    it('should handle invalid email format gracefully', () => {
      cy.visit('/login');
      
      cy.get('input[type="email"]').type('invalid-email');
      cy.get('input[type="password"]').type('password123');
      cy.get('button[type="submit"]').click();

      // Should show validation error, not crash
      cy.contains('Please enter a valid email address').should('be.visible');
    });

    it('should handle empty form submission gracefully', () => {
      cy.visit('/login');
      
      cy.get('button[type="submit"]').click();

      // Should show validation errors, not crash
      cy.contains('Email is required').should('be.visible');
      cy.contains('Password is required').should('be.visible');
    });

    it('should handle very long input values gracefully', () => {
      const longString = 'a'.repeat(10000);
      
      cy.visit('/login');
      
      cy.get('input[type="email"]').type(longString);
      cy.get('input[type="password"]').type(longString);
      cy.get('button[type="submit"]').click();

      // Should show validation error, not crash
      cy.contains('Please enter a valid email address').should('be.visible');
    });
  });

  describe('Concurrent Operation Scenarios', () => {
    it('should handle multiple rapid login attempts', () => {
      cy.visit('/login');
      
      cy.get('input[type="email"]').type('test@example.com');
      cy.get('input[type="password"]').type('password123');

      // Rapid clicks on submit button
      cy.get('button[type="submit"]').click();
      cy.get('button[type="submit"]').click();
      cy.get('button[type="submit"]').click();

      // Should only process one request, not crash
      cy.get('button[type="submit"]').should('be.disabled');
    });

    it('should handle rapid tab switching during authentication', () => {
      cy.visit('/login');
      
      // Rapid tab switching
      cy.get('[role="tab"]').contains('Sign In').click();
      cy.get('[role="tab"]').contains('Sign Up').click();
      cy.get('[role="tab"]').contains('Sign In').click();

      // Should not crash
      cy.get('input[type="email"]').should('be.visible');
      cy.get('input[type="password"]').should('be.visible');
    });
  });

  describe('Browser Environment Scenarios', () => {
    it('should handle localStorage being disabled', () => {
      // Mock localStorage being disabled
      cy.window().then((win) => {
        Object.defineProperty(win, 'localStorage', {
          value: undefined,
          configurable: true,
        });
      });

      cy.visit('/login');
      
      // Should not crash
      cy.get('input[type="email"]').should('be.visible');
      cy.get('input[type="password"]').should('be.visible');
    });

    it('should handle sessionStorage being disabled', () => {
      // Mock sessionStorage being disabled
      cy.window().then((win) => {
        Object.defineProperty(win, 'sessionStorage', {
          value: undefined,
          configurable: true,
        });
      });

      cy.visit('/login');
      
      // Should not crash
      cy.get('input[type="email"]').should('be.visible');
      cy.get('input[type="password"]').should('be.visible');
    });

    it('should handle navigator.userAgent being undefined', () => {
      // Mock navigator.userAgent being undefined
      cy.window().then((win) => {
        Object.defineProperty(win.navigator, 'userAgent', {
          value: undefined,
          configurable: true,
        });
      });

      cy.visit('/login');
      
      // Should not crash
      cy.get('input[type="email"]').should('be.visible');
      cy.get('input[type="password"]').should('be.visible');
    });
  });

  describe('Memory Pressure Scenarios', () => {
    it('should handle memory pressure during form interaction', () => {
      cy.visit('/login');
      
      // Simulate memory pressure by creating large objects
      cy.window().then((win) => {
        const largeArray = new Array(1000000).fill('x');
        win.memoryPressure = largeArray;
      });

      cy.get('input[type="email"]').type('test@example.com');
      cy.get('input[type="password"]').type('password123');
      cy.get('button[type="submit"]').click();

      // Should not crash despite memory pressure
      cy.get('button[type="submit"]').should('be.disabled');
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should recover from authentication errors', () => {
      // Mock authentication failure
      cy.intercept('POST', '**/identitytoolkit.googleapis.com/**', {
        statusCode: 400,
        body: { error: { message: 'INVALID_PASSWORD' } }
      }).as('authFailure');

      cy.visit('/login');
      
      cy.get('input[type="email"]').type('test@example.com');
      cy.get('input[type="password"]').type('wrongpassword');
      cy.get('button[type="submit"]').click();

      // Should show error message
      cy.contains('Incorrect password').should('be.visible');

      // Should be able to retry
      cy.get('input[type="password"]').clear().type('correctpassword');
      cy.get('button[type="submit"]').click();

      // Should not crash
      cy.get('button[type="submit"]').should('be.disabled');
    });

    it('should recover from network errors', () => {
      // Mock network error
      cy.intercept('POST', '**/identitytoolkit.googleapis.com/**', {
        statusCode: 0,
        body: null
      }).as('networkError');

      cy.visit('/login');
      
      cy.get('input[type="email"]').type('test@example.com');
      cy.get('input[type="password"]').type('password123');
      cy.get('button[type="submit"]').click();

      // Should show error message
      cy.contains('Network error').should('be.visible');

      // Should be able to retry
      cy.get('button[type="submit"]').click();

      // Should not crash
      cy.get('button[type="submit"]').should('be.disabled');
    });
  });
});




