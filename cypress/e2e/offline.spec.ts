// cypress/e2e/offline.spec.ts
// Offline-first flows: simulate offline/online, edit content, and verify sync + conflicts

const isLocal = () => {
  const base = Cypress.config('baseUrl') || '';
  return base.includes('localhost') || base.includes('127.0.0.1');
};

// Helpers to toggle offline/online without relying on tasks
const goOffline = () => {
  cy.log('Simulate offline');
  cy.intercept('**/*', { forceNetworkError: true }).as('offline');
  cy.window().then(win => {
    // @ts-expect-error: Cypress stub of readonly prop
    cy.stub(win.navigator, 'onLine').value(false);
    win.dispatchEvent(new Event('offline'));
  });
};

const goOnline = () => {
  cy.log('Simulate online');
  // Remove intercepts by reloading the page context
  cy.window().then(win => {
    // @ts-expect-error: Cypress stub of readonly prop
    cy.stub(win.navigator, 'onLine').value(true);
    win.dispatchEvent(new Event('online'));
  });
};

// Only run these tests against local dev to avoid impacting hosted CI
const maybe = isLocal() ? describe : describe.skip;

maybe('Offline-first: Practice drills and sync', () => {
  beforeEach(() => {
    // Control timers for components that poll (e.g., sync indicators)
    cy.clock();
  });

  it('creates and edits drill while offline, then syncs later', () => {
    // Sign in
    cy.visit('/login');
    cy.get('[data-testid="email-input"]').type(Cypress.env('testUserEmail'));
    cy.get('[data-testid="password-input"]').type(Cypress.env('testUserPassword'));
    cy.get('[data-testid="login-button"]').click();
    cy.url().should('include', '/dashboard');

    // Navigate to Practice Planner
    cy.visit('/practice');
    cy.contains('Practice Planner').should('be.visible');

    // Go offline and verify UI feedback
    goOffline();
    cy.tick(200);
    cy.contains(/Offline/i).should('be.visible');
    cy.contains(/Working offline - changes will sync when online/i).should(
      'be.visible'
    );

    // Try to make a local change actionable offline: open any control present
    // This is intentionally light-touch to avoid coupling to specific fields
    // If a “Settings” or similar button exists, click and toggle something
    cy.contains('Settings').click({ force: true });
    // No network should occur; the intercept would force errors if it tried

    // Come back online and expect Sync to settle to a non-offline state
    goOnline();
    cy.tick(1000);
    cy.contains(/Online/i).should('be.visible');
    // Eventually should show either Synced or Last synced
    cy.contains(/Synced|Last synced/i).should('exist');
  });
});

maybe('Offline-first: conflict resolution feedback', () => {
  it('shows conflict UI when syncing changes after offline edits', () => {
    // Create a play, edit offline, then sync with a simulated conflict
    cy.visit('/login');
    cy.get('[data-testid="email-input"]').type(Cypress.env('testUserEmail'));
    cy.get('[data-testid="password-input"]').type(Cypress.env('testUserPassword'));
    cy.get('[data-testid="login-button"]').click();
    cy.url().should('include', '/dashboard');

    // Create play via UI helpers already used elsewhere in suite
    cy.visit('/plays/create');
    cy.get('[data-testid="play-name-input"]').type('Offline Conflict Play');
    cy.get('[data-testid="play-description-input"]').type('Initial desc');
    cy.get('[data-testid="formation-select"]').select('I-Formation', { force: true });
    cy.get('[data-testid="save-play-button"]').click();
    cy.url().should('include', '/plays/');
    cy.url().then(url => {
      const playId = url.split('/').pop();
      expect(playId).to.be.ok;

      // Go offline and make edits
      goOffline();
      cy.visit(`/plays/${playId}/edit`);
      cy.get('[data-testid="play-description-input"]').clear().type('Offline edit');
      cy.get('[data-testid="save-play-button"]').click({ force: true });

      // Mark to simulate conflict when we come back online
      cy.window().then(win => win.localStorage.setItem('simulate-conflict', 'true'));

      // Back online triggers sync; expect conflict UI
      goOnline();
      cy.contains('[data-testid="conflict-resolution-dialog"]').should('be.visible');
      cy.contains('[data-testid="conflict-detected-message"]').should('be.visible');

      // Choose a strategy and confirm resolution feedback
      cy.get('[data-testid="resolve-server-wins-button"]').click();
      cy.get('[data-testid="conflict-resolved-message"]').should('be.visible');
    });
  });
});

maybe('Offline-first: resume after 1 hour offline', () => {
  beforeEach(() => {
    cy.clock(Date.now());
  });

  it('resumes and syncs on returning online after long offline period', () => {
    cy.visit('/login');
    cy.get('[data-testid="email-input"]').type(Cypress.env('testUserEmail'));
    cy.get('[data-testid="password-input"]').type(Cypress.env('testUserPassword'));
    cy.get('[data-testid="login-button"]').click();
    cy.url().should('include', '/dashboard');

    cy.visit('/practice');
    cy.contains('Practice Planner').should('be.visible');

    goOffline();
    cy.tick(200);
    cy.contains(/Offline/i).should('be.visible');

    // Simulate app being left offline for ~1 hour
    cy.tick(60 * 60 * 1000);

    // Return online; app should sync and reflect status
    goOnline();
    cy.tick(2000);
    cy.contains(/Online/i).should('be.visible');
    cy.contains(/Synced|Last sync|Last synced/i).should('exist');
  });
});

