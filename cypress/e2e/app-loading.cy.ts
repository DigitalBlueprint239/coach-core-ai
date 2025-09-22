describe('App Loading Tests', () => {
  beforeEach(() => {
    // Visit the app before each test
    cy.visit('/');
  });

  it('should load the app without errors', () => {
    // Check that the app loads without console errors
    cy.window().then((win) => {
      const consoleErrors: string[] = [];
      const originalError = win.console.error;
      
      win.console.error = (...args: any[]) => {
        consoleErrors.push(args.join(' '));
        originalError.apply(win.console, args);
      };

      // Wait for the app to load
      cy.get('#root').should('be.visible');
      
      // Check for React error boundary
      cy.get('body').should('not.contain', 'Something went wrong');
      
      // Check that no critical errors occurred
      cy.wrap(consoleErrors).should('have.length', 0);
    });
  });

  it('should display the landing page correctly', () => {
    // Check for key elements on the landing page
    cy.get('body').should('be.visible');
    cy.get('#root').should('be.visible');
    
    // Check for navigation elements
    cy.get('nav').should('be.visible');
    
    // Check for main content
    cy.get('main, [role="main"]').should('be.visible');
  });

  it('should load all JavaScript chunks without MIME type errors', () => {
    // Intercept all JS file requests
    cy.intercept('GET', '/js/**', (req) => {
      expect(req.headers['accept']).to.include('application/javascript');
    }).as('jsFiles');

    // Reload the page to trigger JS loading
    cy.reload();
    
    // Wait for JS files to load
    cy.wait('@jsFiles', { timeout: 10000 });
    
    // Check that the app is still functional
    cy.get('#root').should('be.visible');
  });

  it('should load CSS files correctly', () => {
    // Check that CSS is loaded
    cy.get('head link[rel="stylesheet"]').should('have.length.at.least', 1);
    
    // Check that styles are applied
    cy.get('body').should('have.css', 'font-family');
  });

  it('should handle page refresh without errors', () => {
    // Wait for initial load
    cy.get('#root').should('be.visible');
    
    // Refresh the page
    cy.reload();
    
    // Check that the app loads again
    cy.get('#root').should('be.visible');
    cy.get('body').should('not.contain', 'Something went wrong');
  });

  it('should load within performance threshold', () => {
    const startTime = Date.now();
    
    cy.visit('/', {
      onBeforeLoad: () => {
        // Mark start time
        cy.wrap(startTime).as('startTime');
      }
    });
    
    cy.get('#root').should('be.visible').then(() => {
      const loadTime = Date.now() - startTime;
      expect(loadTime).to.be.lessThan(5000); // 5 second threshold
    });
  });
});

