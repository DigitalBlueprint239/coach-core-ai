// cypress/e2e/play-creation-conflict.cy.ts

import { UserFactory } from '../factories/UserFactory';
import { TeamFactory } from '../factories/TeamFactory';
import { PlayFactory } from '../factories/PlayFactory';

describe('Play Creation with Conflict Resolution', () => {
  const coach1 = UserFactory.createCoach({ email: 'coach1@coachcore.ai' });
  const coach2 = UserFactory.createCoach({ email: 'coach2@coachcore.ai' });
  const testTeam = TeamFactory.create({ name: 'Conflict Test Team' });

  beforeEach(() => {
    cy.resetDatabase();
    cy.seedTestData();
  });

  it('should handle concurrent play editing with conflict detection', () => {
    // Setup: Both coaches join the same team
    cy.login(coach1.email, coach1.password);
    cy.createTeam(testTeam.name);
    const teamId = cy.url().then(url => url.split('/').pop());

    cy.logout();
    cy.login(coach2.email, coach2.password);
    cy.joinTeam(teamId);

    // Create a play that both coaches will edit
    const testPlay = PlayFactory.create({
      name: 'Conflict Test Play',
      description: 'Initial description',
      teamId
    });

    cy.createPlay(testPlay);
    const playId = cy.url().then(url => url.split('/').pop());

    // Coach 1 starts editing
    cy.login(coach1.email, coach1.password);
    cy.visit(`/plays/${playId}/edit`);
    cy.get('[data-testid="play-description-input"]').clear().type('Coach 1 updated description');
    
    // Coach 2 starts editing simultaneously (simulate concurrent access)
    cy.window().then(win => {
      // Simulate another session editing the same play
      win.localStorage.setItem('simulate-concurrent-edit', 'true');
    });

    // Coach 1 tries to save
    cy.get('[data-testid="save-play-button"]').click();

    // Should detect conflict
    cy.get('[data-testid="conflict-detected-message"]').should('be.visible');
    cy.get('[data-testid="conflict-resolution-dialog"]').should('be.visible');

    // Verify conflict details
    cy.get('[data-testid="server-version"]').should('contain', '2');
    cy.get('[data-testid="client-version"]').should('contain', '1');
    cy.get('[data-testid="conflict-details"]').should('contain', 'Coach 2 updated description');
  });

  it('should resolve conflicts using different strategies', () => {
    cy.login(coach1.email, coach1.password);
    cy.createTeam(testTeam.name);
    const teamId = cy.url().then(url => url.split('/').pop());

    const testPlay = PlayFactory.create({ teamId });
    cy.createPlay(testPlay);
    const playId = cy.url().then(url => url.split('/').pop());

    // Simulate conflict
    cy.simulateConflict(playId);

    // Test Server Wins strategy
    cy.get('[data-testid="resolve-server-wins-button"]').click();
    cy.get('[data-testid="conflict-resolved-message"]').should('be.visible');
    cy.get('[data-testid="play-description-input"]').should('contain', 'Server version');

    // Verify version was updated
    cy.get('[data-testid="play-version"]').should('contain', '3');
  });

  it('should resolve conflicts using Client Wins strategy', () => {
    cy.login(coach1.email, coach1.password);
    cy.createTeam(testTeam.name);
    const teamId = cy.url().then(url => url.split('/').pop());

    const testPlay = PlayFactory.create({ teamId });
    cy.createPlay(testPlay);
    const playId = cy.url().then(url => url.split('/').pop());

    // Simulate conflict
    cy.simulateConflict(playId);

    // Test Client Wins strategy
    cy.get('[data-testid="resolve-client-wins-button"]').click();
    cy.get('[data-testid="conflict-resolved-message"]').should('be.visible');
    cy.get('[data-testid="play-description-input"]').should('contain', 'Client version');

    // Verify version was updated
    cy.get('[data-testid="play-version"]').should('contain', '3');
  });

  it('should resolve conflicts using Merge strategy', () => {
    cy.login(coach1.email, coach1.password);
    cy.createTeam(testTeam.name);
    const teamId = cy.url().then(url => url.split('/').pop());

    const testPlay = PlayFactory.create({ teamId });
    cy.createPlay(testPlay);
    const playId = cy.url().then(url => url.split('/').pop());

    // Simulate conflict
    cy.simulateConflict(playId);

    // Test Merge strategy
    cy.get('[data-testid="resolve-merge-button"]').click();
    cy.get('[data-testid="merge-editor"]').should('be.visible');

    // Edit merged content
    cy.get('[data-testid="merged-description-input"]').clear().type('Merged description from both versions');
    cy.get('[data-testid="save-merge-button"]').click();

    cy.get('[data-testid="conflict-resolved-message"]').should('be.visible');
    cy.get('[data-testid="play-description-input"]').should('contain', 'Merged description');
  });

  it('should handle offline editing and sync conflicts', () => {
    cy.login(coach1.email, coach1.password);
    cy.createTeam(testTeam.name);
    const teamId = cy.url().then(url => url.split('/').pop());

    const testPlay = PlayFactory.create({ teamId });
    cy.createPlay(testPlay);
    const playId = cy.url().then(url => url.split('/').pop());

    // Go offline
    cy.goOffline();
    cy.get('[data-testid="offline-indicator"]').should('be.visible');

    // Edit play while offline
    cy.visit(`/plays/${playId}/edit`);
    cy.get('[data-testid="play-description-input"]').clear().type('Offline edit - will conflict');
    cy.get('[data-testid="save-play-button"]').click();

    // Should be queued for offline sync
    cy.get('[data-testid="offline-queue-count"]').should('contain', '1');

    // Go online and trigger sync
    cy.goOnline();
    cy.get('[data-testid="online-indicator"]').should('be.visible');

    // Wait for sync to process
    cy.waitForSync();

    // Should detect conflict during sync
    cy.get('[data-testid="conflict-detected-message"]').should('be.visible');
    cy.get('[data-testid="conflict-resolution-dialog"]').should('be.visible');

    // Resolve conflict
    cy.get('[data-testid="resolve-server-wins-button"]').click();
    cy.get('[data-testid="conflict-resolved-message"]').should('be.visible');
  });

  it('should handle multiple concurrent conflicts', () => {
    cy.login(coach1.email, coach1.password);
    cy.createTeam(testTeam.name);
    const teamId = cy.url().then(url => url.split('/').pop());

    const testPlay = PlayFactory.create({ teamId });
    cy.createPlay(testPlay);
    const playId = cy.url().then(url => url.split('/').pop());

    // Simulate multiple conflicts
    cy.window().then(win => {
      win.localStorage.setItem('simulate-multiple-conflicts', 'true');
    });

    cy.visit(`/plays/${playId}/edit`);
    cy.get('[data-testid="play-description-input"]').clear().type('Multiple conflict test');
    cy.get('[data-testid="save-play-button"]').click();

    // Should show multiple conflict options
    cy.get('[data-testid="conflict-list"]').should('be.visible');
    cy.get('[data-testid="conflict-item"]').should('have.length.greaterThan', 1);

    // Resolve each conflict
    cy.get('[data-testid="resolve-all-conflicts-button"]').click();
    cy.get('[data-testid="all-conflicts-resolved-message"]').should('be.visible');
  });

  it('should handle optimistic locking failures gracefully', () => {
    cy.login(coach1.email, coach1.password);
    cy.createTeam(testTeam.name);
    const teamId = cy.url().then(url => url.split('/').pop());

    const testPlay = PlayFactory.create({ teamId });
    cy.createPlay(testPlay);
    const playId = cy.url().then(url => url.split('/').pop());

    // Simulate optimistic locking failure
    cy.intercept('PUT', `/api/plays/${playId}`, {
      statusCode: 409,
      body: { error: 'Version conflict detected' }
    }).as('versionConflict');

    cy.visit(`/plays/${playId}/edit`);
    cy.get('[data-testid="play-description-input"]').clear().type('Optimistic locking test');
    cy.get('[data-testid="save-play-button"]').click();

    cy.wait('@versionConflict');
    cy.get('[data-testid="version-conflict-error"]').should('be.visible');
    cy.get('[data-testid="reload-latest-button"]').click();

    // Should reload latest version
    cy.get('[data-testid="play-description-input"]').should('not.contain', 'Optimistic locking test');
  });

  it('should provide conflict resolution history', () => {
    cy.login(coach1.email, coach1.password);
    cy.createTeam(testTeam.name);
    const teamId = cy.url().then(url => url.split('/').pop());

    const testPlay = PlayFactory.create({ teamId });
    cy.createPlay(testPlay);
    const playId = cy.url().then(url => url.split('/').pop());

    // Create multiple conflicts and resolve them
    for (let i = 0; i < 3; i++) {
      cy.simulateConflict(playId);
      cy.get(`[data-testid="resolve-server-wins-button"]`).click();
      cy.get('[data-testid="conflict-resolved-message"]').should('be.visible');
    }

    // Check conflict history
    cy.visit(`/plays/${playId}/history`);
    cy.get('[data-testid="conflict-history"]').should('be.visible');
    cy.get('[data-testid="conflict-history-item"]').should('have.length', 3);

    // Verify conflict details in history
    cy.get('[data-testid="conflict-history-item"]').first().within(() => {
      cy.get('[data-testid="conflict-resolution-strategy"]').should('contain', 'Server Wins');
      cy.get('[data-testid="conflict-resolved-by"]').should('contain', coach1.firstName);
      cy.get('[data-testid="conflict-timestamp"]').should('be.visible');
    });
  });

  it('should handle canvas position conflicts', () => {
    cy.login(coach1.email, coach1.password);
    cy.createTeam(testTeam.name);
    const teamId = cy.url().then(url => url.split('/').pop());

    const testPlay = PlayFactory.createComplex({ teamId });
    cy.createPlay(testPlay);
    const playId = cy.url().then(url => url.split('/').pop());

    // Edit player positions on canvas
    cy.visit(`/plays/${playId}/edit`);
    cy.get('[data-testid="play-canvas"]').should('be.visible');

    // Move a player position
    cy.get('[data-testid="player-position"]').first().trigger('mousedown');
    cy.get('[data-testid="play-canvas"]').trigger('mousemove', { clientX: 100, clientY: 100 });
    cy.get('[data-testid="play-canvas"]').trigger('mouseup');

    // Simulate conflict with position changes
    cy.window().then(win => {
      win.localStorage.setItem('simulate-position-conflict', 'true');
    });

    cy.get('[data-testid="save-play-button"]').click();

    // Should show position conflict resolution
    cy.get('[data-testid="position-conflict-dialog"]').should('be.visible');
    cy.get('[data-testid="position-diff-view"]').should('be.visible');

    // Resolve position conflict
    cy.get('[data-testid="resolve-position-conflict-button"]').click();
    cy.get('[data-testid="position-conflict-resolved"]').should('be.visible');
  });

  it('should handle route conflicts in plays', () => {
    cy.login(coach1.email, coach1.password);
    cy.createTeam(testTeam.name);
    const teamId = cy.url().then(url => url.split('/').pop());

    const testPlay = PlayFactory.createComplex({ teamId });
    cy.createPlay(testPlay);
    const playId = cy.url().then(url => url.split('/').pop());

    // Edit routes on canvas
    cy.visit(`/plays/${playId}/edit`);
    cy.get('[data-testid="route-editor"]').should('be.visible');

    // Modify a route
    cy.get('[data-testid="route-point"]').first().trigger('mousedown');
    cy.get('[data-testid="play-canvas"]').trigger('mousemove', { clientX: 150, clientY: 150 });
    cy.get('[data-testid="play-canvas"]').trigger('mouseup');

    // Simulate route conflict
    cy.window().then(win => {
      win.localStorage.setItem('simulate-route-conflict', 'true');
    });

    cy.get('[data-testid="save-play-button"]').click();

    // Should show route conflict resolution
    cy.get('[data-testid="route-conflict-dialog"]').should('be.visible');
    cy.get('[data-testid="route-diff-view"]').should('be.visible');

    // Resolve route conflict
    cy.get('[data-testid="resolve-route-conflict-button"]').click();
    cy.get('[data-testid="route-conflict-resolved"]').should('be.visible');
  });

  it('should provide conflict resolution analytics', () => {
    cy.login(coach1.email, coach1.password);
    cy.createTeam(testTeam.name);
    const teamId = cy.url().then(url => url.split('/').pop());

    // Create multiple plays with conflicts
    for (let i = 0; i < 5; i++) {
      const testPlay = PlayFactory.create({ teamId });
      cy.createPlay(testPlay);
      const playId = cy.url().then(url => url.split('/').pop());
      
      cy.simulateConflict(playId);
      cy.get('[data-testid="resolve-server-wins-button"]').click();
      cy.get('[data-testid="conflict-resolved-message"]').should('be.visible');
    }

    // Check conflict analytics
    cy.visit('/analytics/conflicts');
    cy.get('[data-testid="conflict-analytics"]').should('be.visible');
    
    // Verify analytics data
    cy.get('[data-testid="total-conflicts"]').should('contain', '5');
    cy.get('[data-testid="conflict-resolution-rate"]').should('contain', '100%');
    cy.get('[data-testid="most-used-strategy"]').should('contain', 'Server Wins');
    cy.get('[data-testid="conflict-trend-chart"]').should('be.visible');
  });
}); 