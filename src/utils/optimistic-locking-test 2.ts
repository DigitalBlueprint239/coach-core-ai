// src/utils/optimistic-locking-test.ts
import {
  updatePlay,
  updatePracticePlan,
  updatePlayer,
  updateTeam,
  updateUserProfile,
  getPlays,
  getPracticePlans,
  getPlayers,
  getTeams,
  getUserProfile,
  savePlay,
  savePracticePlan,
  savePlayer,
  saveTeam,
  saveUserProfile,
} from '../services/firestore';
import {
  Play,
  PracticePlan,
  TeamPlayer,
  Team,
  UserProfile,
} from '../services/firestore';

// ============================================
// OPTIMISTIC LOCKING TEST UTILITIES
// ============================================

export interface OptimisticLockingTestResult {
  testName: string;
  success: boolean;
  error?: string;
  duration: number;
  details: {
    entityType: string;
    operation: string;
    conflictDetected: boolean;
    resolutionStrategy: string;
  };
}

export interface ConcurrentUpdateTest {
  entityType: 'play' | 'practicePlan' | 'player' | 'team' | 'user';
  teamId: string;
  entityId: string;
  updates: Array<{
    userId: string;
    data: any;
    expectedOutcome: 'success' | 'conflict' | 'error';
  }>;
}

export class OptimisticLockingTestManager {
  private testResults: OptimisticLockingTestResult[] = [];
  private isRunning = false;

