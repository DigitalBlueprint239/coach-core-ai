// cypress/support/e2e.ts

// Import commands.js using ES2015 syntax:
import './commands';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// ============================================
// CUSTOM COMMANDS
// ============================================

declare global {
  namespace Cypress {
    interface Chainable {
      // Authentication commands
      login(email: string, password: string): Chainable<void>;
      logout(): Chainable<void>;
      signup(
        email: string,
        password: string,
        teamName: string
      ): Chainable<void>;

      // Team management commands
      createTeam(teamName: string): Chainable<string>;
      invitePlayer(email: string, role: string): Chainable<void>;
      joinTeam(teamId: string): Chainable<void>;

      // Play management commands
      createPlay(playData: any): Chainable<string>;
      editPlay(playId: string, updates: any): Chainable<void>;
      deletePlay(playId: string): Chainable<void>;
      duplicatePlay(playId: string): Chainable<string>;

      // Practice management commands
      createPractice(practiceData: any): Chainable<string>;
      addDrillToPractice(practiceId: string, drillData: any): Chainable<void>;
      schedulePractice(practiceId: string, date: string): Chainable<void>;

      // AI service commands
      mockAISuggestion(suggestion: any): Chainable<void>;
      mockAIAnalysis(analysis: any): Chainable<void>;
      waitForAIResponse(): Chainable<void>;

      // Offline/Online commands
      goOffline(): Chainable<void>;
      goOnline(): Chainable<void>;
      waitForSync(): Chainable<void>;
      checkOfflineQueue(): Chainable<any>;

      // Conflict resolution commands
      simulateConflict(playId: string): Chainable<void>;
      resolveConflict(strategy: string): Chainable<void>;
      checkConflictStatus(): Chainable<any>;

      // Performance commands
      measureLoadTime(): Chainable<number>;
      measureMemoryUsage(): Chainable<number>;
      measureCanvasPerformance(): Chainable<any>;

      // Visual regression commands
      compareScreenshot(name: string): Chainable<void>;
      updateBaseline(name: string): Chainable<void>;

      // Database commands
      seedTestData(): Chainable<void>;
      cleanTestData(): Chainable<void>;
      resetDatabase(): Chainable<void>;

      // Utility commands
      withRetry<T>(
        fn: () => Cypress.Chainable<T>,
        options?: any
      ): Cypress.Chainable<T>;
      waitForElement(
        selector: string,
        timeout?: number
      ): Chainable<JQuery<HTMLElement>>;
      waitForNetworkIdle(): Chainable<void>;
      scrollToElement(selector: string): Chainable<void>;
      typeWithDelay(text: string, delay?: number): Chainable<void>;
    }
  }
}

// ============================================
// RETRY UTILITY
// ============================================

Cypress.Commands.add(
  'withRetry',
  <T>(
    fn: () => Cypress.Chainable<T>,
    options = { maxAttempts: 3, delay: 1000 }
  ) => {
    const { maxAttempts, delay } = options;

    for (let i = 0; i < maxAttempts; i++) {
      try {
        return fn();
      } catch (error) {
        if (i === maxAttempts - 1) throw error;
        cy.wait(delay * Math.pow(2, i));
      }
    }

    throw new Error('Max retries reached');
  }
);

// ============================================
// AUTHENTICATION COMMANDS
// ============================================

Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/login');
  cy.get('[data-testid="email-input"]').type(email);
  cy.get('[data-testid="password-input"]').type(password);
  cy.get('[data-testid="login-button"]').click();
  cy.url().should('include', '/dashboard');
  cy.get('[data-testid="user-menu"]').should('be.visible');
});

Cypress.Commands.add('logout', () => {
  cy.get('[data-testid="user-menu"]').click();
  cy.get('[data-testid="logout-button"]').click();
  cy.url().should('include', '/login');
});

Cypress.Commands.add(
  'signup',
  (email: string, password: string, teamName: string) => {
    cy.visit('/signup');
    cy.get('[data-testid="email-input"]').type(email);
    cy.get('[data-testid="password-input"]').type(password);
    cy.get('[data-testid="confirm-password-input"]').type(password);
    cy.get('[data-testid="team-name-input"]').type(teamName);
    cy.get('[data-testid="signup-button"]').click();
    cy.url().should('include', '/verify-email');
  }
);

// ============================================
// TEAM MANAGEMENT COMMANDS
// ============================================

Cypress.Commands.add('createTeam', (teamName: string) => {
  cy.visit('/teams/create');
  cy.get('[data-testid="team-name-input"]').type(teamName);
  cy.get('[data-testid="create-team-button"]').click();
  cy.url().should('include', '/teams/');
  return cy.url().then(url => {
    const teamId = url.split('/').pop();
    return teamId;
  });
});

