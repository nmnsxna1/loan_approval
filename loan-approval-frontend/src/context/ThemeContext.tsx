import { createContext, useContext, useState, useMemo, useEffect, ReactNode } from 'react';
import { logger } from '../utils/logger';

interface ThemeContextType { dark: boolean; toggle: () => void }

const ThemeContext = createContext<ThemeContextType>({ dark: true, toggle: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') !== 'light');
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
    logger.info(`Theme changed to ${dark ? 'dark' : 'light'}`, {
      file: 'src/context/ThemeContext.tsx',
      function: 'ThemeProvider',
    });
  }, [dark]);
  const value = useMemo(() => ({ dark, toggle: () => setDark((d) => !d) }), [dark]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() { return useContext(ThemeContext); }
