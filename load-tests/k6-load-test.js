import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const firestoreReadLatency = new Trend('firestore_read_latency');
const firestoreWriteLatency = new Trend('firestore_write_latency');
const authLoginLatency = new Trend('auth_login_latency');
const responseErrors = new Counter('response_errors');
const firestoreErrors = new Counter('firestore_errors');
const authErrors = new Counter('auth_errors');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 500 }, // Ramp up to 500 users
    { duration: '5m', target: 500 }, // Stay at 500 users
    { duration: '2m', target: 1000 }, // Ramp up to 1000 users
    { duration: '5m', target: 1000 }, // Stay at 1000 users
    { duration: '2m', target: 0 }, // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests should be below 2s
    http_req_failed: ['rate<0.1'], // Error rate should be less than 10%
    firestore_read_latency: ['p(95)<1000'], // 95% of Firestore reads should be below 1s
    firestore_write_latency: ['p(95)<2000'], // 95% of Firestore writes should be below 2s
    auth_login_latency: ['p(95)<3000'], // 95% of auth logins should be below 3s
  },
};

// Test data
const STAGING_URL = 'https://coach-core-ai-staging.web.app';
const TEST_USERS = [
  { email: 'test1@example.com', password: 'testpass123' },
  { email: 'test2@example.com', password: 'testpass123' },
  { email: 'test3@example.com', password: 'testpass123' },
  { email: 'test4@example.com', password: 'testpass123' },
  { email: 'test5@example.com', password: 'testpass123' },
];

// Helper function to get random test user
function getRandomTestUser() {
  return TEST_USERS[Math.floor(Math.random() * TEST_USERS.length)];
}

// Helper function to measure Firestore operations
function measureFirestoreOperation(operation, operationName) {
  const start = Date.now();
  const result = operation();
  const duration = Date.now() - start;
  
  if (operationName.includes('read')) {
    firestoreReadLatency.add(duration);
  } else if (operationName.includes('write')) {
    firestoreWriteLatency.add(duration);
  }
  
  return result;
}

// Helper function to measure auth operations
function measureAuthOperation(operation, operationName) {
  const start = Date.now();
  const result = operation();
  const duration = Date.now() - start;
  
  authLoginLatency.add(duration);
  
  return result;
}

// Test scenarios
export function testPageLoad() {
  const pages = [
    '/',
    '/login',
    '/signup',
    '/pricing',
    '/dashboard',
    '/play-designer',
    '/team-management',
  ];
  
  const page = pages[Math.floor(Math.random() * pages.length)];
  const url = `${STAGING_URL}${page}`;
  
  const response = http.get(url, {
    headers: {
      'User-Agent': 'k6-load-test/1.0',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate',
      'Connection': 'keep-alive',
    },
  });
  
  const success = check(response, {
    'page load status is 200': (r) => r.status === 200,
    'page load time < 2s': (r) => r.timings.duration < 2000,
    'page has title': (r) => r.body.includes('<title>'),
    'page has content': (r) => r.body.length > 1000,
  });
  
  if (!success) {
    responseErrors.add(1);
  }
  
  return response;
}

export function testAuthLogin() {
  const testUser = getRandomTestUser();
  
  const loginData = {
    email: testUser.email,
    password: testUser.password,
  };
  
  const response = measureAuthOperation(() => {
    return http.post(`${STAGING_URL}/api/auth/login`, JSON.stringify(loginData), {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'k6-load-test/1.0',
      },
    });
  }, 'auth_login');
  
  const success = check(response, {
    'auth login status is 200': (r) => r.status === 200,
    'auth login time < 3s': (r) => r.timings.duration < 3000,
    'auth response has token': (r) => r.json('token') !== undefined,
  });
  
  if (!success) {
    authErrors.add(1);
  }
  
  return response;
}

export function testWaitlistSubmission() {
  const testEmail = `loadtest${Math.random().toString(36).substr(2, 9)}@example.com`;
  
  const waitlistData = {
    email: testEmail,
    source: 'load-test',
  };
  
  const response = measureFirestoreOperation(() => {
    return http.post(`${STAGING_URL}/api/waitlist`, JSON.stringify(waitlistData), {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'k6-load-test/1.0',
      },
    });
  }, 'firestore_write');
  
  const success = check(response, {
    'waitlist submission status is 200': (r) => r.status === 200,
    'waitlist submission time < 2s': (r) => r.timings.duration < 2000,
    'waitlist response is success': (r) => r.json('success') === true,
  });
  
  if (!success) {
    firestoreErrors.add(1);
  }
  
  return response;
}

