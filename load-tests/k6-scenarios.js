import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

// Custom metrics for detailed analysis
const firestoreReadLatency = new Trend('firestore_read_latency_ms');
const firestoreWriteLatency = new Trend('firestore_write_latency_ms');
const authLoginLatency = new Trend('auth_login_latency_ms');
const pageLoadLatency = new Trend('page_load_latency_ms');
const apiResponseLatency = new Trend('api_response_latency_ms');

const responseErrors = new Counter('response_errors_total');
const firestoreErrors = new Counter('firestore_errors_total');
const authErrors = new Counter('auth_errors_total');
const timeoutErrors = new Counter('timeout_errors_total');

const activeUsers = new Gauge('active_users');
const requestsPerSecond = new Gauge('requests_per_second');

// Test configuration for different scenarios
export const scenarios = {
  // Scenario 1: 100 concurrent users
  scenario_100_users: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 100 },
      { duration: '5m', target: 100 },
      { duration: '2m', target: 0 },
    ],
    gracefulRampDown: '30s',
  },
  
  // Scenario 2: 500 concurrent users
  scenario_500_users: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '3m', target: 500 },
      { duration: '5m', target: 500 },
      { duration: '2m', target: 0 },
    ],
    gracefulRampDown: '30s',
  },
  
  // Scenario 3: 1000 concurrent users
  scenario_1000_users: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '4m', target: 1000 },
      { duration: '5m', target: 1000 },
      { duration: '3m', target: 0 },
    ],
    gracefulRampDown: '30s',
  },
  
  // Scenario 4: Stress test - gradually increase to find breaking point
  scenario_stress_test: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 100 },
      { duration: '2m', target: 300 },
      { duration: '2m', target: 500 },
      { duration: '2m', target: 700 },
      { duration: '2m', target: 1000 },
      { duration: '2m', target: 1200 },
      { duration: '2m', target: 0 },
    ],
    gracefulRampDown: '30s',
  },
};

export const options = {
  scenarios,
  thresholds: {
    // HTTP thresholds
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],
    http_req_failed: ['rate<0.05'],
    http_reqs: ['rate>100'],
    
    // Custom thresholds
    firestore_read_latency_ms: ['p(95)<1000', 'p(99)<2000'],
    firestore_write_latency_ms: ['p(95)<2000', 'p(99)<5000'],
    auth_login_latency_ms: ['p(95)<3000', 'p(99)<8000'],
    page_load_latency_ms: ['p(95)<2000', 'p(99)<5000'],
    api_response_latency_ms: ['p(95)<1000', 'p(99)<3000'],
    
    // Error rate thresholds
    response_errors_total: ['count<100'],
    firestore_errors_total: ['count<50'],
    auth_errors_total: ['count<20'],
  },
};

// Test configuration
const STAGING_URL = 'https://coach-core-ai-staging.web.app';
const TEST_USERS = [
  { email: 'loadtest1@example.com', password: 'testpass123' },
  { email: 'loadtest2@example.com', password: 'testpass123' },
  { email: 'loadtest3@example.com', password: 'testpass123' },
  { email: 'loadtest4@example.com', password: 'testpass123' },
  { email: 'loadtest5@example.com', password: 'testpass123' },
];

// Helper functions
function getRandomTestUser() {
  return TEST_USERS[Math.floor(Math.random() * TEST_USERS.length)];
}

function measureLatency(operation, metric) {
  const start = Date.now();
  const result = operation();
  const duration = Date.now() - start;
  metric.add(duration);
  return result;
}

function logError(errorType, message, response = null) {
  console.error(`[${errorType}] ${message}`, response ? `Status: ${response.status}` : '');
}

// Test functions
export function testPageLoad() {
  const pages = [
    { path: '/', name: 'landing' },
    { path: '/login', name: 'login' },
    { path: '/signup', name: 'signup' },
    { path: '/pricing', name: 'pricing' },
    { path: '/dashboard', name: 'dashboard' },
    { path: '/play-designer', name: 'play-designer' },
    { path: '/team-management', name: 'team-management' },
  ];
  
  const page = pages[Math.floor(Math.random() * pages.length)];
  const url = `${STAGING_URL}${page.path}`;
  
  const response = measureLatency(() => {
    return http.get(url, {
      headers: {
        'User-Agent': 'k6-load-test/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
      },
      timeout: '30s',
    });
  }, pageLoadLatency);
  
  const checks = {
    'page load status is 200': (r) => r.status === 200,
    'page load time < 2s': (r) => r.timings.duration < 2000,
    'page has title': (r) => r.body.includes('<title>'),
    'page has content': (r) => r.body.length > 1000,
    'no server errors': (r) => r.status < 500,
  };
  
  const success = check(response, checks);
  
  if (!success) {
    responseErrors.add(1);
    logError('PAGE_LOAD', `Failed to load ${page.name} page`, response);
  }
  
  return response;
}

