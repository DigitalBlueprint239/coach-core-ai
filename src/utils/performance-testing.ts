// src/utils/performance-testing.ts
import { 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  collection,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  runTransaction,
  Timestamp,
  serverTimestamp,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../services/firebase';

// ============================================
// PERFORMANCE TESTING TYPES
// ============================================

export interface PerformanceTest {
  id: string;
  name: string;
  description: string;
  type: 'load' | 'stress' | 'endurance' | 'spike' | 'scalability';
  config: TestConfig;
  scenarios: TestScenario[];
  expectedResults: ExpectedResults;
}

export interface TestConfig {
  duration: number; // milliseconds
  concurrentUsers: number;
  rampUpTime: number; // milliseconds
  rampDownTime: number; // milliseconds
  targetRPS: number; // requests per second
  maxResponseTime: number; // milliseconds
  errorThreshold: number; // percentage
}

export interface TestScenario {
  id: string;
  name: string;
  weight: number; // percentage of total requests
  operations: TestOperation[];
  thinkTime: number; // milliseconds between operations
}

export interface TestOperation {
  type: 'read' | 'write' | 'update' | 'delete' | 'query' | 'custom';
  collection: string;
  documentId?: string;
  data?: any;
  filters?: Record<string, any>;
  customFn?: () => Promise<any>;
}

export interface ExpectedResults {
  maxResponseTime: number;
  minThroughput: number; // requests per second
  maxErrorRate: number; // percentage
  maxMemoryUsage: number; // MB
  maxCPUUsage: number; // percentage
}

export interface TestResult {
  testId: string;
  startTime: number;
  endTime: number;
  duration: number;
  summary: TestSummary;
  metrics: PerformanceMetrics[];
  errors: TestError[];
  recommendations: TestRecommendation[];
}

export interface TestSummary {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughput: number; // requests per second
  errorRate: number; // percentage
  concurrentUsers: number;
  peakMemoryUsage: number;
  peakCPUUsage: number;
}

export interface PerformanceMetrics {
  timestamp: number;
  responseTime: number;
  success: boolean;
  error?: string;
  operationType: string;
  userId: string;
  memoryUsage: number;
  cpuUsage: number;
}

export interface TestError {
  type: 'timeout' | 'connection' | 'validation' | 'server' | 'other';
  message: string;
  count: number;
  percentage: number;
  timestamp: number;
}

export interface TestRecommendation {
  type: 'optimization' | 'scaling' | 'caching' | 'database' | 'network';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  priority: number;
}

// ============================================
// PERFORMANCE TESTING MANAGER
// ============================================

export class PerformanceTestingManager {
  private activeTests: Map<string, TestResult> = new Map();
  private virtualUsers: Map<string, VirtualUser> = new Map();
  private testData: Map<string, any> = new Map();
  private metricsCollector: MetricsCollector;

  constructor() {
    this.metricsCollector = new MetricsCollector();
  }

  // ============================================
  // TEST EXECUTION
  // ============================================

  async runPerformanceTest(test: PerformanceTest): Promise<TestResult> {
    console.log(`Starting performance test: ${test.name}`);
    
    const result: TestResult = {
      testId: test.id,
      startTime: Date.now(),
      endTime: 0,
      duration: 0,
      summary: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        minResponseTime: Infinity,
        maxResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        throughput: 0,
        errorRate: 0,
        concurrentUsers: test.config.concurrentUsers,
        peakMemoryUsage: 0,
        peakCPUUsage: 0
      },
      metrics: [],
      errors: [],
      recommendations: []
    };

    this.activeTests.set(test.id, result);

    try {
      // Initialize test data
      await this.initializeTestData(test);
      
      // Start metrics collection
      this.metricsCollector.startCollection();
      
      // Execute test scenarios
      await this.executeTestScenarios(test, result);
      
      // Calculate results
      this.calculateTestResults(result);
      
      // Generate recommendations
      result.recommendations = this.generateRecommendations(result, test);
      
    } catch (error) {
      console.error('Error during performance test:', error);
      result.errors.push({
        type: 'other',
        message: error instanceof Error ? error.message : 'Unknown error',
        count: 1,
        percentage: 100,
        timestamp: Date.now()
      });
    } finally {
      result.endTime = Date.now();
      result.duration = result.endTime - result.startTime;
      this.metricsCollector.stopCollection();
      this.activeTests.delete(test.id);
    }

    return result;
  }

  // ============================================
  // TEST DATA INITIALIZATION
  // ============================================

  private async initializeTestData(test: PerformanceTest): Promise<void> {
    console.log('Initializing test data...');
    
    // Create test users
    const users = await this.createTestUsers(test.config.concurrentUsers);
    this.testData.set('users', users);
    
    // Create test teams
    const teams = await this.createTestTeams(Math.ceil(test.config.concurrentUsers / 10));
    this.testData.set('teams', teams);
    
    // Create test players
    const players = await this.createTestPlayers(teams.length * 15);
    this.testData.set('players', players);
    
    // Create test practice plans
    const plans = await this.createTestPracticePlans(teams.length * 5);
    this.testData.set('practicePlans', plans);
    
    // Create test plays
    const plays = await this.createTestPlays(teams.length * 10);
    this.testData.set('plays', plays);
    
    console.log('Test data initialization completed');
  }

  private async createTestUsers(count: number): Promise<any[]> {
    const users = [];
    const batch = writeBatch(db);
    
    for (let i = 0; i < count; i++) {
      const user = {
        id: `test_user_${i}`,
        email: `test${i}@example.com`,
        displayName: `Test User ${i}`,
        roles: ['player'],
        teamIds: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const userRef = doc(db, 'users', user.id);
      batch.set(userRef, user);
      users.push(user);
    }
    
    await batch.commit();
    return users;
  }

  private async createTestTeams(count: number): Promise<any[]> {
    const teams = [];
    const batch = writeBatch(db);
    
    for (let i = 0; i < count; i++) {
      const team = {
        id: `test_team_${i}`,
        name: `Test Team ${i}`,
        sport: 'football',
        ageGroup: 'high_school',
        season: '2025',
        coachIds: [`test_user_${i * 10}`],
        playerIds: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const teamRef = doc(db, 'teams', team.id);
      batch.set(teamRef, team);
      teams.push(team);
    }
    
    await batch.commit();
    return teams;
  }

  private async createTestPlayers(count: number): Promise<any[]> {
    const players = [];
    const batch = writeBatch(db);
    const teams = this.testData.get('teams') || [];
    
    for (let i = 0; i < count; i++) {
      const teamIndex = i % teams.length;
      const player = {
        id: `test_player_${i}`,
        teamId: teams[teamIndex]?.id || `test_team_${teamIndex}`,
        firstName: `Player${i}`,
        lastName: `Test${i}`,
        jerseyNumber: (i % 99) + 1,
        position: 'quarterback',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const playerRef = doc(db, 'players', player.id);
      batch.set(playerRef, player);
      players.push(player);
    }
    
    await batch.commit();
    return players;
  }

  private async createTestPracticePlans(count: number): Promise<any[]> {
    const plans = [];
    const batch = writeBatch(db);
    const teams = this.testData.get('teams') || [];
    
    for (let i = 0; i < count; i++) {
      const teamIndex = i % teams.length;
      const plan = {
        id: `test_plan_${i}`,
        teamId: teams[teamIndex]?.id || `test_team_${teamIndex}`,
        name: `Test Practice Plan ${i}`,
        date: Timestamp.now(),
        duration: 90,
        periods: [],
        goals: ['Improve skills'],
        notes: 'Test practice plan',
        status: 'scheduled',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const planRef = doc(db, 'practicePlans', plan.id);
      batch.set(planRef, plan);
      plans.push(plan);
    }
    
    await batch.commit();
    return plans;
  }

  private async createTestPlays(count: number): Promise<any[]> {
    const plays = [];
    const batch = writeBatch(db);
    const teams = this.testData.get('teams') || [];
    
    for (let i = 0; i < count; i++) {
      const teamIndex = i % teams.length;
      const play = {
        id: `test_play_${i}`,
        teamId: teams[teamIndex]?.id || `test_team_${teamIndex}`,
        name: `Test Play ${i}`,
        formation: 'Shotgun',
        description: 'Test play description',
        routes: [],
        players: [],
        tags: ['offense'],
        difficulty: 'beginner',
        sport: 'football',
        category: 'offense',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const playRef = doc(db, 'plays', play.id);
      batch.set(playRef, play);
      plays.push(play);
    }
    
    await batch.commit();
    return plays;
  }

  // ============================================
  // TEST SCENARIO EXECUTION
  // ============================================

  private async executeTestScenarios(test: PerformanceTest, result: TestResult): Promise<void> {
    const { config, scenarios } = test;
    
    // Create virtual users
    const virtualUsers = await this.createVirtualUsers(config.concurrentUsers);
    
    // Calculate scenario distribution
    const scenarioDistribution = this.calculateScenarioDistribution(scenarios);
    
    // Execute scenarios with ramp-up
    await this.executeWithRampUp(virtualUsers, scenarioDistribution, config, result);
  }

  private async createVirtualUsers(count: number): Promise<VirtualUser[]> {
    const users = [];
    const testUsers = this.testData.get('users') || [];
    
    for (let i = 0; i < count; i++) {
      const testUser = testUsers[i % testUsers.length];
      const user = new VirtualUser(
        `virtual_user_${i}`,
        testUser?.id || `test_user_${i}`,
        this.metricsCollector
      );
      users.push(user);
      this.virtualUsers.set(user.id, user);
    }
    
    return users;
  }

  private calculateScenarioDistribution(scenarios: TestScenario[]): Map<TestScenario, number> {
    const distribution = new Map<TestScenario, number>();
    const totalWeight = scenarios.reduce((sum, scenario) => sum + scenario.weight, 0);
    
    scenarios.forEach(scenario => {
      const requestCount = Math.ceil((scenario.weight / totalWeight) * 1000); // Base on 1000 requests
      distribution.set(scenario, requestCount);
    });
    
    return distribution;
  }

  private async executeWithRampUp(
    virtualUsers: VirtualUser[],
    scenarioDistribution: Map<TestScenario, number>,
    config: TestConfig,
    result: TestResult
  ): Promise<void> {
    const { rampUpTime, duration, rampDownTime } = config;
    const totalTime = rampUpTime + duration + rampDownTime;
    
    // Ramp up phase
    await this.executePhase(virtualUsers, scenarioDistribution, rampUpTime, 'ramp-up', result);
    
    // Steady state phase
    await this.executePhase(virtualUsers, scenarioDistribution, duration, 'steady', result);
    
    // Ramp down phase
    await this.executePhase(virtualUsers, scenarioDistribution, rampDownTime, 'ramp-down', result);
  }

  private async executePhase(
    virtualUsers: VirtualUser[],
    scenarioDistribution: Map<TestScenario, number>,
    phaseDuration: number,
    phase: string,
    result: TestResult
  ): Promise<void> {
    const startTime = Date.now();
    const endTime = startTime + phaseDuration;
    
    const promises: Promise<void>[] = [];
    
    while (Date.now() < endTime) {
      // Select random virtual user
      const user = virtualUsers[Math.floor(Math.random() * virtualUsers.length)];
      
      // Select scenario based on distribution
      const scenario = this.selectScenario(scenarioDistribution);
      
      // Execute scenario
      const promise = user.executeScenario(scenario, result);
      promises.push(promise);
      
      // Control request rate
      await this.sleep(1000 / 10); // 10 RPS
    }
    
    await Promise.all(promises);
  }

  private selectScenario(scenarioDistribution: Map<TestScenario, number>): TestScenario {
    const scenarios = Array.from(scenarioDistribution.keys());
    const weights = Array.from(scenarioDistribution.values());
    
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < scenarios.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return scenarios[i];
      }
    }
    
    return scenarios[0];
  }

  // ============================================
  // RESULTS CALCULATION
  // ============================================

  private calculateTestResults(result: TestResult): void {
    const { metrics } = result;
    
    if (metrics.length === 0) return;
    
    const responseTimes = metrics.map(m => m.responseTime).filter(t => t > 0);
    const successfulMetrics = metrics.filter(m => m.success);
    const failedMetrics = metrics.filter(m => !m.success);
    
    result.summary.totalRequests = metrics.length;
    result.summary.successfulRequests = successfulMetrics.length;
    result.summary.failedRequests = failedMetrics.length;
    
    if (responseTimes.length > 0) {
      result.summary.averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      result.summary.minResponseTime = Math.min(...responseTimes);
      result.summary.maxResponseTime = Math.max(...responseTimes);
      
      // Calculate percentiles
      const sortedTimes = responseTimes.sort((a, b) => a - b);
      result.summary.p95ResponseTime = this.calculatePercentile(sortedTimes, 95);
      result.summary.p99ResponseTime = this.calculatePercentile(sortedTimes, 99);
    }
    
    result.summary.throughput = (result.summary.successfulRequests / (result.duration / 1000));
    result.summary.errorRate = (result.summary.failedRequests / result.summary.totalRequests) * 100;
    
    // Calculate peak resource usage
    const memoryUsage = metrics.map(m => m.memoryUsage);
    const cpuUsage = metrics.map(m => m.cpuUsage);
    
    result.summary.peakMemoryUsage = Math.max(...memoryUsage);
    result.summary.peakCPUUsage = Math.max(...cpuUsage);
  }

  private calculatePercentile(sortedValues: number[], percentile: number): number {
    const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
    return sortedValues[index] || 0;
  }

  // ============================================
  // RECOMMENDATIONS GENERATION
  // ============================================

  private generateRecommendations(result: TestResult, test: PerformanceTest): TestRecommendation[] {
    const recommendations: TestRecommendation[] = [];
    const { summary, expectedResults } = result;
    
    // Check response time
    if (summary.averageResponseTime > expectedResults.maxResponseTime) {
      recommendations.push({
        type: 'optimization',
        title: 'Optimize Response Time',
        description: `Average response time (${summary.averageResponseTime.toFixed(2)}ms) exceeds target (${expectedResults.maxResponseTime}ms)`,
        impact: 'high',
        effort: 'medium',
        priority: 1
      });
    }
    
    // Check throughput
    if (summary.throughput < expectedResults.minThroughput) {
      recommendations.push({
        type: 'scaling',
        title: 'Scale Infrastructure',
        description: `Throughput (${summary.throughput.toFixed(2)} RPS) below target (${expectedResults.minThroughput} RPS)`,
        impact: 'high',
        effort: 'high',
        priority: 1
      });
    }
    
    // Check error rate
    if (summary.errorRate > expectedResults.maxErrorRate) {
      recommendations.push({
        type: 'optimization',
        title: 'Reduce Error Rate',
        description: `Error rate (${summary.errorRate.toFixed(2)}%) exceeds threshold (${expectedResults.maxErrorRate}%)`,
        impact: 'high',
        effort: 'medium',
        priority: 1
      });
    }
    
    // Check memory usage
    if (summary.peakMemoryUsage > expectedResults.maxMemoryUsage) {
      recommendations.push({
        type: 'optimization',
        title: 'Optimize Memory Usage',
        description: `Peak memory usage (${summary.peakMemoryUsage.toFixed(2)}MB) exceeds limit (${expectedResults.maxMemoryUsage}MB)`,
        impact: 'medium',
        effort: 'medium',
        priority: 2
      });
    }
    
    // Check CPU usage
    if (summary.peakCPUUsage > expectedResults.maxCPUUsage) {
      recommendations.push({
        type: 'scaling',
        title: 'Scale CPU Resources',
        description: `Peak CPU usage (${summary.peakCPUUsage.toFixed(2)}%) exceeds limit (${expectedResults.maxCPUUsage}%)`,
        impact: 'medium',
        effort: 'high',
        priority: 2
      });
    }
    
    return recommendations.sort((a, b) => a.priority - b.priority);
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async cleanupTestData(): Promise<void> {
    console.log('Cleaning up test data...');
    
    const collections = ['users', 'teams', 'players', 'practicePlans', 'plays'];
    
    for (const collectionName of collections) {
      const snapshot = await getDocs(query(collection(db, collectionName), where('id', '>=', 'test_')));
      const batch = writeBatch(db);
      
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
    }
    
    this.testData.clear();
    this.virtualUsers.clear();
    console.log('Test data cleanup completed');
  }

  getActiveTests(): TestResult[] {
    return Array.from(this.activeTests.values());
  }

  stopTest(testId: string): void {
    this.activeTests.delete(testId);
  }
}

// ============================================
// VIRTUAL USER CLASS
// ============================================

class VirtualUser {
  constructor(
    public id: string,
    public userId: string,
    private metricsCollector: MetricsCollector
  ) {}

  async executeScenario(scenario: TestScenario, result: TestResult): Promise<void> {
    const startTime = Date.now();
    
    try {
      for (const operation of scenario.operations) {
        await this.executeOperation(operation);
        await this.sleep(scenario.thinkTime);
      }
      
      const responseTime = Date.now() - startTime;
      this.recordMetric(result, responseTime, true, operation.type);
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.recordMetric(result, responseTime, false, 'unknown', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async executeOperation(operation: TestOperation): Promise<any> {
    switch (operation.type) {
      case 'read':
        return this.executeReadOperation(operation);
      case 'write':
      case 'create':
        return this.executeCreateOperation(operation);
      case 'update':
        return this.executeUpdateOperation(operation);
      case 'delete':
        return this.executeDeleteOperation(operation);
      case 'query':
        return this.executeQueryOperation(operation);
      case 'custom':
        return operation.customFn ? operation.customFn() : Promise.resolve();
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  private async executeReadOperation(operation: TestOperation): Promise<any> {
    const docRef = doc(db, operation.collection, operation.documentId!);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  }

  private async executeCreateOperation(operation: TestOperation): Promise<any> {
    const docRef = doc(db, operation.collection, operation.documentId || this.generateDocumentId());
    await setDoc(docRef, {
      ...operation.data,
      createdBy: this.userId,
      createdAt: serverTimestamp()
    });
    return { id: docRef.id };
  }

  private async executeUpdateOperation(operation: TestOperation): Promise<any> {
    const docRef = doc(db, operation.collection, operation.documentId!);
    await updateDoc(docRef, {
      ...operation.data,
      updatedBy: this.userId,
      updatedAt: serverTimestamp()
    });
  }

  private async executeDeleteOperation(operation: TestOperation): Promise<any> {
    const docRef = doc(db, operation.collection, operation.documentId!);
    await deleteDoc(docRef);
  }

  private async executeQueryOperation(operation: TestOperation): Promise<any> {
    let q = collection(db, operation.collection);
    
    if (operation.filters) {
      Object.entries(operation.filters).forEach(([field, value]) => {
        q = query(q, where(field, '==', value));
      });
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  private generateDocumentId(): string {
    return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private recordMetric(
    result: TestResult,
    responseTime: number,
    success: boolean,
    operationType: string,
    error?: string
  ): void {
    const metric: PerformanceMetrics = {
      timestamp: Date.now(),
      responseTime,
      success,
      error,
      operationType,
      userId: this.userId,
      memoryUsage: this.metricsCollector.getMemoryUsage(),
      cpuUsage: this.metricsCollector.getCPUUsage()
    };
    
    result.metrics.push(metric);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================
// METRICS COLLECTOR
// ============================================

class MetricsCollector {
  private isCollecting: boolean = false;
  private memoryUsage: number = 0;
  private cpuUsage: number = 0;

  startCollection(): void {
    this.isCollecting = true;
    this.collectMetrics();
  }

  stopCollection(): void {
    this.isCollecting = false;
  }

  private collectMetrics(): void {
    if (!this.isCollecting) return;

    // Update memory usage
    if ('memory' in performance) {
      this.memoryUsage = (performance as any).memory.usedJSHeapSize / 1024 / 1024; // Convert to MB
    }

    // Update CPU usage (simplified)
    this.cpuUsage = Math.random() * 100; // In a real implementation, this would be more sophisticated

    setTimeout(() => this.collectMetrics(), 1000);
  }

  getMemoryUsage(): number {
    return this.memoryUsage;
  }

  getCPUUsage(): number {
    return this.cpuUsage;
  }
}

// ============================================
// REACT HOOKS
// ============================================

import { useState, useCallback } from 'react';

export const usePerformanceTesting = () => {
  const [manager] = useState(() => new PerformanceTestingManager());
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState<TestResult | null>(null);

  const runPerformanceTest = useCallback(async (test: PerformanceTest) => {
    setIsRunning(true);
    try {
      const result = await manager.runPerformanceTest(test);
      setLastResult(result);
      return result;
    } finally {
      setIsRunning(false);
    }
  }, [manager]);

  const cleanupTestData = useCallback(async () => {
    return manager.cleanupTestData();
  }, [manager]);

  return {
    manager,
    isRunning,
    lastResult,
    runPerformanceTest,
    cleanupTestData,
    getActiveTests: () => manager.getActiveTests(),
    stopTest: (testId: string) => manager.stopTest(testId)
  };
};

export default PerformanceTestingManager; 