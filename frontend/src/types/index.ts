export interface User {
  id: string;
  username: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
  confirmPassword?: string; // This is for frontend validation only
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface File {
  id: string;
  filename: string;
  content_type: string;
  size: number;
  user_id: string;
  created_at: string;
}

export interface Folder {
  id: string;
  name: string;
  user_id: string;
  parent_id: string | null;
  created_at: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => void;
  error: string | null;
  clearError: () => void;
  loading: boolean;
}

export interface ThemeContextType {
  darkMode: boolean;
  toggleDarkMode: () => void;
} 