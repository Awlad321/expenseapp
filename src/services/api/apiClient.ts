import axios from 'axios';
import { getToken } from './tokenStorage';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:8080/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!__DEV__) {
      return Promise.reject(error);
    }

    if (error.response) {
      console.error('API error', {
        method: error.config?.method,
        url: `${error.config?.baseURL ?? ''}${error.config?.url ?? ''}`,
        status: error.response.status,
        data: error.response.data,
      });
    } else {
      console.error('API network error', {
        method: error.config?.method,
        url: `${error.config?.baseURL ?? ''}${error.config?.url ?? ''}`,
        message: error.message,
      });
    }
    return Promise.reject(error);
  }
);