export function testAuthLogin() {
  const testUser = getRandomTestUser();
  
  const loginData = {
    email: testUser.email,
    password: testUser.password,
  };
  
  const response = measureLatency(() => {
    return http.post(`${STAGING_URL}/api/auth/login`, JSON.stringify(loginData), {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'k6-load-test/1.0',
        'Accept': 'application/json',
      },
      timeout: '30s',
    });
  }, authLoginLatency);
  
  const checks = {
    'auth login status is 200': (r) => r.status === 200,
    'auth login time < 3s': (r) => r.timings.duration < 3000,
    'auth response has token': (r) => {
      try {
        return r.json('token') !== undefined;
      } catch (e) {
        return false;
      }
    },
    'no auth errors': (r) => r.status < 400,
  };
  
  const success = check(response, checks);
  
  if (!success) {
    authErrors.add(1);
    logError('AUTH_LOGIN', 'Failed to authenticate user', response);
  }
  
  return response;
}

export function testWaitlistSubmission() {
  const testEmail = `loadtest${Math.random().toString(36).substr(2, 9)}@example.com`;
  
  const waitlistData = {
    email: testEmail,
    source: 'load-test',
    timestamp: new Date().toISOString(),
  };
  
  const response = measureLatency(() => {
    return http.post(`${STAGING_URL}/api/waitlist`, JSON.stringify(waitlistData), {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'k6-load-test/1.0',
        'Accept': 'application/json',
      },
      timeout: '30s',
    });
  }, firestoreWriteLatency);
  
  const checks = {
    'waitlist submission status is 200': (r) => r.status === 200,
    'waitlist submission time < 2s': (r) => r.timings.duration < 2000,
    'waitlist response is success': (r) => {
      try {
        return r.json('success') === true;
      } catch (e) {
        return false;
      }
    },
    'no Firestore errors': (r) => r.status < 500,
  };
  
  const success = check(response, checks);
  
  if (!success) {
    firestoreErrors.add(1);
    logError('FIRESTORE_WRITE', 'Failed to submit to waitlist', response);
  }
  
  return response;
}

export function testPlayCreation() {
  const playData = {
    name: `Load Test Play ${Math.random().toString(36).substr(2, 9)}`,
    sport: 'basketball',
    description: 'Load test play description for performance testing',
    category: 'offense',
    players: {
      'player1': { x: 10, y: 20, role: 'point_guard' },
      'player2': { x: 30, y: 40, role: 'shooting_guard' },
      'player3': { x: 50, y: 60, role: 'small_forward' },
      'player4': { x: 70, y: 80, role: 'power_forward' },
      'player5': { x: 90, y: 100, role: 'center' },
    },
    routes: [
      { start: { x: 10, y: 20 }, end: { x: 30, y: 40 }, type: 'pass' },
      { start: { x: 30, y: 40 }, end: { x: 50, y: 60 }, type: 'pass' },
      { start: { x: 50, y: 60 }, end: { x: 70, y: 80 }, type: 'pass' },
    ],
    metadata: {
      created_by: 'load-test',
      test_run: __VU,
      timestamp: new Date().toISOString(),
    },
  };
  
  const response = measureLatency(() => {
    return http.post(`${STAGING_URL}/api/plays`, JSON.stringify(playData), {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'k6-load-test/1.0',
        'Accept': 'application/json',
        'Authorization': 'Bearer test-token', // Mock token for testing
      },
      timeout: '30s',
    });
  }, firestoreWriteLatency);
  
  const checks = {
    'play creation status is 200': (r) => r.status === 200,
    'play creation time < 2s': (r) => r.timings.duration < 2000,
    'play creation response has id': (r) => {
      try {
        return r.json('id') !== undefined;
      } catch (e) {
        return false;
      }
    },
    'no Firestore write errors': (r) => r.status < 500,
  };
  
  const success = check(response, checks);
  
  if (!success) {
    firestoreErrors.add(1);
    logError('FIRESTORE_WRITE', 'Failed to create play', response);
  }
  
  return response;
}

export function testPlayRetrieval() {
  const response = measureLatency(() => {
    return http.get(`${STAGING_URL}/api/plays`, {
      headers: {
        'User-Agent': 'k6-load-test/1.0',
        'Accept': 'application/json',
        'Authorization': 'Bearer test-token', // Mock token for testing
      },
      timeout: '30s',
    });
  }, firestoreReadLatency);
  
  const checks = {
    'play retrieval status is 200': (r) => r.status === 200,
    'play retrieval time < 1s': (r) => r.timings.duration < 1000,
    'play retrieval response has data': (r) => {
      try {
        return r.json('plays') !== undefined;
      } catch (e) {
        return false;
      }
    },
    'no Firestore read errors': (r) => r.status < 500,
  };
  
  const success = check(response, checks);
  
  if (!success) {
    firestoreErrors.add(1);
    logError('FIRESTORE_READ', 'Failed to retrieve plays', response);
  }
  
  return response;
}

