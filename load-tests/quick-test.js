import http from 'k6/http';
import { check, sleep } from 'k6';

// Quick test configuration - 1 minute, 10 users
export const options = {
  vus: 10,
  duration: '1m',
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.1'],
  },
};

const STAGING_URL = 'https://coach-core-ai-staging.web.app';

export default function() {
  // Test page load
  const response = http.get(STAGING_URL, {
    headers: {
      'User-Agent': 'k6-quick-test/1.0',
    },
    timeout: '30s',
  });
  
  const success = check(response, {
    'page load status is 200': (r) => r.status === 200,
    'page load time < 2s': (r) => r.timings.duration < 2000,
    'page has content': (r) => r.body.length > 1000,
  });
  
  if (!success) {
    console.log(`❌ Page load failed: ${response.status} - ${response.timings.duration}ms`);
  } else {
    console.log(`✅ Page load success: ${response.status} - ${response.timings.duration}ms`);
  }
  
  sleep(1);
}

export function setup() {
  console.log('🚀 Starting quick k6 test...');
  console.log(`📍 Target: ${STAGING_URL}`);
  console.log('⏱️  Duration: 1 minute, 10 users');
  
  // Verify staging environment
  const response = http.get(STAGING_URL, { timeout: '30s' });
  if (response.status !== 200) {
    throw new Error(`❌ Staging environment not accessible: ${response.status}`);
  }
  
  console.log('✅ Staging environment is accessible');
  return { stagingUrl: STAGING_URL };
}

export function teardown(data) {
  console.log('🏁 Quick test completed');
  console.log(`📍 Target: ${data.stagingUrl}`);
}
