describe('Subscription Flow Tests', () => {
  beforeEach(() => {
    // Reset database and clear storage
    cy.task('db:reset');
    cy.clearLocalStorage();
    cy.clearCookies();
    
    // Login as a user
    cy.login('test@coachcore.ai', 'TestPassword123!');
  });

  describe('Free Plan Features', () => {
    it('should display free plan features correctly', () => {
      cy.visit('/pricing');
      
      cy.get('[data-testid="free-plan"]').should('be.visible');
      cy.get('[data-testid="free-plan"]').within(() => {
        cy.contains('Free').should('be.visible');
        cy.contains('$0/month').should('be.visible');
        cy.contains('Basic Play Creation').should('be.visible');
        cy.contains('Limited AI Suggestions').should('be.visible');
      });
    });

    it('should allow access to basic features on free plan', () => {
      // Mock user with free plan
      cy.window().then((win) => {
        win.localStorage.setItem('user', JSON.stringify({
          id: 'test-user-id',
          email: 'test@coachcore.ai',
          subscription: {
            plan: 'free',
            status: 'active'
          }
        }));
      });

      cy.visit('/dashboard');
      
      // Should have access to basic features
      cy.get('[data-testid="create-play-button"]').should('be.visible');
      cy.get('[data-testid="basic-plays-section"]').should('be.visible');
    });

    it('should show upgrade prompts for pro features', () => {
      // Mock user with free plan
      cy.window().then((win) => {
        win.localStorage.setItem('user', JSON.stringify({
          id: 'test-user-id',
          email: 'test@coachcore.ai',
          subscription: {
            plan: 'free',
            status: 'active'
          }
        }));
      });

      cy.visit('/play-designer');
      
      // Should show upgrade prompt
      cy.get('[data-testid="upgrade-prompt"]').should('be.visible');
      cy.get('[data-testid="upgrade-button"]').should('be.visible');
    });
  });

  describe('Pro Plan Upgrade', () => {
    it('should display pro plan features correctly', () => {
      cy.visit('/pricing');
      
      cy.get('[data-testid="pro-plan"]').should('be.visible');
      cy.get('[data-testid="pro-plan"]').within(() => {
        cy.contains('Pro').should('be.visible');
        cy.contains('$29/month').should('be.visible');
        cy.contains('Advanced Play Designer').should('be.visible');
        cy.contains('Unlimited AI Suggestions').should('be.visible');
        cy.contains('Team Collaboration').should('be.visible');
      });
    });

    it('should initiate Stripe checkout for pro upgrade', () => {
      // Mock Stripe checkout session creation
      cy.intercept('POST', '**/api/create-checkout-session**', {
        statusCode: 200,
        body: {
          sessionId: 'cs_test_123',
          url: 'https://checkout.stripe.com/c/pay/cs_test_123'
        }
      }).as('createCheckoutSession');

      cy.visit('/pricing');
      
      cy.get('[data-testid="pro-plan"]').within(() => {
        cy.get('[data-testid="upgrade-button"]').click();
      });

      cy.wait('@createCheckoutSession');
      
      // Should redirect to Stripe checkout
      cy.url().should('include', 'checkout.stripe.com');
    });

    it('should handle successful payment', () => {
      // Mock successful payment webhook
      cy.intercept('POST', '**/api/webhook/stripe**', {
        statusCode: 200,
        body: {
          type: 'checkout.session.completed',
          data: {
            object: {
              id: 'cs_test_123',
              customer: 'cus_test_123',
              subscription: 'sub_test_123',
              payment_status: 'paid'
            }
          }
        }
      }).as('paymentWebhook');

      // Mock subscription update
      cy.intercept('PATCH', '**/api/user/subscription**', {
        statusCode: 200,
        body: {
          plan: 'pro',
          status: 'active',
          subscriptionId: 'sub_test_123'
        }
      }).as('updateSubscription');

      // Simulate successful payment redirect
      cy.visit('/dashboard?payment=success&session_id=cs_test_123');
      
      cy.wait('@paymentWebhook');
      cy.wait('@updateSubscription');
      
      // Should show success message
      cy.get('[data-testid="payment-success"]').should('be.visible');
      
      // Should update user subscription
      cy.window().then((win) => {
        const user = JSON.parse(win.localStorage.getItem('user') || '{}');
        expect(user.subscription.plan).to.equal('pro');
        expect(user.subscription.status).to.equal('active');
      });
    });

    it('should handle failed payment', () => {
      // Simulate failed payment redirect
      cy.visit('/dashboard?payment=failed&session_id=cs_test_123');
      
      // Should show error message
      cy.get('[data-testid="payment-error"]').should('be.visible');
      cy.get('[data-testid="retry-payment-button"]').should('be.visible');
    });

    it('should handle cancelled payment', () => {
      // Simulate cancelled payment redirect
      cy.visit('/dashboard?payment=cancelled&session_id=cs_test_123');
      
      // Should show cancellation message
      cy.get('[data-testid="payment-cancelled"]').should('be.visible');
      cy.get('[data-testid="try-again-button"]').should('be.visible');
    });
  });

  describe('Pro Plan Features', () => {
    beforeEach(() => {
      // Mock user with pro plan
      cy.window().then((win) => {
        win.localStorage.setItem('user', JSON.stringify({
          id: 'test-user-id',
          email: 'test@coachcore.ai',
          subscription: {
            plan: 'pro',
            status: 'active',
            subscriptionId: 'sub_test_123'
          }
        }));
      });
    });

    it('should have access to Play Designer', () => {
      cy.visit('/play-designer');
      
      // Should not show upgrade prompt
      cy.get('[data-testid="upgrade-prompt"]').should('not.exist');
      
      // Should show pro features
      cy.get('[data-testid="advanced-tools"]').should('be.visible');
      cy.get('[data-testid="ai-suggestions"]').should('be.visible');
    });

    it('should have access to Dashboard', () => {
      cy.visit('/dashboard');
      
      // Should show pro dashboard features
      cy.get('[data-testid="analytics-section"]').should('be.visible');
      cy.get('[data-testid="team-collaboration"]').should('be.visible');
      cy.get('[data-testid="advanced-reports"]').should('be.visible');
    });

    it('should have unlimited AI suggestions', () => {
      cy.visit('/play-designer');
      
      // Should not show usage limits
      cy.get('[data-testid="usage-limit"]').should('not.exist');
      cy.get('[data-testid="ai-suggestions-remaining"]').should('not.exist');
    });

    it('should have team collaboration features', () => {
      cy.visit('/team');
      
      // Should show team features
      cy.get('[data-testid="invite-members"]').should('be.visible');
      cy.get('[data-testid="team-settings"]').should('be.visible');
      cy.get('[data-testid="shared-plays"]').should('be.visible');
    });
  });

  describe('Subscription Management', () => {
    beforeEach(() => {
      // Mock user with pro plan
      cy.window().then((win) => {
        win.localStorage.setItem('user', JSON.stringify({
          id: 'test-user-id',
          email: 'test@coachcore.ai',
          subscription: {
            plan: 'pro',
            status: 'active',
            subscriptionId: 'sub_test_123'
          }
        }));
      });
    });

    it('should display subscription details', () => {
      cy.visit('/settings/subscription');
      
      cy.get('[data-testid="current-plan"]').should('contain', 'Pro');
      cy.get('[data-testid="subscription-status"]').should('contain', 'Active');
      cy.get('[data-testid="next-billing-date"]').should('be.visible');
    });

    it('should allow subscription cancellation', () => {
      // Mock cancellation request
      cy.intercept('POST', '**/api/subscription/cancel**', {
        statusCode: 200,
        body: {
          success: true,
          cancelledAt: new Date().toISOString()
        }
      }).as('cancelSubscription');

      cy.visit('/settings/subscription');
      
      cy.get('[data-testid="cancel-subscription-button"]').click();
      cy.get('[data-testid="confirm-cancellation"]').click();

      cy.wait('@cancelSubscription');
      
      // Should show cancellation confirmation
      cy.get('[data-testid="cancellation-success"]').should('be.visible');
    });

    it('should allow subscription reactivation', () => {
      // Mock user with cancelled subscription
      cy.window().then((win) => {
        win.localStorage.setItem('user', JSON.stringify({
          id: 'test-user-id',
          email: 'test@coachcore.ai',
          subscription: {
            plan: 'pro',
            status: 'cancelled',
            subscriptionId: 'sub_test_123'
          }
        }));
      });

      // Mock reactivation request
      cy.intercept('POST', '**/api/subscription/reactivate**', {
        statusCode: 200,
        body: {
          success: true,
          status: 'active'
        }
      }).as('reactivateSubscription');

      cy.visit('/settings/subscription');
      
      cy.get('[data-testid="reactivate-subscription-button"]').click();
      cy.get('[data-testid="confirm-reactivation"]').click();

      cy.wait('@reactivateSubscription');
      
      // Should show reactivation success
      cy.get('[data-testid="reactivation-success"]').should('be.visible');
    });

    it('should handle billing issues', () => {
      // Mock user with past due subscription
      cy.window().then((win) => {
        win.localStorage.setItem('user', JSON.stringify({
          id: 'test-user-id',
          email: 'test@coachcore.ai',
          subscription: {
            plan: 'pro',
            status: 'past_due',
            subscriptionId: 'sub_test_123'
          }
        }));
      });

      cy.visit('/settings/subscription');
      
      // Should show billing issue warning
      cy.get('[data-testid="billing-issue-warning"]').should('be.visible');
      cy.get('[data-testid="update-payment-method"]').should('be.visible');
    });
  });

  describe('Access Control', () => {
    it('should block access to pro features for free users', () => {
      // Mock user with free plan
      cy.window().then((win) => {
        win.localStorage.setItem('user', JSON.stringify({
          id: 'test-user-id',
          email: 'test@coachcore.ai',
          subscription: {
            plan: 'free',
            status: 'active'
          }
        }));
      });

      // Try to access pro features
      cy.visit('/play-designer');
      cy.url().should('include', '/pricing');
      cy.get('[data-testid="upgrade-prompt"]').should('be.visible');

      cy.visit('/dashboard');
      cy.get('[data-testid="pro-features-locked"]').should('be.visible');
    });

    it('should allow access to pro features for pro users', () => {
      // Mock user with pro plan
      cy.window().then((win) => {
        win.localStorage.setItem('user', JSON.stringify({
          id: 'test-user-id',
          email: 'test@coachcore.ai',
          subscription: {
            plan: 'pro',
            status: 'active'
          }
        }));
      });

      // Should have access to pro features
      cy.visit('/play-designer');
      cy.url().should('include', '/play-designer');
      cy.get('[data-testid="upgrade-prompt"]').should('not.exist');

      cy.visit('/dashboard');
      cy.get('[data-testid="pro-features-locked"]').should('not.exist');
    });

    it('should handle subscription expiration', () => {
      // Mock user with expired subscription
      cy.window().then((win) => {
        win.localStorage.setItem('user', JSON.stringify({
          id: 'test-user-id',
          email: 'test@coachcore.ai',
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
  });

  describe('Pricing Page', () => {
    it('should display all pricing plans', () => {
      cy.visit('/pricing');
      
      cy.get('[data-testid="free-plan"]').should('be.visible');
      cy.get('[data-testid="pro-plan"]').should('be.visible');
      cy.get('[data-testid="enterprise-plan"]').should('be.visible');
    });

    it('should highlight recommended plan', () => {
      cy.visit('/pricing');
      
      cy.get('[data-testid="pro-plan"]').should('have.class', 'recommended');
      cy.get('[data-testid="pro-plan"]').within(() => {
        cy.contains('Most Popular').should('be.visible');
      });
    });

    it('should show feature comparison', () => {
      cy.visit('/pricing');
      
      cy.get('[data-testid="feature-comparison"]').should('be.visible');
      cy.get('[data-testid="feature-row"]').should('have.length.greaterThan', 0);
    });

    it('should allow plan selection', () => {
      cy.visit('/pricing');
      
      cy.get('[data-testid="pro-plan"]').within(() => {
        cy.get('[data-testid="select-plan-button"]').click();
      });
      
      // Should redirect to checkout or signup
      cy.url().should('satisfy', (url) => {
        return url.includes('/checkout') || url.includes('/signup');
      });
    });
  });
});






