export const translations = {
  vi: {
    nav: {
      explore: 'Khám phá',
      search: 'Tìm kiếm',
      pricing: 'Gói đăng ký',
      myPosts: 'Ảnh của tôi',
      upload: 'Tải lên',
      login: 'Đăng nhập',
      register: 'Đăng ký',
    },
    dropdown: {
      profile: 'Hồ sơ cá nhân',
      myPosts: 'Ảnh của tôi',
      theme: 'Giao diện',
      themeLight: 'Sáng',
      themeDark: 'Tối',
      themeSystem: 'Hệ thống',
      language: 'Ngôn ngữ',
      langVi: 'Tiếng Việt',
      langEn: 'Tiếng Anh',
      logout: 'Đăng xuất',
      tokens: 'AI Credits',
    },
    common: {
      loading: 'Đang tải...',
      success: 'Thành công',
      error: 'Lỗi',
    },
  },
  en: {
    nav: {
      explore: 'Explore',
      search: 'Search',
      pricing: 'Pricing',
      myPosts: 'My Photos',
      upload: 'Upload',
      login: 'Login',
      register: 'Register',
    },
    dropdown: {
      profile: 'My Profile',
      myPosts: 'My Photos',
      theme: 'Theme',
      themeLight: 'Light',
      themeDark: 'Dark',
      themeSystem: 'System',
      language: 'Language',
      langVi: 'Vietnamese',
      langEn: 'English',
      logout: 'Log out',
      tokens: 'AI Credits',
    },
    common: {
      loading: 'Loading...',
      success: 'Success',
      error: 'Error',
    },
  },
}

export const useTranslation = (lang) => {
  const currentLang = lang === 'en' ? 'en' : 'vi'
  return translations[currentLang]
}