Cypress.Commands.add('invitePlayer', (email: string, role: string) => {
  cy.get('[data-testid="invite-player-button"]').click();
  cy.get('[data-testid="player-email-input"]').type(email);
  cy.get('[data-testid="player-role-select"]').select(role);
  cy.get('[data-testid="send-invite-button"]').click();
  cy.get('[data-testid="invite-sent-message"]').should('be.visible');
});

Cypress.Commands.add('joinTeam', (teamId: string) => {
  cy.visit(`/teams/${teamId}/join`);
  cy.get('[data-testid="join-team-button"]').click();
  cy.url().should('include', `/teams/${teamId}`);
});

// ============================================
// PLAY MANAGEMENT COMMANDS
// ============================================

Cypress.Commands.add('createPlay', (playData: any) => {
  cy.visit('/plays/create');
  cy.get('[data-testid="play-name-input"]').type(playData.name);
  cy.get('[data-testid="play-description-input"]').type(playData.description);
  cy.get('[data-testid="formation-select"]').select(playData.formation);
  cy.get('[data-testid="save-play-button"]').click();
  cy.url().should('include', '/plays/');
  return cy.url().then(url => {
    const playId = url.split('/').pop();
    return playId;
  });
});

Cypress.Commands.add('editPlay', (playId: string, updates: any) => {
  cy.visit(`/plays/${playId}/edit`);

  if (updates.name) {
    cy.get('[data-testid="play-name-input"]').clear().type(updates.name);
  }
  if (updates.description) {
    cy.get('[data-testid="play-description-input"]')
      .clear()
      .type(updates.description);
  }
  if (updates.formation) {
    cy.get('[data-testid="formation-select"]').select(updates.formation);
  }

  cy.get('[data-testid="save-play-button"]').click();
  cy.get('[data-testid="save-success-message"]').should('be.visible');
});

Cypress.Commands.add('deletePlay', (playId: string) => {
  cy.visit(`/plays/${playId}`);
  cy.get('[data-testid="delete-play-button"]').click();
  cy.get('[data-testid="confirm-delete-button"]').click();
  cy.url().should('include', '/plays');
});

Cypress.Commands.add('duplicatePlay', (playId: string) => {
  cy.visit(`/plays/${playId}`);
  cy.get('[data-testid="duplicate-play-button"]').click();
  cy.url().should('include', '/plays/');
  return cy.url().then(url => {
    const newPlayId = url.split('/').pop();
    return newPlayId;
  });
});

// ============================================
// PRACTICE MANAGEMENT COMMANDS
// ============================================

Cypress.Commands.add('createPractice', (practiceData: any) => {
  cy.visit('/practices/create');
  cy.get('[data-testid="practice-name-input"]').type(practiceData.name);
  cy.get('[data-testid="practice-date-input"]').type(practiceData.date);
  cy.get('[data-testid="practice-duration-input"]').type(practiceData.duration);
  cy.get('[data-testid="save-practice-button"]').click();
  cy.url().should('include', '/practices/');
  return cy.url().then(url => {
    const practiceId = url.split('/').pop();
    return practiceId;
  });
});

Cypress.Commands.add(
  'addDrillToPractice',
  (practiceId: string, drillData: any) => {
    cy.visit(`/practices/${practiceId}/drills`);
    cy.get('[data-testid="add-drill-button"]').click();
    cy.get('[data-testid="drill-name-input"]').type(drillData.name);
    cy.get('[data-testid="drill-duration-input"]').type(drillData.duration);
    cy.get('[data-testid="save-drill-button"]').click();
    cy.get('[data-testid="drill-added-message"]').should('be.visible');
  }
);

Cypress.Commands.add('schedulePractice', (practiceId: string, date: string) => {
  cy.visit(`/practices/${practiceId}/schedule`);
  cy.get('[data-testid="practice-date-input"]').clear().type(date);
  cy.get('[data-testid="schedule-practice-button"]').click();
  cy.get('[data-testid="practice-scheduled-message"]').should('be.visible');
});

// ============================================
// AI SERVICE COMMANDS
// ============================================

Cypress.Commands.add('mockAISuggestion', (suggestion: any) => {
  cy.task('ai:mock', {
    type: 'suggestion',
    response: suggestion,
  });
});

Cypress.Commands.add('mockAIAnalysis', (analysis: any) => {
  cy.task('ai:mock', {
    type: 'analysis',
    response: analysis,
  });
});

