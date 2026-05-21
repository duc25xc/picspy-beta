import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../utils/translations';

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
  // Khoi tao state tu localStorage hoac gia tri mac dinh
  const [theme, setThemeState] = useState(() => {
    const savedTheme = localStorage.getItem('picspy_theme');
    return savedTheme || 'system';
  });

  const [language, setLanguageState] = useState(() => {
    const savedLang = localStorage.getItem('picspy_lang');
    return savedLang || 'vi'; // Mac dinh tieng Viet
  });

  // Ham cap nhat theme va luu vao localStorage
  const changeTheme = (newTheme) => {
    setThemeState(newTheme);
    localStorage.setItem('picspy_theme', newTheme);
  };

  // Ham cap nhat ngon ngu va luu vao localStorage
  const changeLanguage = (newLang) => {
    setLanguageState(newLang);
    localStorage.setItem('picspy_lang', newLang);
  };

  // Ap dung theme len the HTML
  useEffect(() => {
    const root = window.document.documentElement;
    
    // Ham kiem tra theme thuc te can apply
    const applyTheme = () => {
      let activeTheme = theme;
      
      if (theme === 'system') {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        activeTheme = systemPrefersDark ? 'dark' : 'light';
      }

      if (activeTheme === 'light') {
        root.classList.add('light');
        root.classList.remove('dark');
        root.style.colorScheme = 'light';
      } else {
        root.classList.add('dark');
        root.classList.remove('light');
        root.style.colorScheme = 'dark';
      }
    };

    applyTheme();

    // Lang nghe thay doi theme he thong neu chon che do 'system'
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemThemeChange = () => {
        applyTheme();
      };
      
      mediaQuery.addEventListener('change', handleSystemThemeChange);
      return () => {
        mediaQuery.removeEventListener('change', handleSystemThemeChange);
      };
    }
  }, [theme]);

  // Object ban dich hien tai
  const t = translations[language] || translations.vi;

  return (
    <SettingsContext.Provider value={{ theme, language, changeTheme, changeLanguage, t }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
