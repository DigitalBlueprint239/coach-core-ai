describe('Access Control Tests', () => {
  beforeEach(() => {
    // Reset database and clear storage
    cy.task('db:reset');
    cy.clearLocalStorage();
    cy.clearCookies();
  });

  describe('Unauthenticated Access', () => {
    it('should redirect to login for protected routes', () => {
      const protectedRoutes = [
        '/dashboard',
        '/play-designer',
        '/practice-planner',
        '/team',
        '/settings',
        '/analytics'
      ];

      protectedRoutes.forEach(route => {
        cy.visit(route);
        cy.url().should('include', '/login');
        cy.get('[data-testid="login-form"]').should('be.visible');
      });
    });

    it('should allow access to public routes', () => {
      const publicRoutes = [
        '/',
        '/pricing',
        '/features',
        '/about',
        '/contact',
        '/waitlist'
      ];

      publicRoutes.forEach(route => {
        cy.visit(route);
        cy.url().should('include', route);
        cy.get('body').should('be.visible');
      });
    });

    it('should show login prompt for protected features', () => {
      cy.visit('/');
      
      // Try to access protected features from landing page
      cy.get('[data-testid="try-demo-button"]').click();
      cy.url().should('include', '/login');
      
      cy.visit('/');
      cy.get('[data-testid="get-started-button"]').click();
      cy.url().should('include', '/login');
    });
  });

  describe('Free Plan Access Control', () => {
    beforeEach(() => {
      // Login as free user
      cy.login('freeuser@coachcore.ai', 'TestPassword123!');
      
      // Mock free user data
      cy.window().then((win) => {
        win.localStorage.setItem('user', JSON.stringify({
          id: 'free-user-id',
          email: 'freeuser@coachcore.ai',
          subscription: {
            plan: 'free',
            status: 'active'
          }
        }));
      });
    });

    it('should allow access to basic features', () => {
      const allowedRoutes = [
        '/dashboard',
        '/plays',
        '/practices',
        '/settings/profile'
      ];

      allowedRoutes.forEach(route => {
        cy.visit(route);
        cy.url().should('include', route);
        cy.get('body').should('be.visible');
      });
    });

    it('should block access to pro features', () => {
      const proRoutes = [
        '/play-designer',
        '/analytics',
        '/team',
        '/settings/subscription'
      ];

      proRoutes.forEach(route => {
        cy.visit(route);
        cy.url().should('include', '/pricing');
        cy.get('[data-testid="upgrade-prompt"]').should('be.visible');
      });
    });

    it('should show upgrade prompts for pro features', () => {
      cy.visit('/dashboard');
      
      // Should show upgrade prompts for pro features
      cy.get('[data-testid="upgrade-prompt"]').should('be.visible');
      cy.get('[data-testid="upgrade-button"]').should('be.visible');
      
      // Click upgrade button should go to pricing
      cy.get('[data-testid="upgrade-button"]').click();
      cy.url().should('include', '/pricing');
    });

    it('should limit AI suggestions for free users', () => {
      cy.visit('/plays');
      
      // Should show usage limits
      cy.get('[data-testid="ai-usage-limit"]').should('be.visible');
      cy.get('[data-testid="ai-suggestions-remaining"]').should('contain', '5');
      
      // Should disable AI features after limit
      cy.get('[data-testid="ai-suggest-button"]').should('be.disabled');
    });

    it('should allow basic play creation', () => {
      cy.visit('/plays/create');
      
      // Should have access to basic play creation
      cy.get('[data-testid="play-name-input"]').should('be.visible');
      cy.get('[data-testid="play-description-input"]').should('be.visible');
      cy.get('[data-testid="basic-formation-select"]').should('be.visible');
      
      // Should not have advanced features
      cy.get('[data-testid="advanced-tools"]').should('not.exist');
      cy.get('[data-testid="ai-suggestions"]').should('not.exist');
    });
  });

  describe('Pro Plan Access Control', () => {
    beforeEach(() => {
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
          }
        }));
      });
    });

    it('should allow access to all features', () => {
      const allRoutes = [
        '/dashboard',
        '/play-designer',
        '/practice-planner',
        '/analytics',
        '/team',
        '/settings',
        '/plays',
        '/practices'
      ];

      allRoutes.forEach(route => {
        cy.visit(route);
        cy.url().should('include', route);
        cy.get('body').should('be.visible');
      });
    });

    it('should not show upgrade prompts', () => {
      cy.visit('/dashboard');
      
      // Should not show upgrade prompts
      cy.get('[data-testid="upgrade-prompt"]').should('not.exist');
      cy.get('[data-testid="upgrade-button"]').should('not.exist');
    });

    it('should have unlimited AI suggestions', () => {
      cy.visit('/play-designer');
      
      // Should not show usage limits
      cy.get('[data-testid="ai-usage-limit"]').should('not.exist');
      cy.get('[data-testid="ai-suggestions-remaining"]').should('not.exist');
      
      // Should have AI features enabled
      cy.get('[data-testid="ai-suggest-button"]').should('be.enabled');
    });

    it('should have access to advanced features', () => {
      cy.visit('/play-designer');
      
      // Should have advanced tools
      cy.get('[data-testid="advanced-tools"]').should('be.visible');
      cy.get('[data-testid="ai-suggestions"]').should('be.visible');
      cy.get('[data-testid="collaboration-tools"]').should('be.visible');
    });

    it('should have access to team features', () => {
      cy.visit('/team');
      
      // Should have team management features
      cy.get('[data-testid="invite-members"]').should('be.visible');
      cy.get('[data-testid="team-settings"]').should('be.visible');
      cy.get('[data-testid="shared-plays"]').should('be.visible');
    });

    it('should have access to analytics', () => {
      cy.visit('/analytics');
      
      // Should have analytics features
      cy.get('[data-testid="performance-metrics"]').should('be.visible');
      cy.get('[data-testid="usage-statistics"]').should('be.visible');
      cy.get('[data-testid="export-reports"]').should('be.visible');
    });
  });

  describe('Subscription Status Access Control', () => {
    it('should handle expired subscription', () => {
      // Login as user with expired subscription
      cy.login('expireduser@coachcore.ai', 'TestPassword123!');
      
      cy.window().then((win) => {
        win.localStorage.setItem('user', JSON.stringify({
          id: 'expired-user-id',
          email: 'expireduser@coachcore.ai',
          subscription: {
            plan: 'pro',
            status: 'expired',
            subscriptionId: 'sub_test_123'
          }
        }));
      });

      cy.visit('/play-designer');
      
      // Should show subscription expired message
      cy.get('[data-testid="subscription-expired"]').should('be.visible');
      cy.get('[data-testid="renew-subscription-button"]').should('be.visible');
    });

    it('should handle cancelled subscription', () => {
      // Login as user with cancelled subscription
      cy.login('cancelleduser@coachcore.ai', 'TestPassword123!');
      
      cy.window().then((win) => {
        win.localStorage.setItem('user', JSON.stringify({
          id: 'cancelled-user-id',
          email: 'cancelleduser@coachcore.ai',
          subscription: {
            plan: 'pro',
            status: 'cancelled',
            subscriptionId: 'sub_test_123'
          }
        }));
      });

      cy.visit('/play-designer');
      
      // Should show subscription cancelled message
      cy.get('[data-testid="subscription-cancelled"]').should('be.visible');
      cy.get('[data-testid="reactivate-subscription-button"]').should('be.visible');
    });

    it('should handle past due subscription', () => {
      // Login as user with past due subscription
      cy.login('pastdueuser@coachcore.ai', 'TestPassword123!');
      
      cy.window().then((win) => {
        win.localStorage.setItem('user', JSON.stringify({
          id: 'pastdue-user-id',
          email: 'pastdueuser@coachcore.ai',
          subscription: {
            plan: 'pro',
            status: 'past_due',
            subscriptionId: 'sub_test_123'
          }
        }));
      });

      cy.visit('/dashboard');
      
      // Should show billing issue warning
      cy.get('[data-testid="billing-issue-warning"]').should('be.visible');
      cy.get('[data-testid="update-payment-method"]').should('be.visible');
    });
  });

  describe('Role-Based Access Control', () => {
    it('should handle team owner permissions', () => {
      cy.login('owner@coachcore.ai', 'TestPassword123!');
      
      cy.window().then((win) => {
        win.localStorage.setItem('user', JSON.stringify({
          id: 'owner-user-id',
          email: 'owner@coachcore.ai',
          subscription: {
            plan: 'pro',
            status: 'active'
          },
          team: {
            id: 'team-123',
            role: 'owner'
          }
        }));
      });

      cy.visit('/team');
      
      // Should have owner permissions
      cy.get('[data-testid="team-settings"]').should('be.visible');
      cy.get('[data-testid="invite-members"]').should('be.visible');
      cy.get('[data-testid="delete-team"]').should('be.visible');
    });

    it('should handle team member permissions', () => {
      cy.login('member@coachcore.ai', 'TestPassword123!');
      
      cy.window().then((win) => {
        win.localStorage.setItem('user', JSON.stringify({
          id: 'member-user-id',
          email: 'member@coachcore.ai',
          subscription: {
            plan: 'pro',
            status: 'active'
          },
          team: {
            id: 'team-123',
            role: 'member'
          }
        }));
      });

      cy.visit('/team');
      
      // Should have member permissions
      cy.get('[data-testid="team-settings"]').should('not.exist');
      cy.get('[data-testid="invite-members"]').should('not.exist');
      cy.get('[data-testid="delete-team"]').should('not.exist');
      
      // Should have basic team features
      cy.get('[data-testid="team-members"]').should('be.visible');
      cy.get('[data-testid="shared-plays"]').should('be.visible');
    });

    it('should handle team admin permissions', () => {
      cy.login('admin@coachcore.ai', 'TestPassword123!');
      
      cy.window().then((win) => {
        win.localStorage.setItem('user', JSON.stringify({
          id: 'admin-user-id',
          email: 'admin@coachcore.ai',
          subscription: {
            plan: 'pro',
            status: 'active'
          },
          team: {
            id: 'team-123',
            role: 'admin'
          }
        }));
      });

      cy.visit('/team');
      
      // Should have admin permissions
      cy.get('[data-testid="team-settings"]').should('be.visible');
      cy.get('[data-testid="invite-members"]').should('be.visible');
      cy.get('[data-testid="manage-members"]').should('be.visible');
      
      // Should not have owner-only features
      cy.get('[data-testid="delete-team"]').should('not.exist');
    });
  });

  describe('Feature Flags', () => {
    it('should respect feature flags for beta features', () => {
      cy.login('test@coachcore.ai', 'TestPassword123!');
      
      // Mock feature flags
      cy.window().then((win) => {
        win.localStorage.setItem('featureFlags', JSON.stringify({
          'ai-suggestions': true,
          'team-collaboration': false,
          'advanced-analytics': true
        }));
      });

      cy.visit('/dashboard');
      
      // Should show enabled features
      cy.get('[data-testid="ai-suggestions"]').should('be.visible');
      cy.get('[data-testid="advanced-analytics"]').should('be.visible');
      
      // Should not show disabled features
      cy.get('[data-testid="team-collaboration"]').should('not.exist');
    });

    it('should handle A/B testing features', () => {
      cy.login('test@coachcore.ai', 'TestPassword123!');
      
      // Mock A/B test assignment
      cy.window().then((win) => {
        win.localStorage.setItem('abTests', JSON.stringify({
          'new-dashboard': 'variant-a',
          'play-designer-ui': 'variant-b'
        }));
      });

      cy.visit('/dashboard');
      
      // Should show variant A features
      cy.get('[data-testid="variant-a-feature"]').should('be.visible');
      
      cy.visit('/play-designer');
      
      // Should show variant B features
      cy.get('[data-testid="variant-b-feature"]').should('be.visible');
    });
  });

  describe('API Access Control', () => {
    it('should require authentication for protected API endpoints', () => {
      // Try to access protected API without authentication
      cy.request({
        method: 'GET',
        url: '/api/user/profile',
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.equal(401);
        expect(response.body.error).to.contain('Unauthorized');
      });
    });

    it('should require pro subscription for pro API endpoints', () => {
      // Login as free user
      cy.login('freeuser@coachcore.ai', 'TestPassword123!');
      
      cy.window().then((win) => {
        win.localStorage.setItem('user', JSON.stringify({
          id: 'free-user-id',
          email: 'freeuser@coachcore.ai',
          subscription: {
            plan: 'free',
            status: 'active'
          }
        }));
      });

      // Try to access pro API endpoint
      cy.request({
        method: 'GET',
        url: '/api/analytics/advanced',
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.equal(403);
        expect(response.body.error).to.contain('Pro subscription required');
      });
    });

    it('should validate subscription status for API calls', () => {
      // Login as user with expired subscription
      cy.login('expireduser@coachcore.ai', 'TestPassword123!');
      
      cy.window().then((win) => {
        win.localStorage.setItem('user', JSON.stringify({
          id: 'expired-user-id',
          email: 'expireduser@coachcore.ai',
          subscription: {
            plan: 'pro',
            status: 'expired',
            subscriptionId: 'sub_test_123'
          }
        }));
      });

      // Try to access pro API endpoint
      cy.request({
        method: 'GET',
        url: '/api/analytics/advanced',
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.equal(403);
        expect(response.body.error).to.contain('Subscription expired');
      });
    });
  });
});






