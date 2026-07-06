import axios from 'axios';
import { apiLogger, errorLogger } from '../utils/logger';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

const requestTimestamps = new WeakMap();

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  requestTimestamps.set(config, Date.now());
  apiLogger.info(`API Request: ${config.method?.toUpperCase()} ${config.url}`, {
    file: 'src/api/axios.ts',
    function: 'requestInterceptor',
    url: config.url,
  });
  return config;
});

api.interceptors.response.use(
  (res) => {
    const start = requestTimestamps.get(res.config) || Date.now();
    const duration = Date.now() - start;
    apiLogger.info(`API Response: ${res.config.method?.toUpperCase()} ${res.config.url} -> ${res.status} (${duration}ms)`, {
      file: 'src/api/axios.ts',
      function: 'responseInterceptor',
      url: res.config.url,
    });
    return res;
  },
  (err) => {
    const start = err.config ? requestTimestamps.get(err.config) || Date.now() : Date.now();
    const duration = Date.now() - start;
    const url = err.config?.url || 'unknown';
    if (err.response?.status === 401) {
      errorLogger.warn(`API 401: ${err.config?.method?.toUpperCase()} ${url}`, {
        file: 'src/api/axios.ts',
        function: 'responseErrorInterceptor',
        url,
      });
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    } else {
      errorLogger.error(`API Error: ${err.config?.method?.toUpperCase()} ${url} -> ${err.response?.status || 'NETWORK_ERROR'} (${duration}ms)`, {
        file: 'src/api/axios.ts',
        function: 'responseErrorInterceptor',
        url,
        message: err.message,
        stack: err.stack,
      });
    }
    return Promise.reject(err);
  }
);

export default api;
