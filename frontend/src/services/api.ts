import axios from 'axios';
import { LoginCredentials, RegisterCredentials, AuthResponse, File, Folder } from '../types';

// Create axios instance
const api = axios.create({
  baseURL: 'http://127.0.0.1:8000',  // Using IP instead of localhost
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,  // Include credentials in cross-origin requests
  timeout: 10000,  // Set a reasonable timeout
});

// Add request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add logging interceptors for debugging
api.interceptors.request.use(request => {
  console.log('Starting Request', request);
  return request;
}, error => {
  console.error('Request Error:', error);
  return Promise.reject(error);
});

api.interceptors.response.use(response => {
  console.log('Response:', response);
  return response;
}, error => {
  console.error('Response Error:', error);
  // If there's a network error, make it more clear
  if (!error.response) {
    console.error('Network error - check if the backend is running at http://localhost:8000');
  }
  return Promise.reject(error);
});

// Add response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token expired or invalid - clear and redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    // Convert to URLSearchParams for proper form encoding
    const formData = new URLSearchParams();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);
    
    const response = await api.post<AuthResponse>('/login', formData.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  },

  register: async (credentials: RegisterCredentials): Promise<any> => {
    // Use api instance for consistent error handling
    const response = await api.post('/register', credentials);
    return response.data;
  },
};

// Files API
export const filesAPI = {
  uploadFile: async (file: Blob, folderId?: string | null): Promise<any> => {
    console.log('API uploadFile called with folderId:', folderId);
    
    const formData = new FormData();
    formData.append('file', file);
    
    // Add folder_id if provided - ensure it's a string and has a value
    if (folderId) {
      console.log(`Appending folder_id ${folderId} to FormData`);
      formData.append('folder_id', folderId.toString());
    } else {
      console.log('No folder_id provided, file will be uploaded to root');
    }
    
    // Track upload progress if needed
    try {
      // Log FormData without iteration
      console.log('FormData contains file and', folderId ? `folder_id: ${folderId}` : 'no folder_id');
      
      const response = await api.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          // Optional progress handling
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 1)
          );
          console.log(`Upload progress: ${percentCompleted}%`);
        },
      });
      console.log('Upload response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to upload file:', error);
      throw error;
    }
  },

  getFiles: async (folderId?: string | null): Promise<File[]> => {
    const params = folderId ? { folder_id: folderId } : {};
    const response = await api.get<File[]>('/files', { params });
    return response.data;
  },

  downloadFile: async (fileId: string): Promise<Blob> => {
    const response = await api.get(`/download/${fileId}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  deleteFile: async (fileId: string): Promise<void> => {
    await api.delete(`/delete/${fileId}`);
  },
};

// Folders API
export const foldersAPI = {
  createFolder: async (name: string, parentId?: string | null): Promise<Folder> => {
    const response = await api.post<Folder>('/folders', { 
      name, 
      parent_id: parentId || null 
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
  }
};

export default api; 