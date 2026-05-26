import axios from 'axios';
import { storage } from '@/lib/storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

api.interceptors.request.use(async (config) => {
  const token = await storage.getItem('session_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
