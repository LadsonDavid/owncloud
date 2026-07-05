import axios from 'axios';
import { LoginCredentials, RegisterCredentials, AuthResponse, CloudFile, Folder } from '../types';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 10000,
});

// Single request interceptor: attach token + dev logging
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (process.env.NODE_ENV === 'development') {
      console.log('Starting Request', config.method?.toUpperCase(), config.url);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Single response interceptor: dev logging + 401 redirect
api.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Response', response.status, response.config.url);
    }
    return response;
  },
  (error) => {
    if (process.env.NODE_ENV === 'development') {
      if (!error.response) {
        console.error('Network error — is the backend running?');
      } else {
        console.error('Response Error', error.response.status, error.config?.url);
      }
    }
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const formData = new URLSearchParams();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);

    const response = await api.post<AuthResponse>('/login', formData.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return response.data;
  },

  register: async (credentials: RegisterCredentials): Promise<any> => {
    const response = await api.post('/register', credentials);
    return response.data;
  },
};

export const filesAPI = {
  uploadFile: async (file: Blob, folderId?: string | null): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    if (folderId) {
      formData.append('folder_id', folderId.toString());
    }

    const response = await api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (process.env.NODE_ENV === 'development') {
          const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          console.log(`Upload progress: ${percent}%`);
        }
      },
    });
    return response.data;
  },

  getFiles: async (folderId?: string | null): Promise<CloudFile[]> => {
    const params = folderId ? { folder_id: folderId } : {};
    const response = await api.get<CloudFile[]>('/files', { params });
    return response.data;
  },

  downloadFile: async (fileId: string): Promise<Blob> => {
    const response = await api.get(`/download/${fileId}`, { responseType: 'blob' });
    return response.data;
  },

  deleteFile: async (fileId: string): Promise<void> => {
    await api.delete(`/delete/${fileId}`);
  },
};

export const foldersAPI = {
  createFolder: async (name: string, parentId?: string | null): Promise<Folder> => {
    const response = await api.post<Folder>('/folders', {
      name,
      parent_id: parentId || null,
    });
    return response.data;
  },

  getFolders: async (parentId?: string | null): Promise<Folder[]> => {
    const params = parentId ? { parent_id: parentId } : {};
    const response = await api.get<Folder[]>('/folders', { params });
    return response.data;
  },

  deleteFolder: async (folderId: string): Promise<void> => {
    await api.delete(`/folders/${folderId}`);
  },
};

export default api;
