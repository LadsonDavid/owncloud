import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Button,
  Box,
  useMediaQuery,
  useTheme as useMuiTheme,
  keyframes,
} from '@mui/material';
import {
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  Menu as MenuIcon,
  AutoAwesome as AmazingIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useThemeContext } from '../contexts/ThemeContext';

const Navbar: React.FC = () => {
  const { isAuthenticated, logout, user } = useAuth();
  const { darkMode, toggleDarkMode, theme } = useThemeContext();
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));

  // Define the pulse animation
  const pulse = keyframes`
    0% { transform: scale(1); }
    50% { transform: scale(1.2); }
    100% { transform: scale(1); }
  `;

  return (
    <AppBar position="static" elevation={1}>
      <Toolbar>
        {isMobile && (
          <IconButton edge="start" color="inherit" aria-label="menu" sx={{ mr: 2 }}>
            <MenuIcon />
          </IconButton>
        )}

        <AmazingIcon 
          sx={{ 
            mr: 1, 
            animation: `${pulse} 2s infinite`,
            color: '#FFD700' // Gold color for the icon
          }} 
        />
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Malwares
        </Typography>

        <IconButton
          color="inherit"
          onClick={toggleDarkMode}
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
        </IconButton>

        {isAuthenticated ? (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {!isMobile && (
              <Typography variant="body1" sx={{ mr: 2 }}>
                {user?.username}
              </Typography>
            )}
            <Button color="inherit" onClick={logout}>
              Logout
            </Button>
          </Box>
        ) : (
          <Button color="inherit">Login</Button>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navbar; 