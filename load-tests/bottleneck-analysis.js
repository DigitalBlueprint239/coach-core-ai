import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

// Advanced metrics for bottleneck analysis
const firestoreReadLatency = new Trend('firestore_read_latency_ms');
const firestoreWriteLatency = new Trend('firestore_write_latency_ms');
const authLoginLatency = new Trend('auth_login_latency_ms');
const pageLoadLatency = new Trend('page_load_latency_ms');
const apiResponseLatency = new Trend('api_response_latency_ms');
const databaseConnectionLatency = new Trend('database_connection_latency_ms');
const cacheHitRate = new Gauge('cache_hit_rate');
const memoryUsage = new Gauge('memory_usage_mb');
const cpuUsage = new Gauge('cpu_usage_percent');

const responseErrors = new Counter('response_errors_total');
const firestoreErrors = new Counter('firestore_errors_total');
const authErrors = new Counter('auth_errors_total');
const timeoutErrors = new Counter('timeout_errors_total');
const rateLimitErrors = new Counter('rate_limit_errors_total');
const databaseErrors = new Counter('database_errors_total');

// Bottleneck detection thresholds
const BOTTLENECK_THRESHOLDS = {
  firestore_read: { p95: 1000, p99: 2000 },
  firestore_write: { p95: 2000, p99: 5000 },
  auth_login: { p95: 3000, p99: 8000 },
  page_load: { p95: 2000, p99: 5000 },
  api_response: { p95: 1000, p99: 3000 },
  database_connection: { p95: 500, p99: 1000 },
};

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Warm up
    { duration: '5m', target: 100 }, // Baseline
    { duration: '2m', target: 300 }, // Ramp up
    { duration: '5m', target: 300 }, // Medium load
    { duration: '2m', target: 500 }, // Ramp up
    { duration: '5m', target: 500 }, // High load
    { duration: '2m', target: 800 }, // Ramp up
    { duration: '5m', target: 800 }, // Very high load
    { duration: '2m', target: 1000 }, // Ramp up
    { duration: '5m', target: 1000 }, // Peak load
    { duration: '2m', target: 0 }, // Ramp down
  ],
  thresholds: {
    // Performance thresholds
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],
    http_req_failed: ['rate<0.05'],
    http_reqs: ['rate>100'],
    
    // Custom thresholds for bottleneck detection
    firestore_read_latency_ms: ['p(95)<1000', 'p(99)<2000'],
    firestore_write_latency_ms: ['p(95)<2000', 'p(99)<5000'],
    auth_login_latency_ms: ['p(95)<3000', 'p(99)<8000'],
    page_load_latency_ms: ['p(95)<2000', 'p(99)<5000'],
    api_response_latency_ms: ['p(95)<1000', 'p(99)<3000'],
    database_connection_latency_ms: ['p(95)<500', 'p(99)<1000'],
    
    // Error rate thresholds
    response_errors_total: ['count<100'],
    firestore_errors_total: ['count<50'],
    auth_errors_total: ['count<20'],
    timeout_errors_total: ['count<30'],
    rate_limit_errors_total: ['count<10'],
    database_errors_total: ['count<20'],
  },
};

const STAGING_URL = 'https://coach-core-ai-staging.web.app';

// Bottleneck analysis functions
function analyzeFirestoreBottlenecks(response, operation) {
  const latency = response.timings.duration;
  
  if (operation === 'read') {
    firestoreReadLatency.add(latency);
  } else if (operation === 'write') {
    firestoreWriteLatency.add(latency);
  }
  
  // Check for Firestore-specific bottlenecks
  if (response.status === 429) {
    rateLimitErrors.add(1);
    console.warn(`[FIRESTORE_BOTTLENECK] Rate limit exceeded for ${operation} operation`);
  } else if (response.status === 503) {
    databaseErrors.add(1);
    console.warn(`[FIRESTORE_BOTTLENECK] Service unavailable for ${operation} operation`);
  } else if (latency > BOTTLENECK_THRESHOLDS[`firestore_${operation}`].p95) {
    console.warn(`[FIRESTORE_BOTTLENECK] High latency detected: ${latency}ms for ${operation} operation`);
  }
}

