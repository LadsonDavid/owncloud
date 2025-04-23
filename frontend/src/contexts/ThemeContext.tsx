import React, { createContext, useState, useContext, useEffect, useMemo, ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme, Theme, PaletteMode } from '@mui/material';
import { blue, purple, grey } from '@mui/material/colors';

interface ThemeContextType {
  darkMode: boolean;
  toggleDarkMode: () => void;
  theme: Theme;
}

const ThemeContext = createContext<ThemeContextType>({
  darkMode: false,
  toggleDarkMode: () => {},
  theme: createTheme(),
});

export const useThemeContext = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Get stored theme preference or use system preference
  const getInitialMode = (): boolean => {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode !== null) {
      return savedMode === 'true';
    }
    // Use system preference as fallback
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  };

  const [darkMode, setDarkMode] = useState<boolean>(getInitialMode);

  // Toggle between light and dark modes
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Save theme preference to localStorage
  useEffect(() => {
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  // Create theme based on current mode
  const theme = useMemo(() => {
    const mode: PaletteMode = darkMode ? 'dark' : 'light';
    
    return createTheme({
      palette: {
        mode,
        primary: {
          main: darkMode ? purple[300] : blue[700],
        },
        secondary: {
          main: darkMode ? blue[200] : purple[500],
        },
        background: {
          default: darkMode ? '#121212' : '#f5f5f5',
          paper: darkMode ? '#1e1e1e' : '#ffffff',
        },
        text: {
          primary: darkMode ? '#ffffff' : '#212121',
          secondary: darkMode ? grey[400] : grey[700],
        },
      },
      shape: {
        borderRadius: 8,
      },
      typography: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        h4: {
          fontWeight: 600,
        },
        h5: {
          fontWeight: 600,
        },
        h6: {
          fontWeight: 600,
        },
      },
      components: {
        MuiAppBar: {
          styleOverrides: {
            root: {
              backgroundColor: darkMode ? '#1a1a1a' : blue[700],
            },
          },
        },
        MuiButton: {
          styleOverrides: {
            root: {
              textTransform: 'none',
              borderRadius: 8,
            },
            contained: {
              boxShadow: 'none',
            },
          },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              borderRadius: 12,
              boxShadow: darkMode 
                ? '0px 3px 6px rgba(0,0,0,0.2)' 
                : '0px 2px 8px rgba(0,0,0,0.08)',
            },
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              borderRadius: 12,
            },
          },
        },
      },
    });
  }, [darkMode]);

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode, theme }}>
      <MuiThemeProvider theme={theme}>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export default ThemeProvider; 