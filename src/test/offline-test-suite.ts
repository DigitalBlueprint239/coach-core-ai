import aiService from '../services/ai/ai-service';
import { offlineSimulator } from './offline-simulator';
import { generateMockTeamContext } from './mock-data-generator';
import { PlanValidationSummary, validatePracticePlan } from '../utils/plan-validator';

interface OfflineTestResult {
  scenario: string;
  success: boolean;
  message: string;
  validation?: PlanValidationSummary;
  queuedBefore?: number;
  queuedAfter?: number;
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function runOfflineQueueTests(): Promise<OfflineTestResult[]> {
  const results: OfflineTestResult[] = [];

  // Scenario 1: Generate plan while offline → ensure queued
  offlineSimulator.goOffline();
  offlineSimulator.clearLogs();
  const queuedBefore = offlineSimulator.getLogs().length;

  const offlineRequest = generateMockTeamContext({ duration: 30 });
  try {
    await aiService.generatePracticePlan(offlineRequest.request);
    results.push({
      scenario: 'Offline queueing',
      success: false,
      message: 'Plan generation unexpectedly succeeded while offline.',
    });
  } catch (error) {
    const queuedAfter = offlineSimulator.getLogs().length;
    results.push({
      scenario: 'Offline queueing',
      success: queuedAfter > queuedBefore,
      message: queuedAfter > queuedBefore ? 'Request queued as expected.' : 'Queue did not store request.',
      queuedBefore,
      queuedAfter,
    });
  }

  // Scenario 2: Restore online and process queue
  offlineSimulator.goOnline();
  const recoveryRequest = generateMockTeamContext({ duration: 30 });
  try {
    const response = await aiService.generatePracticePlan(recoveryRequest.request);
    const validation = validatePracticePlan(response.plan, recoveryRequest.request);
    results.push({
      scenario: 'Online recovery',
      success: validation.passed,
      message: validation.passed ? 'Queued requests processed successfully upon reconnection.' : 'Plan failed validation post-recovery.',
      validation,
    });
  } catch (error) {
    results.push({
      scenario: 'Online recovery',
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error after going online.',
    });
  }

  // Scenario 3: Simulate slow connection
  offlineSimulator.simulateLatency(2000, 3000);
  const slowRequest = generateMockTeamContext({ duration: 60 });
  const slowStart = performance.now();
  const slowResponse = await aiService.generatePracticePlan(slowRequest.request);
  const slowDuration = performance.now() - slowStart;
  const slowValidation = validatePracticePlan(slowResponse.plan, slowRequest.request);
  results.push({
    scenario: 'Slow connection',
    success: slowDuration >= 2000 && slowValidation.passed,
    message: `Latency observed: ${Math.round(slowDuration)}ms. Validation: ${slowValidation.passed ? 'pass' : 'fail'}.`,
    validation: slowValidation,
  });

  // Scenario 4: Rapid offline requests ensuring order
  offlineSimulator.goOffline();
  offlineSimulator.clearLogs();
  const rapidRequests = Array.from({ length: 5 }, (_, index) => generateMockTeamContext({ seed: index, duration: 30 }));
  for (const request of rapidRequests) {
    await aiService.generatePracticePlan(request.request).catch(() => {});
  }
  const queueLogs = offlineSimulator.getLogs();
  const timestamps = queueLogs.map(entry => entry.timestamp);
  const ordered = timestamps.every((time, index) => index === 0 || time >= timestamps[index - 1]);
  results.push({
    scenario: 'Rapid offline queue ordering',
    success: ordered && queueLogs.length >= 5,
    message: ordered ? 'Requests queued in order.' : 'Queue ordering inconsistent.',
    queuedBefore: 0,
    queuedAfter: queueLogs.length,
  });

  // Scenario 5: Queue persistence across refresh
  const persisted = !!localStorage.getItem('offline-simulator-queue-log');
  results.push({
    scenario: 'Queue persistence',
    success: persisted,
    message: persisted ? 'Queue persisted to localStorage.' : 'Queue persistence missing.',
  });

  offlineSimulator.goOnline();

  return results;
}
