import { authService } from '../firebase/auth-service';

class APIRequestError<T = unknown> extends Error {
  constructor(
    message: string,
    public status?: number,
    public payload?: T
  ) {
    super(message);
    this.name = 'APIRequestError';
  }
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  statusCode?: number;
  timestamp: Date;
}

export interface APIRequest {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  data?: any;
  params?: Record<string, string | number | boolean>;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface APIConfig {
  baseURL: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  enableCaching: boolean;
  cacheExpiry: number;
}

export interface APICache {
  key: string;
  data: any;
  timestamp: Date;
  expiry: number;
}

class APIService {
  private config: APIConfig;
  private cache: Map<string, APICache>;
  private requestQueue: Map<string, Promise<APIResponse<any>>>;
  private authToken: string | null = null;
  private isAuthenticated = false;

  constructor() {
    this.config = {
      baseURL:
        import.meta.env.VITE_API_BASE_URL || 'https://api.coachcore.com/v1',
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      enableCaching: true,
      cacheExpiry: 5 * 60 * 1000, // 5 minutes
    };

    this.cache = new Map();
    this.requestQueue = new Map();

    // Initialize auth token
    this.initializeAuth();
  }

  private async initializeAuth() {
    try {
      const user = await authService.getCurrentProfile();
      if (user) {
        this.authToken = await user.getIdToken();
      }

      // Listen for auth state changes through the auth service
      const unsubscribe = authService.addAuthStateListener(async (state) => {
        if (state.user) {
          try {
            const token = await state.user.getIdToken();
            this.authToken = token;
            this.isAuthenticated = true;
          } catch (error) {
            console.error('Failed to get auth token:', error);
            this.isAuthenticated = false;
          }
        } else {
          this.authToken = null;
          this.isAuthenticated = false;
        }
      });
    } catch (error) {
      console.error('Failed to initialize API auth:', error);
    }
  }

  private getCacheKey(endpoint: string, params?: Record<string, any>): string {
    const paramString = params ? JSON.stringify(params) : '';
    return `${endpoint}:${paramString}`;
  }

  private getCachedData(key: string): any | null {
    if (!this.config.enableCaching) return null;

    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp.getTime() > cached.expiry) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCachedData(key: string, data: any): void {
    if (!this.config.enableCaching) return;

    this.cache.set(key, {
      key,
      data,
      timestamp: new Date(),
      expiry: this.config.cacheExpiry,
    });
  }

