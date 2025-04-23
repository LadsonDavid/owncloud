import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Context Providers
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ThemeWrapper from './theme';

// Components
import Navbar from './components/Navbar';
import ErrorBoundary from './components/ErrorBoundary';

// Pages
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';

// Protected Route Component
const ProtectedRoute: React.FC<{ element: React.ReactNode }> = ({ element }) => {
  const token = localStorage.getItem('token');
  return token ? <>{element}</> : <Navigate to="/login" />;
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ThemeWrapper>
          <AuthProvider>
            <Router>
              <Navbar />
              <Routes>
                <Route path="/login" element={<AuthPage />} />
                <Route path="/dashboard" element={<ProtectedRoute element={<DashboardPage />} />} />
                <Route path="/" element={<Navigate to="/dashboard" />} />
                <Route path="*" element={<Navigate to="/dashboard" />} />
              </Routes>
            </Router>
            <ToastContainer 
              position="bottom-right"
              autoClose={5000}
              hideProgressBar={false}
              newestOnTop
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
            />
          </AuthProvider>
        </ThemeWrapper>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