function analyzeAuthBottlenecks(response) {
  const latency = response.timings.duration;
  authLoginLatency.add(latency);
  
  if (response.status === 429) {
    rateLimitErrors.add(1);
    console.warn('[AUTH_BOTTLENECK] Rate limit exceeded for auth operation');
  } else if (response.status === 503) {
    authErrors.add(1);
    console.warn('[AUTH_BOTTLENECK] Auth service unavailable');
  } else if (latency > BOTTLENECK_THRESHOLDS.auth_login.p95) {
    console.warn(`[AUTH_BOTTLENECK] High latency detected: ${latency}ms for auth operation`);
  }
}

function analyzePageLoadBottlenecks(response) {
  const latency = response.timings.duration;
  pageLoadLatency.add(latency);
  
  if (response.status === 503) {
    responseErrors.add(1);
    console.warn('[PAGE_LOAD_BOTTLENECK] Service unavailable for page load');
  } else if (latency > BOTTLENECK_THRESHOLDS.page_load.p95) {
    console.warn(`[PAGE_LOAD_BOTTLENECK] High latency detected: ${latency}ms for page load`);
  }
}

function analyzeApiBottlenecks(response) {
  const latency = response.timings.duration;
  apiResponseLatency.add(latency);
  
  if (response.status === 429) {
    rateLimitErrors.add(1);
    console.warn('[API_BOTTLENECK] Rate limit exceeded for API operation');
  } else if (response.status === 503) {
    responseErrors.add(1);
    console.warn('[API_BOTTLENECK] API service unavailable');
  } else if (latency > BOTTLENECK_THRESHOLDS.api_response.p95) {
    console.warn(`[API_BOTTLENECK] High latency detected: ${latency}ms for API operation`);
  }
}

// Test functions with bottleneck analysis
export function testFirestoreRead() {
  const response = http.get(`${STAGING_URL}/api/plays`, {
    headers: {
      'User-Agent': 'k6-bottleneck-test/1.0',
      'Accept': 'application/json',
      'Authorization': 'Bearer test-token',
    },
    timeout: '30s',
  });
  
  analyzeFirestoreBottlenecks(response, 'read');
  
  const success = check(response, {
    'firestore read status is 200': (r) => r.status === 200,
    'firestore read time < 1s': (r) => r.timings.duration < 1000,
    'firestore read response has data': (r) => {
      try {
        return r.json('plays') !== undefined;
      } catch (e) {
        return false;
      }
    },
  });
  
  if (!success) {
    firestoreErrors.add(1);
  }
  
  return response;
}

export function testFirestoreWrite() {
  const playData = {
    name: `Bottleneck Test Play ${Math.random().toString(36).substr(2, 9)}`,
    sport: 'basketball',
    description: 'Bottleneck test play for performance analysis',
    category: 'offense',
    players: {
      'player1': { x: 10, y: 20, role: 'point_guard' },
      'player2': { x: 30, y: 40, role: 'shooting_guard' },
    },
    routes: [
      { start: { x: 10, y: 20 }, end: { x: 30, y: 40 }, type: 'pass' }
    ],
  };
  
  const response = http.post(`${STAGING_URL}/api/plays`, JSON.stringify(playData), {
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'k6-bottleneck-test/1.0',
      'Accept': 'application/json',
      'Authorization': 'Bearer test-token',
    },
    timeout: '30s',
  });
  
  analyzeFirestoreBottlenecks(response, 'write');
  
  const success = check(response, {
    'firestore write status is 200': (r) => r.status === 200,
    'firestore write time < 2s': (r) => r.timings.duration < 2000,
    'firestore write response has id': (r) => {
      try {
        return r.json('id') !== undefined;
      } catch (e) {
        return false;
      }
    },
  });
  
  if (!success) {
    firestoreErrors.add(1);
  }
  
  return response;
}

export function testAuthLogin() {
  const loginData = {
    email: `loadtest${Math.random().toString(36).substr(2, 9)}@example.com`,
    password: 'testpass123',
  };
  
  const response = http.post(`${STAGING_URL}/api/auth/login`, JSON.stringify(loginData), {
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'k6-bottleneck-test/1.0',
      'Accept': 'application/json',
    },
    timeout: '30s',
  });
  
  analyzeAuthBottlenecks(response);
  
  const success = check(response, {
    'auth login status is 200': (r) => r.status === 200,
    'auth login time < 3s': (r) => r.timings.duration < 3000,
  });
  
  if (!success) {
    authErrors.add(1);
  }
  
  return response;
}

