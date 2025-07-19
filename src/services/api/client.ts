import { QueryClient } from '@tanstack/react-query';
import axios, { AxiosInstance } from 'axios';
import { firebase } from '@/services/firebase/config';
import { appConfig } from '@/config/app.config';

// Create axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: appConfig.api.baseUrl,
  timeout: appConfig.api.timeout,
});

// Add auth interceptor
apiClient.interceptors.request.use(async (config) => {
  const token = await firebase.auth.currentUser?.getIdToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Create React Query client with optimized settings
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: (failureCount, error: any) => {
        if (error?.response?.status === 404) return false;
        return failureCount < 3;
      },
    },
    mutations: {
      retry: false,
    },
  },
}); 