export function testPlayCreation() {
  const playData = {
    name: `Load Test Play ${Math.random().toString(36).substr(2, 9)}`,
    sport: 'basketball',
    description: 'Load test play description',
    category: 'offense',
    players: {
      'player1': { x: 10, y: 20, role: 'point_guard' },
      'player2': { x: 30, y: 40, role: 'shooting_guard' },
    },
    routes: [
      { start: { x: 10, y: 20 }, end: { x: 30, y: 40 }, type: 'pass' }
    ],
  };
  
  const response = measureFirestoreOperation(() => {
    return http.post(`${STAGING_URL}/api/plays`, JSON.stringify(playData), {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'k6-load-test/1.0',
        'Authorization': 'Bearer test-token', // Mock token for testing
      },
    });
  }, 'firestore_write');
  
  const success = check(response, {
    'play creation status is 200': (r) => r.status === 200,
    'play creation time < 2s': (r) => r.timings.duration < 2000,
    'play creation response has id': (r) => r.json('id') !== undefined,
  });
  
  if (!success) {
    firestoreErrors.add(1);
  }
  
  return response;
}

export function testPlayRetrieval() {
  const response = measureFirestoreOperation(() => {
    return http.get(`${STAGING_URL}/api/plays`, {
      headers: {
        'User-Agent': 'k6-load-test/1.0',
        'Authorization': 'Bearer test-token', // Mock token for testing
      },
    });
  }, 'firestore_read');
  
  const success = check(response, {
    'play retrieval status is 200': (r) => r.status === 200,
    'play retrieval time < 1s': (r) => r.timings.duration < 1000,
    'play retrieval response has data': (r) => r.json('plays') !== undefined,
  });
  
  if (!success) {
    firestoreErrors.add(1);
  }
  
  return response;
}

export function testTeamManagement() {
  const teamData = {
    name: `Load Test Team ${Math.random().toString(36).substr(2, 9)}`,
    sport: 'basketball',
    ageGroup: 'adult',
  };
  
  const response = measureFirestoreOperation(() => {
    return http.post(`${STAGING_URL}/api/teams`, JSON.stringify(teamData), {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'k6-load-test/1.0',
        'Authorization': 'Bearer test-token', // Mock token for testing
      },
    });
  }, 'firestore_write');
  
  const success = check(response, {
    'team creation status is 200': (r) => r.status === 200,
    'team creation time < 2s': (r) => r.timings.duration < 2000,
    'team creation response has id': (r) => r.json('id') !== undefined,
  });
  
  if (!success) {
    firestoreErrors.add(1);
  }
  
  return response;
}

export function testSubscriptionFlow() {
  const subscriptionData = {
    tier: 'pro',
    price: 2900,
    currency: 'usd',
  };
  
  const response = measureFirestoreOperation(() => {
    return http.post(`${STAGING_URL}/api/subscriptions`, JSON.stringify(subscriptionData), {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'k6-load-test/1.0',
        'Authorization': 'Bearer test-token', // Mock token for testing
      },
    });
  }, 'firestore_write');
  
  const success = check(response, {
    'subscription creation status is 200': (r) => r.status === 200,
    'subscription creation time < 2s': (r) => r.timings.duration < 2000,
    'subscription creation response has id': (r) => r.json('id') !== undefined,
  });
  
  if (!success) {
    firestoreErrors.add(1);
  }
  
  return response;
}

// Main test function
export default function() {
  const testScenarios = [
    { name: 'page_load', weight: 30, func: testPageLoad },
    { name: 'auth_login', weight: 20, func: testAuthLogin },
    { name: 'waitlist_submission', weight: 15, func: testWaitlistSubmission },
    { name: 'play_creation', weight: 15, func: testPlayCreation },
    { name: 'play_retrieval', weight: 10, func: testPlayRetrieval },
    { name: 'team_management', weight: 5, func: testTeamManagement },
    { name: 'subscription_flow', weight: 5, func: testSubscriptionFlow },
  ];
  
  // Select test scenario based on weight
  const random = Math.random() * 100;
  let cumulativeWeight = 0;
  
  for (const scenario of testScenarios) {
    cumulativeWeight += scenario.weight;
    if (random <= cumulativeWeight) {
      console.log(`Running scenario: ${scenario.name}`);
      scenario.func();
      break;
    }
  }
  
  // Random sleep between 1-3 seconds
  sleep(Math.random() * 2 + 1);
}

// Setup function - runs once before all tests
export function setup() {
  console.log('Starting k6 load test against staging environment...');
  console.log(`Target URL: ${STAGING_URL}`);
  console.log('Test scenarios: 100 -> 500 -> 1000 concurrent users');
  
  // Verify staging environment is accessible
  const response = http.get(STAGING_URL);
  if (response.status !== 200) {
    throw new Error(`Staging environment not accessible: ${response.status}`);
  }
  
  console.log('Staging environment is accessible');
  return { stagingUrl: STAGING_URL };
}

// Teardown function - runs once after all tests
export function teardown(data) {
  console.log('Load test completed');
  console.log(`Final staging URL: ${data.stagingUrl}`);
}