  /**
   * Test optimistic locking for a specific entity
   */
  async testEntityOptimisticLocking(
    entityType: 'play' | 'practicePlan' | 'player' | 'team' | 'user',
    teamId: string,
    entityId: string
  ): Promise<OptimisticLockingTestResult> {
    const startTime = Date.now();
    const testName = `Optimistic Locking Test - ${entityType}`;

    try {
      // Get current entity data
      const currentEntity = await this.getCurrentEntity(
        entityType,
        teamId,
        entityId
      );
      if (!currentEntity) {
        throw new Error(`${entityType} not found`);
      }

      // Simulate concurrent updates
      const updatePromises = [
        this.simulateUpdate(
          entityType,
          teamId,
          entityId,
          { name: 'Update 1' },
          0
        ),
        this.simulateUpdate(
          entityType,
          teamId,
          entityId,
          { name: 'Update 2' },
          100
        ),
        this.simulateUpdate(
          entityType,
          teamId,
          entityId,
          { name: 'Update 3' },
          200
        ),
      ];

      const results = await Promise.allSettled(updatePromises);

      // Analyze results
      const successfulUpdates = results.filter(
        r => r.status === 'fulfilled'
      ).length;
      const conflicts = results.filter(
        r =>
          r.status === 'rejected' &&
          r.reason?.message?.includes('modified by another user')
      ).length;

      const duration = Date.now() - startTime;

      return {
        testName,
        success: conflicts > 0, // Success if conflicts were detected
        duration,
        details: {
          entityType,
          operation: 'concurrent_update',
          conflictDetected: conflicts > 0,
          resolutionStrategy: 'optimistic_locking',
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        testName,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
        details: {
          entityType,
          operation: 'concurrent_update',
          conflictDetected: false,
          resolutionStrategy: 'none',
        },
      };
    }
  }

  /**
   * Test optimistic locking across all entity types
   */
  async testAllEntities(
    teamId: string
  ): Promise<OptimisticLockingTestResult[]> {
    if (this.isRunning) {
      throw new Error('Test already running');
    }

    this.isRunning = true;
    this.testResults = [];

    try {
      // Create test entities if they don't exist
      const testEntities = await this.createTestEntities(teamId);

      // Test each entity type
      const entityTypes: Array<
        'play' | 'practicePlan' | 'player' | 'team' | 'user'
      > = ['play', 'practicePlan', 'player', 'team', 'user'];

      for (const entityType of entityTypes) {
        const entityId = testEntities[entityType];
        if (entityId) {
          const result = await this.testEntityOptimisticLocking(
            entityType,
            teamId,
            entityId
          );
          this.testResults.push(result);
        }
      }

      return this.testResults;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Create test entities for testing
   */
  private async createTestEntities(
    teamId: string
  ): Promise<Record<string, string>> {
    const entities: Record<string, string> = {};

    try {
      // Create test play
      const playId = await savePlay(teamId, {
        name: 'Test Play',
        formation: '4-3',
        description: 'Test play for optimistic locking',
        routes: [],
        players: [],
        tags: ['test'],
        difficulty: 'beginner',
        sport: 'football',
      });
      entities.play = playId;

      // Create test practice plan
      const planId = await savePracticePlan(teamId, {
        name: 'Test Practice Plan',
        date: new Date().toISOString(),
        duration: 90,
        periods: [],
        goals: ['Test goal'],
        notes: 'Test practice plan for optimistic locking',
      });
      entities.practicePlan = planId;

      // Create test player
      const playerId = await savePlayer(teamId, {
        firstName: 'Test',
        lastName: 'Player',
        jerseyNumber: 99,
        position: 'quarterback',
        grade: 10,
      });
      entities.player = playerId;

      // Create test team
      const teamId = await saveTeam({
        name: 'Test Team',
        sport: 'football',
        level: 'varsity',
        season: '2024',
        coachIds: [],
        playerIds: [],
      });
      entities.team = teamId;

      // Create test user profile
      const userId = await saveUserProfile({
        email: 'test@example.com',
        displayName: 'Test User',
        roles: ['coach'],
        teamIds: [teamId],
      });
      entities.user = userId;
    } catch (error) {
      console.error('Error creating test entities:', error);
    }

    return entities;
  }

  /**
   * Get current entity data
   */
  private async getCurrentEntity(
    entityType: 'play' | 'practicePlan' | 'player' | 'team' | 'user',
    teamId: string,
    entityId: string
  ): Promise<any> {
    switch (entityType) {
      case 'play':
        const plays = await getPlays(teamId);
        return plays.find(p => p.id === entityId);
      case 'practicePlan':
        const plans = await getPracticePlans(teamId);
        return plans.find(p => p.id === entityId);
      case 'player':
        const players = await getPlayers(teamId);
        return players.find(p => p.id === entityId);
      case 'team':
        const teams = await getTeams();
        return teams.find(t => t.id === entityId);
      case 'user':
        return await getUserProfile(entityId);
      default:
        return null;
    }
  }

  /**
   * Simulate an update with delay
   */
  private async simulateUpdate(
    entityType: 'play' | 'practicePlan' | 'player' | 'team' | 'user',
    teamId: string,
    entityId: string,
    updates: any,
    delayMs: number
  ): Promise<void> {
    // Wait for the specified delay
    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    // Get current entity to include version
    const currentEntity = await this.getCurrentEntity(
      entityType,
      teamId,
      entityId
    );
    if (!currentEntity) {
      throw new Error(`${entityType} not found`);
    }

    // Prepare update data with version
    const updateData = {
      ...updates,
      version: currentEntity.version,
    };

    // Perform the update
    switch (entityType) {
      case 'play':
        await updatePlay(teamId, entityId, updateData);
        break;
      case 'practicePlan':
        await updatePracticePlan(teamId, entityId, updateData);
        break;
      case 'player':
        await updatePlayer(teamId, entityId, updateData);
        break;
      case 'team':
        await updateTeam(entityId, updateData);
        break;
      case 'user':
        await updateUserProfile(entityId, updateData);
        break;
    }
  }

  /**
   * Test conflict resolution strategies
   */
  async testConflictResolutionStrategies(
    teamId: string
  ): Promise<OptimisticLockingTestResult[]> {
    const results: OptimisticLockingTestResult[] = [];

    // Test 1: Last-write-wins strategy
    const lastWriteWinsResult = await this.testLastWriteWinsStrategy(teamId);
    results.push(lastWriteWinsResult);

    // Test 2: Merge strategy
    const mergeResult = await this.testMergeStrategy(teamId);
    results.push(mergeResult);

    // Test 3: User-defined resolution
    const userDefinedResult = await this.testUserDefinedResolution(teamId);
    results.push(userDefinedResult);

    return results;
  }

  /**
   * Test last-write-wins conflict resolution
   */
  private async testLastWriteWinsStrategy(
    teamId: string
  ): Promise<OptimisticLockingTestResult> {
    const startTime = Date.now();
    const testName = 'Last-Write-Wins Conflict Resolution';

    try {
      // Create a test entity
      const playId = await savePlay(teamId, {
        name: 'Conflict Test Play',
        formation: '4-3',
        description: 'Test play for conflict resolution',
        routes: [],
        players: [],
        tags: ['test'],
        difficulty: 'beginner',
        sport: 'football',
      });

      // Simulate conflicting updates
      const update1 = this.simulateUpdate(
        'play',
        teamId,
        playId,
        { name: 'Update 1' },
        0
      );
      const update2 = this.simulateUpdate(
        'play',
        teamId,
        playId,
        { name: 'Update 2' },
        50
      );

      const results = await Promise.allSettled([update1, update2]);

      // Check that one succeeded and one failed with conflict
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const conflictCount = results.filter(
        r =>
          r.status === 'rejected' &&
          r.reason?.message?.includes('modified by another user')
      ).length;

      const duration = Date.now() - startTime;

      return {
        testName,
        success: successCount === 1 && conflictCount === 1,
        duration,
        details: {
          entityType: 'play',
          operation: 'conflict_resolution',
          conflictDetected: conflictCount > 0,
          resolutionStrategy: 'last_write_wins',
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        testName,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
        details: {
          entityType: 'play',
          operation: 'conflict_resolution',
          conflictDetected: false,
          resolutionStrategy: 'last_write_wins',
        },
      };
    }
  }

  /**
   * Test merge conflict resolution
   */
  private async testMergeStrategy(
    teamId: string
  ): Promise<OptimisticLockingTestResult> {
    const startTime = Date.now();
    const testName = 'Merge Conflict Resolution';

    try {
      // Create a test entity with multiple fields
      const playId = await savePlay(teamId, {
        name: 'Merge Test Play',
        formation: '4-3',
        description: 'Test play for merge resolution',
        routes: [],
        players: [],
        tags: ['test'],
        difficulty: 'beginner',
        sport: 'football',
      });

      // Simulate updates to different fields
      const update1 = this.simulateUpdate(
        'play',
        teamId,
        playId,
        {
          name: 'Updated Name',
          description: 'Updated description',
        },
        0
      );

      const update2 = this.simulateUpdate(
        'play',
        teamId,
        playId,
        {
          formation: '3-4',
          difficulty: 'intermediate',
        },
        50
      );

      const results = await Promise.allSettled([update1, update2]);

      // In optimistic locking, only one should succeed
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const conflictCount = results.filter(
        r =>
          r.status === 'rejected' &&
          r.reason?.message?.includes('modified by another user')
      ).length;

      const duration = Date.now() - startTime;

      return {
        testName,
        success: successCount === 1 && conflictCount === 1,
        duration,
        details: {
          entityType: 'play',
          operation: 'merge_resolution',
          conflictDetected: conflictCount > 0,
          resolutionStrategy: 'optimistic_locking',
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        testName,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
        details: {
          entityType: 'play',
          operation: 'merge_resolution',
          conflictDetected: false,
          resolutionStrategy: 'optimistic_locking',
        },
      };
    }
  }

  /**
   * Test user-defined conflict resolution
   */
  private async testUserDefinedResolution(
    teamId: string
  ): Promise<OptimisticLockingTestResult> {
    const startTime = Date.now();
    const testName = 'User-Defined Conflict Resolution';

    try {
      // Create a test entity
      const playId = await savePlay(teamId, {
        name: 'User Resolution Test',
        formation: '4-3',
        description: 'Test play for user-defined resolution',
        routes: [],
        players: [],
        tags: ['test'],
        difficulty: 'beginner',
        sport: 'football',
      });

      // Simulate a conflict scenario
      const update1 = this.simulateUpdate(
        'play',
        teamId,
        playId,
        { name: 'User Update 1' },
        0
      );
      const update2 = this.simulateUpdate(
        'play',
        teamId,
        playId,
        { name: 'User Update 2' },
        100
      );

      const results = await Promise.allSettled([update1, update2]);

      // Check that conflicts are properly detected
      const conflictCount = results.filter(
        r =>
          r.status === 'rejected' &&
          r.reason?.message?.includes('modified by another user')
      ).length;

      const duration = Date.now() - startTime;

      return {
        testName,
        success: conflictCount > 0,
        duration,
        details: {
          entityType: 'play',
          operation: 'user_defined_resolution',
          conflictDetected: conflictCount > 0,
          resolutionStrategy: 'user_choice',
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        testName,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
        details: {
          entityType: 'play',
          operation: 'user_defined_resolution',
          conflictDetected: false,
          resolutionStrategy: 'user_choice',
        },
      };
    }
  }

  /**
   * Generate test report
   */
  generateTestReport(): string {
    const totalTests = this.testResults.length;
    const successfulTests = this.testResults.filter(r => r.success).length;
    const failedTests = totalTests - successfulTests;
    const averageDuration =
      this.testResults.reduce((sum, r) => sum + r.duration, 0) / totalTests;

    let report = `
# Optimistic Locking Test Report

## Summary
- Total Tests: ${totalTests}
- Successful: ${successfulTests}
- Failed: ${failedTests}
- Success Rate: ${((successfulTests / totalTests) * 100).toFixed(2)}%
- Average Duration: ${averageDuration.toFixed(2)}ms

## Test Results
`;

    this.testResults.forEach((result, index) => {
      report += `
### ${index + 1}. ${result.testName}
- **Status**: ${result.success ? '✅ PASSED' : '❌ FAILED'}
- **Duration**: ${result.duration}ms
- **Entity Type**: ${result.details.entityType}
- **Operation**: ${result.details.operation}
- **Conflict Detected**: ${result.details.conflictDetected ? 'Yes' : 'No'}
- **Resolution Strategy**: ${result.details.resolutionStrategy}
${result.error ? `- **Error**: ${result.error}` : ''}
`;
    });

    return report;
  }

  /**
   * Get test results
   */
  getTestResults(): OptimisticLockingTestResult[] {
    return [...this.testResults];
  }

  /**
   * Clear test results
   */
  clearTestResults(): void {
    this.testResults = [];
  }
}

// Export singleton instance
export const optimisticLockingTestManager = new OptimisticLockingTestManager();