Cypress.Commands.add('waitForAIResponse', () => {
  cy.get('[data-testid="ai-loading"]').should('not.exist');
  cy.get('[data-testid="ai-response"]').should('be.visible');
});

// ============================================
// OFFLINE/ONLINE COMMANDS
// ============================================

Cypress.Commands.add('goOffline', () => {
  cy.task('network:offline');
  cy.get('[data-testid="offline-indicator"]').should('be.visible');
});

Cypress.Commands.add('goOnline', () => {
  cy.task('network:online');
  cy.get('[data-testid="online-indicator"]').should('be.visible');
});

Cypress.Commands.add('waitForSync', () => {
  cy.get('[data-testid="sync-status"]').should('contain', 'Synced');
});

Cypress.Commands.add('checkOfflineQueue', () => {
  cy.get('[data-testid="offline-queue-count"]').then($el => {
    return parseInt($el.text());
  });
});

// ============================================
// CONFLICT RESOLUTION COMMANDS
// ============================================

Cypress.Commands.add('simulateConflict', (playId: string) => {
  // Open play in two different sessions
  cy.window().then(win => {
    win.localStorage.setItem('simulate-conflict', 'true');
  });
  cy.visit(`/plays/${playId}/edit`);
});

Cypress.Commands.add('resolveConflict', (strategy: string) => {
  cy.get('[data-testid="conflict-resolution-dialog"]').should('be.visible');
  cy.get(`[data-testid="resolve-${strategy}-button"]`).click();
  cy.get('[data-testid="conflict-resolved-message"]').should('be.visible');
});

Cypress.Commands.add('checkConflictStatus', () => {
  return cy.get('[data-testid="conflict-status"]').invoke('text');
});

// ============================================
// PERFORMANCE COMMANDS
// ============================================

Cypress.Commands.add('measureLoadTime', () => {
  const startTime = performance.now();
  cy.window().then(win => {
    win.addEventListener('load', () => {
      const loadTime = performance.now() - startTime;
      return loadTime;
    });
  });
});

Cypress.Commands.add('measureMemoryUsage', () => {
  return cy.window().then(win => {
    if ('memory' in win.performance) {
      return win.performance.memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    return 0;
  });
});

Cypress.Commands.add('measureCanvasPerformance', () => {
  return cy.window().then(win => {
    const canvas = win.document.querySelector('[data-testid="play-canvas"]');
    if (canvas) {
      const startTime = performance.now();
      // Trigger canvas render
      canvas.dispatchEvent(new Event('render'));
      const renderTime = performance.now() - startTime;
      return { renderTime, canvasSize: canvas.width * canvas.height };
    }
    return { renderTime: 0, canvasSize: 0 };
  });
});

// ============================================
// VISUAL REGRESSION COMMANDS
// ============================================

Cypress.Commands.add('compareScreenshot', (name: string) => {
  cy.screenshot(name);
  cy.task('visual:compare', name);
});

Cypress.Commands.add('updateBaseline', (name: string) => {
  cy.task('visual:update', name);
});

// ============================================
// DATABASE COMMANDS
// ============================================

Cypress.Commands.add('seedTestData', () => {
  cy.task('db:seed');
});

Cypress.Commands.add('cleanTestData', () => {
  cy.task('db:clean');
});

Cypress.Commands.add('resetDatabase', () => {
  cy.task('db:reset');
});

// ============================================
// UTILITY COMMANDS
// ============================================

Cypress.Commands.add('waitForElement', (selector: string, timeout = 10000) => {
  return cy.get(selector, { timeout });
});

Cypress.Commands.add('waitForNetworkIdle', () => {
  cy.intercept('**/*').as('networkRequest');
  cy.wait('@networkRequest', { timeout: 5000 });
});

Cypress.Commands.add('scrollToElement', (selector: string) => {
  cy.get(selector).scrollIntoView();
});

Cypress.Commands.add('typeWithDelay', (text: string, delay = 100) => {
  cy.get('input').type(text, { delay });
});

// ============================================
// BEFORE EACH HOOK
// ============================================

beforeEach(() => {
  // Reset AI mocks
  cy.task('ai:reset');

  // Reset network to online
  cy.task('network:online');

  // Clear local storage
  cy.clearLocalStorage();

  // Clear cookies
  cy.clearCookies();
});

// ============================================
// AFTER EACH HOOK
// ============================================

afterEach(() => {
  // Clean up test data
  cy.task('db:clean');

  // Reset AI mocks
  cy.task('ai:reset');

  // Reset network
  cy.task('network:online');
});
