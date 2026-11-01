/**
 * AI Proxy Service Tests
 * Tests AIProxyService request handling, retry logic, and error handling.
 */

import { AIProxyService, AIProxyRequest } from '../ai-proxy';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock AbortSignal.timeout (not available in JSDOM)
if (!AbortSignal.timeout) {
  Object.defineProperty(AbortSignal, 'timeout', {
    value: jest.fn((_ms: number) => new AbortController().signal),
    writable: true,
  });
}

const createSuccessResponse = (data: any) => ({
  ok: true,
  json: () => Promise.resolve({
    response: data,
    metadata: { model: 'gpt-4', tokens: 100, cost: 0.01 }
  }),
});

const createErrorResponse = (status: number, errorMsg: string) => ({
  ok: false,
  status,
  statusText: 'Error',
  json: () => Promise.resolve({ error: errorMsg }),
});

describe('AIProxyService', () => {
  let service: AIProxyService;

  beforeEach(() => {
    mockFetch.mockClear();
    service = new AIProxyService({
      endpoint: 'http://localhost:3001/api/ai',
      timeout: 5000,
      retries: 2,
      enabled: true,
      getIdToken: async () => 'test-id-token',
    });
  });

  describe('constructor', () => {
    it('creates service with given config', () => {
      expect(service).toBeInstanceOf(AIProxyService);
    });

    it('uses default timeout and retries when not specified', () => {
      const svc = new AIProxyService({ endpoint: '/api/ai' });
      expect(svc).toBeInstanceOf(AIProxyService);
    });
  });

  describe('makeRequest — success', () => {
    it('returns success response with data', async () => {
      const mockData = { plan: 'test plan' };
      mockFetch.mockResolvedValueOnce(createSuccessResponse(mockData));

      const request: AIProxyRequest = {
        type: 'practice_plan',
        data: { duration: 60, goals: ['conditioning'] },
      };

      const result = await service.makeRequest(request);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
    });

    it('includes metadata in response', async () => {
      mockFetch.mockResolvedValueOnce(createSuccessResponse({ result: 'ok' }));

      const result = await service.makeRequest({
        type: 'conversation',
        data: {},
      });

      expect(result.metadata).toBeDefined();
      expect(result.metadata!.model).toBe('gpt-4');
    });

    it('sends correct Content-Type header', async () => {
      mockFetch.mockResolvedValueOnce(createSuccessResponse({}));

      await service.makeRequest({ type: 'play_suggestion', data: {} });

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers['Content-Type']).toBe('application/json');
    });

    it('sends request body as JSON', async () => {
      mockFetch.mockResolvedValueOnce(createSuccessResponse({}));

      const requestData: AIProxyRequest = { type: 'performance_analysis', data: { teamId: 't1' } };
      await service.makeRequest(requestData);

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.type).toBe('performance_analysis');
    });

    it('uses POST method', async () => {
      mockFetch.mockResolvedValueOnce(createSuccessResponse({}));

      await service.makeRequest({ type: 'drill_suggestions', data: {} });

      const [, options] = mockFetch.mock.calls[0];
      expect(options.method).toBe('POST');
    });
  });

  describe('makeRequest — failure', () => {
    it('returns failure response when all retries exhausted', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await service.makeRequest({ type: 'conversation', data: {} });

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('retries the specified number of times', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await service.makeRequest({ type: 'conversation', data: {} });

      // retries: 2 means 2 total attempts
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('returns failure when server responds with non-OK status', async () => {
      mockFetch.mockResolvedValue(createErrorResponse(500, 'Internal Server Error'));

      const result = await service.makeRequest({ type: 'practice_plan', data: {} });

      expect(result.success).toBe(false);
    });

    it('includes error message in failure response', async () => {
      mockFetch.mockRejectedValue(new Error('Connection refused'));

      const result = await service.makeRequest({ type: 'conversation', data: {} });

      expect(result.error).toContain('Connection refused');
    });
  });

  describe('request types', () => {
    const requestTypes: AIProxyRequest['type'][] = [
      'practice_plan',
      'play_suggestion',
      'performance_analysis',
      'drill_suggestions',
      'conversation',
      'safety_validation',
    ];

    requestTypes.forEach(type => {
      it(`accepts request type: ${type}`, async () => {
        mockFetch.mockResolvedValueOnce(createSuccessResponse({ result: type }));
        const result = await service.makeRequest({ type, data: {} });
        expect(result.success).toBe(true);
      });
    });
  });
});

describe('AIProxyService — locked-down path', () => {
  const ok = { endpoint: '/api/ai', retries: 1 };
  const request: AIProxyRequest = { type: 'play_suggestion', data: {} };

  beforeEach(() => mockFetch.mockReset());

  it('makes no network call when AI is switched off', async () => {
    const svc = new AIProxyService({ ...ok, enabled: false, getIdToken: async () => 'id-token' });
    const r = await svc.makeRequest(request);
    expect(r).toEqual({ success: false, error: 'AI features are turned off.' });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('is off unless REACT_APP_AI_ENABLED is "true"', async () => {
    const before = process.env.REACT_APP_AI_ENABLED;
    delete process.env.REACT_APP_AI_ENABLED;
    try {
      const r = await new AIProxyService({ ...ok, getIdToken: async () => 'id-token' }).makeRequest(request);
      expect(r.error).toBe('AI features are turned off.');
      expect(mockFetch).not.toHaveBeenCalled();
    } finally {
      if (before === undefined) delete process.env.REACT_APP_AI_ENABLED;
      else process.env.REACT_APP_AI_ENABLED = before;
    }
  });

  it('refuses without a signed-in coach and makes no network call', async () => {
    const svc = new AIProxyService({ ...ok, enabled: true, getIdToken: async () => null });
    const r = await svc.makeRequest(request);
    expect(r).toEqual({ success: false, error: 'Sign in to use AI features.' });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("sends the coach's Firebase ID token, never a shared static token", async () => {
    process.env.REACT_APP_AI_PROXY_TOKEN = 'leaked-static-token';
    try {
      mockFetch.mockResolvedValueOnce(createSuccessResponse({}));
      await new AIProxyService({ ...ok, enabled: true, getIdToken: async () => 'id-token-123' }).makeRequest(request);
      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers.Authorization).toBe('Bearer id-token-123');
    } finally {
      delete process.env.REACT_APP_AI_PROXY_TOKEN;
    }
  });
});