export function testPageLoad() {
  const pages = ['/', '/login', '/signup', '/pricing', '/dashboard'];
  const page = pages[Math.floor(Math.random() * pages.length)];
  
  const response = http.get(`${STAGING_URL}${page}`, {
    headers: {
      'User-Agent': 'k6-bottleneck-test/1.0',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    timeout: '30s',
  });
  
  analyzePageLoadBottlenecks(response);
  
  const success = check(response, {
    'page load status is 200': (r) => r.status === 200,
    'page load time < 2s': (r) => r.timings.duration < 2000,
  });
  
  if (!success) {
    responseErrors.add(1);
  }
  
  return response;
}

export function testApiEndpoint() {
  const response = http.get(`${STAGING_URL}/api/health`, {
    headers: {
      'User-Agent': 'k6-bottleneck-test/1.0',
      'Accept': 'application/json',
    },
    timeout: '30s',
  });
  
  analyzeApiBottlenecks(response);
  
  const success = check(response, {
    'api status is 200': (r) => r.status === 200,
    'api time < 1s': (r) => r.timings.duration < 1000,
  });
  
  if (!success) {
    responseErrors.add(1);
  }
  
  return response;
}

export function testDatabaseConnection() {
  const start = Date.now();
  const response = http.get(`${STAGING_URL}/api/database/status`, {
    headers: {
      'User-Agent': 'k6-bottleneck-test/1.0',
      'Accept': 'application/json',
    },
    timeout: '30s',
  });
  const duration = Date.now() - start;
  
  databaseConnectionLatency.add(duration);
  
  if (response.status === 503) {
    databaseErrors.add(1);
    console.warn('[DATABASE_BOTTLENECK] Database connection failed');
  } else if (duration > BOTTLENECK_THRESHOLDS.database_connection.p95) {
    console.warn(`[DATABASE_BOTTLENECK] High connection latency: ${duration}ms`);
  }
  
  return response;
}

// Main test function
export default function() {
  const testScenarios = [
    { name: 'firestore_read', weight: 25, func: testFirestoreRead },
    { name: 'firestore_write', weight: 20, func: testFirestoreWrite },
    { name: 'auth_login', weight: 15, func: testAuthLogin },
    { name: 'page_load', weight: 20, func: testPageLoad },
    { name: 'api_endpoint', weight: 15, func: testApiEndpoint },
    { name: 'database_connection', weight: 5, func: testDatabaseConnection },
  ];
  
  // Select test scenario based on weight
  const random = Math.random() * 100;
  let cumulativeWeight = 0;
  
  for (const scenario of testScenarios) {
    cumulativeWeight += scenario.weight;
    if (random <= cumulativeWeight) {
      console.log(`[VU ${__VU}] Running bottleneck test: ${scenario.name}`);
      scenario.func();
      break;
    }
  }
  
  // Random sleep between 1-3 seconds
  sleep(Math.random() * 2 + 1);
}

// Setup function
export function setup() {
  console.log('🔍 Starting k6 bottleneck analysis...');
  console.log(`📍 Target URL: ${STAGING_URL}`);
  console.log('📊 Test pattern: Gradual load increase to identify bottlenecks');
  console.log('⏱️  Duration: ~40 minutes total');
  
  // Verify staging environment
  const response = http.get(STAGING_URL, { timeout: '30s' });
  if (response.status !== 200) {
    throw new Error(`❌ Staging environment not accessible: ${response.status}`);
  }
  
  console.log('✅ Staging environment is accessible');
  return { stagingUrl: STAGING_URL, startTime: new Date().toISOString() };
}

// Teardown function
export function teardown(data) {
  console.log('🏁 Bottleneck analysis completed');
  console.log(`📍 Target URL: ${data.stagingUrl}`);
  console.log(`⏰ Test duration: ${data.startTime} to ${new Date().toISOString()}`);
  console.log('📊 Check the k6 output for detailed bottleneck analysis');
  console.log('💡 Look for warnings marked with [BOTTLENECK] in the logs');
}
