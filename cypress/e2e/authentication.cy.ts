describe('Authentication Flow Tests', () => {
  beforeEach(() => {
    // Reset database and clear storage
    cy.task('db:reset');
    cy.clearLocalStorage();
    cy.clearCookies();
  });

  describe('User Login', () => {
    it('should login with valid credentials', () => {
      const testUser = {
        email: 'test@coachcore.ai',
        password: 'TestPassword123!'
      };

      // Mock successful login
      cy.intercept('POST', '**/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword**', {
        statusCode: 200,
        body: {
          localId: 'test-user-id',
          email: testUser.email,
          idToken: 'mock-id-token',
          refreshToken: 'mock-refresh-token',
          expiresIn: '3600'
        }
      }).as('loginRequest');

      cy.visit('/login');
      
      cy.get('[data-testid="email-input"]').type(testUser.email);
      cy.get('[data-testid="password-input"]').type(testUser.password);
      cy.get('[data-testid="login-button"]').click();

      cy.wait('@loginRequest');
      cy.url().should('include', '/dashboard');
      cy.get('[data-testid="user-menu"]').should('be.visible');
    });

    it('should show error for invalid credentials', () => {
      const testUser = {
        email: 'test@coachcore.ai',
        password: 'WrongPassword'
      };

      // Mock failed login
      cy.intercept('POST', '**/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword**', {
        statusCode: 400,
        body: {
          error: {
            message: 'INVALID_PASSWORD'
          }
        }
      }).as('loginError');

      cy.visit('/login');
      
      cy.get('[data-testid="email-input"]').type(testUser.email);
      cy.get('[data-testid="password-input"]').type(testUser.password);
      cy.get('[data-testid="login-button"]').click();

      cy.wait('@loginError');
      cy.get('[data-testid="error-message"]').should('contain', 'Invalid password');
    });

    it('should show error for non-existent user', () => {
      const testUser = {
        email: 'nonexistent@coachcore.ai',
        password: 'TestPassword123!'
      };

      // Mock user not found
      cy.intercept('POST', '**/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword**', {
        statusCode: 400,
        body: {
          error: {
            message: 'EMAIL_NOT_FOUND'
          }
        }
      }).as('userNotFound');

      cy.visit('/login');
      
      cy.get('[data-testid="email-input"]').type(testUser.email);
      cy.get('[data-testid="password-input"]').type(testUser.password);
      cy.get('[data-testid="login-button"]').click();

      cy.wait('@userNotFound');
      cy.get('[data-testid="error-message"]').should('contain', 'User not found');
    });

    it('should validate email format', () => {
      cy.visit('/login');
      
      cy.get('[data-testid="email-input"]').type('invalid-email');
      cy.get('[data-testid="password-input"]').type('TestPassword123!');
      cy.get('[data-testid="login-button"]').click();

      cy.get('[data-testid="email-error"]').should('contain', 'Please enter a valid email');
    });

    it('should show loading state during login', () => {
      const testUser = {
        email: 'test@coachcore.ai',
        password: 'TestPassword123!'
      };

      // Mock delayed response
      cy.intercept('POST', '**/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword**', {
        statusCode: 200,
        body: {
          localId: 'test-user-id',
          email: testUser.email,
          idToken: 'mock-id-token',
          refreshToken: 'mock-refresh-token',
          expiresIn: '3600'
        },
        delay: 2000
      }).as('delayedLogin');

      cy.visit('/login');
      
      cy.get('[data-testid="email-input"]').type(testUser.email);
      cy.get('[data-testid="password-input"]').type(testUser.password);
      cy.get('[data-testid="login-button"]').click();

      // Check loading state
      cy.get('[data-testid="login-button"]').should('be.disabled');
      cy.get('[data-testid="loading-spinner"]').should('be.visible');

      cy.wait('@delayedLogin');
      cy.url().should('include', '/dashboard');
    });
  });

  describe('User Signup', () => {
    it('should signup with valid credentials', () => {
      const testUser = {
        email: 'newuser@coachcore.ai',
        password: 'TestPassword123!',
        confirmPassword: 'TestPassword123!',
        teamName: 'Test Team'
      };

      // Mock successful signup
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
      cy.get('[data-testid="confirm-password-input"]').type(testUser.confirmPassword);
      cy.get('[data-testid="team-name-input"]').type(testUser.teamName);
      cy.get('[data-testid="signup-button"]').click();

      cy.wait('@signupRequest');
      cy.url().should('include', '/verify-email');
    });

    it('should validate password requirements', () => {
      cy.visit('/signup');
      
      cy.get('[data-testid="email-input"]').type('test@coachcore.ai');
      cy.get('[data-testid="password-input"]').type('weak');
      cy.get('[data-testid="confirm-password-input"]').type('weak');
      cy.get('[data-testid="team-name-input"]').type('Test Team');
      cy.get('[data-testid="signup-button"]').click();

      cy.get('[data-testid="password-error"]').should('contain', 'Password must be at least 8 characters');
    });

    it('should validate password confirmation', () => {
      cy.visit('/signup');
      
      cy.get('[data-testid="email-input"]').type('test@coachcore.ai');
      cy.get('[data-testid="password-input"]').type('TestPassword123!');
      cy.get('[data-testid="confirm-password-input"]').type('DifferentPassword123!');
      cy.get('[data-testid="team-name-input"]').type('Test Team');
      cy.get('[data-testid="signup-button"]').click();

      cy.get('[data-testid="confirm-password-error"]').should('contain', 'Passwords do not match');
    });

    it('should handle email already exists error', () => {
      const testUser = {
        email: 'existing@coachcore.ai',
        password: 'TestPassword123!',
        confirmPassword: 'TestPassword123!',
        teamName: 'Test Team'
      };

      // Mock email already exists
      cy.intercept('POST', '**/identitytoolkit.googleapis.com/v1/accounts:signUp**', {
        statusCode: 400,
        body: {
          error: {
            message: 'EMAIL_EXISTS'
          }
        }
      }).as('emailExists');

      cy.visit('/signup');
      
      cy.get('[data-testid="email-input"]').type(testUser.email);
      cy.get('[data-testid="password-input"]').type(testUser.password);
      cy.get('[data-testid="confirm-password-input"]').type(testUser.confirmPassword);
      cy.get('[data-testid="team-name-input"]').type(testUser.teamName);
      cy.get('[data-testid="signup-button"]').click();

      cy.wait('@emailExists');
      cy.get('[data-testid="error-message"]').should('contain', 'Email already exists');
    });
  });

  describe('User Logout', () => {
    beforeEach(() => {
      // Login first
      cy.login('test@coachcore.ai', 'TestPassword123!');
    });

    it('should logout successfully', () => {
      cy.get('[data-testid="user-menu"]').click();
      cy.get('[data-testid="logout-button"]').click();
      
      cy.url().should('include', '/login');
      cy.get('[data-testid="login-form"]').should('be.visible');
    });

    it('should clear user session on logout', () => {
      cy.get('[data-testid="user-menu"]').click();
      cy.get('[data-testid="logout-button"]').click();
      
      // Verify session is cleared
      cy.window().then((win) => {
        expect(win.localStorage.getItem('user')).to.be.null;
        expect(win.localStorage.getItem('token')).to.be.null;
      });
    });
  });

  describe('Password Reset', () => {
    it('should send password reset email', () => {
      const testEmail = 'test@coachcore.ai';

      // Mock password reset request
      cy.intercept('POST', '**/identitytoolkit.googleapis.com/v1/accounts:sendOobCode**', {
        statusCode: 200,
        body: {
          email: testEmail
        }
      }).as('passwordResetRequest');

      cy.visit('/forgot-password');
      
      cy.get('[data-testid="email-input"]').type(testEmail);
      cy.get('[data-testid="send-reset-button"]').click();

      cy.wait('@passwordResetRequest');
      cy.get('[data-testid="success-message"]').should('contain', 'Password reset email sent');
    });

    it('should handle invalid email for password reset', () => {
      const testEmail = 'nonexistent@coachcore.ai';

      // Mock email not found
      cy.intercept('POST', '**/identitytoolkit.googleapis.com/v1/accounts:sendOobCode**', {
        statusCode: 400,
        body: {
          error: {
            message: 'EMAIL_NOT_FOUND'
          }
        }
      }).as('emailNotFound');

      cy.visit('/forgot-password');
      
      cy.get('[data-testid="email-input"]').type(testEmail);
      cy.get('[data-testid="send-reset-button"]').click();

      cy.wait('@emailNotFound');
      cy.get('[data-testid="error-message"]').should('contain', 'Email not found');
    });
  });

  describe('Session Management', () => {
    it('should redirect to login when not authenticated', () => {
      cy.visit('/dashboard');
      cy.url().should('include', '/login');
    });

    it('should maintain session across page refreshes', () => {
      cy.login('test@coachcore.ai', 'TestPassword123!');
      
      cy.reload();
      cy.url().should('include', '/dashboard');
      cy.get('[data-testid="user-menu"]').should('be.visible');
    });

    it('should handle token expiration', () => {
      // Mock expired token
      cy.intercept('GET', '**/identitytoolkit.googleapis.com/v1/accounts:lookup**', {
        statusCode: 400,
        body: {
          error: {
            message: 'INVALID_ID_TOKEN'
          }
        }
      }).as('expiredToken');

      cy.login('test@coachcore.ai', 'TestPassword123!');
      
      // Trigger a request that would check token validity
      cy.visit('/dashboard');
      cy.wait('@expiredToken');
      
      // Should redirect to login
      cy.url().should('include', '/login');
    });
  });
});


