import { createTheme } from '@mui/material';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#2196f3',
    },
    secondary: {
      main: '#f50057',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '@media (forced-colors: active)': {
          '*': {
            borderColor: 'ButtonBorder',
            forcedColorAdjust: 'none',
          },
          'button, [role="button"]': {
            borderColor: 'ButtonBorder',
            background: 'ButtonFace',
            color: 'ButtonText',
          },
          'button:hover, [role="button"]:hover': {
            background: 'Highlight',
            color: 'HighlightText',
          },
        },
      },
    },
  },
}); 