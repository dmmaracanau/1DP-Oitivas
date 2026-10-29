import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { authService } from '../services/authService';

export type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      // 1. Tenta carregar do perfil do usuário em cache local (se já tiver preferência salva)
      const cachedUser = authService.getCurrentUser();
      if (cachedUser?.preferredTheme === 'light' || cachedUser?.preferredTheme === 'dark') {
        return cachedUser.preferredTheme;
      }
      // 2. Tenta carregar do localStorage do dispositivo
      const saved = localStorage.getItem('applet_theme');
      if (saved === 'light' || saved === 'dark') {
        return saved;
      }
      return 'dark'; // Padrão institucional escuro
    } catch {
      return 'dark';
    }
  });

  // Flag para evitar loops quando a mudança vier de sincronização remota
  const isSyncingFromRemoteRef = useRef(false);

  // Aplica as classes no DOM (html, body, data-theme, colorScheme)
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
      body.classList.remove('dark');
      body.classList.add('light');
      root.setAttribute('data-theme', 'light');
      root.style.colorScheme = 'light';
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
      body.classList.remove('light');
      body.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
      root.style.colorScheme = 'dark';
    }

    try {
      localStorage.setItem('applet_theme', theme);
    } catch (e) {
      console.warn('Erro ao salvar preferência de tema no localStorage:', e);
    }

    // Se a alteração partiu da interação direta do usuário neste dispositivo, sincroniza na nuvem
    if (!isSyncingFromRemoteRef.current) {
      authService.updateUserThemePreference(theme).catch(() => {});
    }
    isSyncingFromRemoteRef.current = false;
  }, [theme]);

  // Escuta alterações na autenticação e no Firestore em tempo real (para atualizar entre múltiplos dispositivos)
  useEffect(() => {
    const unsub = authService.onAuthChange((currentUser) => {
      if (currentUser?.preferredTheme && (currentUser.preferredTheme === 'light' || currentUser.preferredTheme === 'dark')) {
        if (currentUser.preferredTheme !== theme) {
          isSyncingFromRemoteRef.current = true;
          setThemeState(currentUser.preferredTheme);
        }
      } else if (currentUser?.uid && !currentUser.preferredTheme) {
        // Se o usuário ainda não tiver preferência cadastrada no Firestore, salva a seleção atual como padrão dele
        authService.updateUserThemePreference(theme).catch(() => {});
      }
    });

    return () => unsub();
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark';
    isSyncingFromRemoteRef.current = false;
    setThemeState(nextTheme);
  };

  const setTheme = (newTheme: Theme) => {
    isSyncingFromRemoteRef.current = false;
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === 'dark', toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve ser utilizado dentro de um ThemeProvider');
  }
  return context;
};
