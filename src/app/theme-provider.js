'use client'; // Client component for theme handling

import { ThemeProvider, createTheme, responsiveFontSizes } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';

// Define the theme
let theme = createTheme({
  palette: {
    mode: 'light', // Start with light mode
    primary: {
      main: '#1976D2', // Deep blue for buttons/actions (common in SaaS like Slack or Azure)
      light: '#42A5F5',
      dark: '#1565C0',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#607D8B', // Slate gray for secondary elements
      light: '#90A4AE',
      dark: '#455A64',
    },
    error: {
      main: '#D32F2F', // Red for errors
    },
    warning: {
      main: '#FFA000', // Amber for warnings
    },
    info: {
      main: '#0288D1', // Blue for info
    },
    success: {
      main: '#388E3C', // Green for success
    },
    background: {
      default: '#F4F6F8', // Light gray background for app body
      paper: '#FFFFFF', // White for cards/papers
    },
    text: {
      primary: '#212121', // Dark text for readability
      secondary: '#757575', // Muted text
    },
    divider: '#E0E0E0', // Subtle dividers
  },
  typography: {
    fontFamily: ['Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'].join(','),
    h1: {
      fontSize: '2.5rem',
      fontWeight: 500,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 500,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 500,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.43,
    },
    button: {
      textTransform: 'none', // No uppercase for a modern feel
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8, // Rounded corners for components
  },
  shadows: [
    'none',
    '0px 2px 1px -1px rgba(0,0,0,0.2), 0px 1px 1px 0px rgba(0,0,0,0.14), 0px 1px 3px 0px rgba(0,0,0,0.12)', // Subtle elevation
    // ... (MUI defaults for the rest)
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.05)', // Soft shadow for cards
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          color: '#212121',
          boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiTable: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
        },
      },
    },
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
});

// Make fonts responsive
theme = responsiveFontSizes(theme);



// Provider component (use media query for dark mode)
export default function Providers({ children }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline /> {/* Normalize styles */}
      {children}
    </ThemeProvider>
  );
}