  private async makeRequest<T = unknown>(
    request: APIRequest,
    attempt: number = 1
  ): Promise<APIResponse<T>> {
    const { endpoint, method, data, params, headers, timeout } = request;

    try {
      // Build URL with query parameters
      const url = new URL(endpoint, this.config.baseURL);
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            url.searchParams.append(key, String(value));
          }
        });
      }

      // Prepare headers
      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...headers,
      };

      // Add auth token if available
      if (this.authToken) {
        requestHeaders['Authorization'] = `Bearer ${this.authToken}`;
      }

      // Prepare request options
      const requestOptions: RequestInit = {
        method,
        headers: requestHeaders,
        signal: AbortSignal.timeout(timeout || this.config.timeout),
      };

      // Add body for POST, PUT, PATCH requests
      if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
        requestOptions.body = JSON.stringify(data);
      }

      // Make the request
      const response = await fetch(url.toString(), requestOptions);

      const contentType = response.headers.get('content-type') ?? '';
      let responseData: T | undefined;

      if (contentType.includes('application/json')) {
        responseData = (await response.json()) as T;
      } else if (contentType.includes('text/')) {
        const textPayload = await response.text();
        responseData = textPayload as unknown as T;
      }

      if (!response.ok) {
        const message =
          typeof responseData === 'object' && responseData !== null && 'message' in (responseData as Record<string, unknown>)
            ? String((responseData as Record<string, unknown>).message)
            : `HTTP ${response.status}: ${response.statusText}`;
        throw new APIRequestError(message, response.status, responseData);
      }

      return {
        success: true,
        data: responseData,
        statusCode: response.status,
        timestamp: new Date(),
      };
    } catch (error: unknown) {
      const normalizedError = (() => {
        if (error instanceof APIRequestError) {
          return error;
        }
        if (error instanceof DOMException && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
          return new APIRequestError('Request timeout');
        }
        if (error instanceof Error) {
          return new APIRequestError(error.message);
        }
        return new APIRequestError('Request failed');
      })();

      // Retry logic for network errors
      if (attempt < this.config.retryAttempts && this.isRetryableError(normalizedError)) {
        await this.delay(this.config.retryDelay * attempt);
        return this.makeRequest<T>(request, attempt + 1);
      }

      return {
        success: false,
        error: normalizedError.message,
        statusCode: normalizedError.status ?? 0,
        timestamp: new Date(),
      };
    }
  }

  private isRetryableError(error: unknown): boolean {
    if (error instanceof APIRequestError) {
      return Boolean(error.status && error.status >= 500);
    }

    if (error instanceof DOMException && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
      return true;
    }

    const message = error instanceof Error ? error.message : '';
    const retryableErrors = [
      'Network Error',
      'Failed to fetch',
      'Request timeout',
      'ECONNRESET',
      'ENOTFOUND',
    ];

    return retryableErrors.some((msg) => message.includes(msg));
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getRequestKey(request: APIRequest): string {
    return `${request.method}:${request.endpoint}:${JSON.stringify(request.params || {})}`;
  }

  // Public API methods
  async request<T = any>(request: APIRequest): Promise<APIResponse<T>> {
    const requestKey = this.getRequestKey(request);

    // Check if request is already in progress
    if (this.requestQueue.has(requestKey)) {
      return this.requestQueue.get(requestKey)! as Promise<APIResponse<T>>;
    }

    // Check cache for GET requests
    if (request.method === 'GET') {
      const cacheKey = this.getCacheKey(request.endpoint, request.params);
      const cachedData = this.getCachedData(cacheKey);
      if (cachedData) {
        return {
          success: true,
          data: cachedData,
          timestamp: new Date(),
        };
      }
    }

    // Execute request
    const requestPromise = this.makeRequest<T>(request);
    this.requestQueue.set(requestKey, requestPromise as Promise<APIResponse<any>>);

    try {
      const response = await requestPromise;

      // Cache successful GET responses
      if (response.success && request.method === 'GET') {
        const cacheKey = this.getCacheKey(request.endpoint, request.params);
        this.setCachedData(cacheKey, response.data);
      }

      return response;
    } finally {
      this.requestQueue.delete(requestKey);
    }
  }

  async get<T = any>(
    endpoint: string,
    params?: Record<string, any>
  ): Promise<APIResponse<T>> {
    return this.request({
      endpoint,
      method: 'GET',
      params,
    });
  }

  async post<T = any>(endpoint: string, data?: any): Promise<APIResponse<T>> {
    return this.request({
      endpoint,
      method: 'POST',
      data,
    });
  }

  async put<T = any>(endpoint: string, data?: any): Promise<APIResponse<T>> {
    return this.request({
      endpoint,
      method: 'PUT',
      data,
    });
  }

  async patch<T = any>(endpoint: string, data?: any): Promise<APIResponse<T>> {
    return this.request({
      endpoint,
      method: 'PATCH',
      data,
    });
  }

  async delete<T = any>(endpoint: string): Promise<APIResponse<T>> {
    return this.request({
      endpoint,
      method: 'DELETE',
    });
  }

  // Cache management
  clearCache(): void {
    this.cache.clear();
  }

  removeFromCache(key: string): void {
    this.cache.delete(key);
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  // Configuration management
  updateConfig(updates: Partial<APIConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  getConfig(): APIConfig {
    return { ...this.config };
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.get('/health');
      return response.success;
    } catch {
      return false;
    }
  }
}

export const apiService = new APIService();
export default apiService;