export function testTeamManagement() {
  const teamData = {
    name: `Load Test Team ${Math.random().toString(36).substr(2, 9)}`,
    sport: 'basketball',
    ageGroup: 'adult',
    settings: {
      season: '2024',
      league: 'Load Test League',
      division: 'A',
    },
    metadata: {
      created_by: 'load-test',
      test_run: __VU,
      timestamp: new Date().toISOString(),
    },
  };
  
  const response = measureLatency(() => {
    return http.post(`${STAGING_URL}/api/teams`, JSON.stringify(teamData), {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'k6-load-test/1.0',
        'Accept': 'application/json',
        'Authorization': 'Bearer test-token', // Mock token for testing
      },
      timeout: '30s',
    });
  }, firestoreWriteLatency);
  
  const checks = {
    'team creation status is 200': (r) => r.status === 200,
    'team creation time < 2s': (r) => r.timings.duration < 2000,
    'team creation response has id': (r) => {
      try {
        return r.json('id') !== undefined;
      } catch (e) {
        return false;
      }
    },
    'no Firestore write errors': (r) => r.status < 500,
  };
  
  const success = check(response, checks);
  
  if (!success) {
    firestoreErrors.add(1);
    logError('FIRESTORE_WRITE', 'Failed to create team', response);
  }
  
  return response;
}

export function testSubscriptionFlow() {
  const subscriptionData = {
    tier: 'pro',
    price: 2900,
    currency: 'usd',
    interval: 'month',
    metadata: {
      created_by: 'load-test',
      test_run: __VU,
      timestamp: new Date().toISOString(),
    },
  };
  
  const response = measureLatency(() => {
    return http.post(`${STAGING_URL}/api/subscriptions`, JSON.stringify(subscriptionData), {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'k6-load-test/1.0',
        'Accept': 'application/json',
        'Authorization': 'Bearer test-token', // Mock token for testing
      },
      timeout: '30s',
    });
  }, firestoreWriteLatency);
  
  const checks = {
    'subscription creation status is 200': (r) => r.status === 200,
    'subscription creation time < 2s': (r) => r.timings.duration < 2000,
    'subscription creation response has id': (r) => {
      try {
        return r.json('id') !== undefined;
      } catch (e) {
        return false;
      }
    },
    'no Firestore write errors': (r) => r.status < 500,
  };
  
  const success = check(response, checks);
  
  if (!success) {
    firestoreErrors.add(1);
    logError('FIRESTORE_WRITE', 'Failed to create subscription', response);
  }
  
  return response;
}

export function testApiHealth() {
  const response = measureLatency(() => {
    return http.get(`${STAGING_URL}/api/health`, {
      headers: {
        'User-Agent': 'k6-load-test/1.0',
        'Accept': 'application/json',
      },
      timeout: '10s',
    });
  }, apiResponseLatency);
  
  const checks = {
    'health check status is 200': (r) => r.status === 200,
    'health check time < 1s': (r) => r.timings.duration < 1000,
    'health check response is ok': (r) => {
      try {
        return r.json('status') === 'ok';
      } catch (e) {
        return false;
      }
    },
  };
  
  const success = check(response, checks);
  
  if (!success) {
    responseErrors.add(1);
    logError('API_HEALTH', 'Health check failed', response);
  }
  
  return response;
}

// Main test function
export default function() {
  // Update active users gauge
  activeUsers.add(1);
  
  const testScenarios = [
    { name: 'page_load', weight: 25, func: testPageLoad },
    { name: 'auth_login', weight: 15, func: testAuthLogin },
    { name: 'waitlist_submission', weight: 15, func: testWaitlistSubmission },
    { name: 'play_creation', weight: 15, func: testPlayCreation },
    { name: 'play_retrieval', weight: 10, func: testPlayRetrieval },
    { name: 'team_management', weight: 10, func: testTeamManagement },
    { name: 'subscription_flow', weight: 5, func: testSubscriptionFlow },
    { name: 'api_health', weight: 5, func: testApiHealth },
  ];
  
  // Select test scenario based on weight
  const random = Math.random() * 100;
  let cumulativeWeight = 0;
  
  for (const scenario of testScenarios) {
    cumulativeWeight += scenario.weight;
    if (random <= cumulativeWeight) {
      console.log(`[VU ${__VU}] Running scenario: ${scenario.name}`);
      scenario.func();
      break;
    }
  }
  
  // Random sleep between 1-3 seconds
  sleep(Math.random() * 2 + 1);
}

// Setup function
export function setup() {
  console.log('🚀 Starting k6 load test against staging environment...');
  console.log(`📍 Target URL: ${STAGING_URL}`);
  console.log('📊 Test scenarios: 100 -> 500 -> 1000 concurrent users');
  console.log('⏱️  Duration: ~30 minutes total');
  
  // Verify staging environment is accessible
  const response = http.get(STAGING_URL, { timeout: '30s' });
  if (response.status !== 200) {
    throw new Error(`❌ Staging environment not accessible: ${response.status}`);
  }
  
  console.log('✅ Staging environment is accessible');
  return { stagingUrl: STAGING_URL, startTime: new Date().toISOString() };
}

// Teardown function
export function teardown(data) {
  console.log('🏁 Load test completed');
  console.log(`📍 Final staging URL: ${data.stagingUrl}`);
  console.log(`⏰ Test duration: ${data.startTime} to ${new Date().toISOString()}`);
  console.log('📊 Check the k6 output for detailed metrics and analysis');
}
