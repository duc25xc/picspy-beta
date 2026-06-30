import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../utils/translations';
import api from '../api/api';

// Chuyển HEX sang HSL
function hexToHsl(hex) {
  if (!hex) return { h: 0, s: 0, l: 0 };
  let cleaned = hex.trim().replace('#', '');
  if (cleaned.length === 3) {
    cleaned = cleaned[0] + cleaned[0] + cleaned[1] + cleaned[1] + cleaned[2] + cleaned[2];
  }
  if (cleaned.length !== 6) {
    return { h: 0, s: 0, l: 0 };
  }
  const r = parseInt(cleaned.slice(0, 2), 16) / 255;
  const g = parseInt(cleaned.slice(2, 4), 16) / 255;
  const b = parseInt(cleaned.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) {
      h = (g - b) / d + (g < b ? 6 : 0);
    } else if (max === g) {
      h = (b - r) / d + 2;
    } else if (max === b) {
      h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

// Cập nhật bảng màu CSS variables cho brand từ HEX
// Cập nhật bảng màu CSS variables cho brand từ HEX
export function applyThemeBrandColors(primaryHex, gradientEndHex, opacity = 1, blur = 0, enableGradient = true, shadowStyle = 'soft') {
  const root = document.documentElement;
  if (!primaryHex) return;

  const { h, s } = hexToHsl(primaryHex);

  // Set các component màu chính để các class CSS có thể dùng linh hoạt hsla
  root.style.setProperty('--color-brand-h', h);
  root.style.setProperty('--color-brand-s', `${s}%`);
  root.style.setProperty('--color-brand-opacity', opacity);
  root.style.setProperty('--color-brand-blur', blur > 0 ? `blur(${blur}px)` : 'none');

  // Map độ sáng lý tưởng cho Tailwind shades (50 - 950)
  const lightnessMap = {
    50: 97,
    100: 93,
    200: 85,
    300: 75,
    400: 62,
    500: 52, // màu gốc
    600: 44, // màu hover
    700: 36,
    800: 28,
    900: 20,
    950: 12
  };

  // Set các shade vào CSS variables sử dụng hsla với opacity tùy biến!
  Object.entries(lightnessMap).forEach(([shade, l]) => {
    root.style.setProperty(`--color-brand-${shade}`, `hsla(${h}, ${s}%, ${l}%, ${opacity})`);
  });

  // Set gradient end
  if (enableGradient && gradientEndHex) {
    root.style.setProperty('--color-brand-gradient-end', gradientEndHex);
  } else {
    // If gradient is disabled, make gradient end color match the primary brand color shade (600) so it's a flat solid color with the same opacity!
    root.style.setProperty('--color-brand-gradient-end', `hsla(${h}, ${s}%, 44%, ${opacity})`);
  }

  // Apply shadowStyle CSS variables
  if (shadowStyle === 'glow') {
    root.style.setProperty('--box-shadow-neon-glow', `0 0 20px hsla(${h}, ${s}%, 55%, 0.35)`);
    root.style.setProperty('--color-glass-hover-glow', `hsla(${h}, ${s}%, 55%, 0.25)`);
  } else if (shadowStyle === 'none') {
    root.style.setProperty('--box-shadow-neon-glow', 'none');
    root.style.setProperty('--color-glass-hover-glow', 'transparent');
  } else {
    // soft
    root.style.setProperty('--box-shadow-neon-glow', 'none');
    root.style.setProperty('--color-glass-hover-glow', `hsla(${h}, ${s}%, 52%, 0.08)`);
  }
}

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

  const [isThemeTransitioning, setIsThemeTransitioning] = useState(false);

  const [brandColors, setBrandColors] = useState({
    primaryColor: '#7c3aed',
    gradientColor: '#3b82f6',
    brandOpacity: 1,
    brandBlur: 0,
    enableGradient: true,
    shadowStyle: 'soft',
  });

  const updateBrandColors = (primary, gradient, opacity = 1, blur = 0, enableGradient = true, shadowStyle = 'soft') => {
    setBrandColors({
      primaryColor: primary,
      gradientColor: gradient,
      brandOpacity: opacity,
      brandBlur: blur,
      enableGradient,
      shadowStyle,
    });
    applyThemeBrandColors(primary, gradient, opacity, blur, enableGradient, shadowStyle);
  };

  // Load public settings (colors) on mount
  useEffect(() => {
    api.get('/settings')
      .then(({ data }) => {
        if (data?.primaryColor) {
          updateBrandColors(
            data.primaryColor,
            data.gradientColor,
            data.brandOpacity !== undefined ? data.brandOpacity : 1,
            data.brandBlur !== undefined ? data.brandBlur : 0,
            data.enableGradient !== undefined ? data.enableGradient : true,
            data.shadowStyle || 'soft'
          );
        }
      })
      .catch((err) => {
        console.error('Không tải được cài đặt màu thương hiệu:', err);
      });
  }, []);

  // Ham cap nhat theme: overlay fade-in → đổi theme tức thì → overlay fade-out
  const changeTheme = (newTheme) => {
    if (newTheme === theme) return;
    setIsThemeTransitioning(true);
    
    // Chờ overlay fade-in xong (300ms) rồi đổi theme ngay lập tức phía sau
    setTimeout(() => {
      setThemeState(newTheme);
      localStorage.setItem('picspy_theme', newTheme);
      
      // Chờ 1 frame để DOM repaint xong, rồi fade-out overlay
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsThemeTransitioning(false);
        });
      });
    }, 300);
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
    <SettingsContext.Provider value={{ theme, language, changeTheme, changeLanguage, isThemeTransitioning, t, brandColors, updateBrandColors }}>
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
