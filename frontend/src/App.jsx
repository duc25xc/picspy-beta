import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Suspense, lazy, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Header from './components/layout/Header'
import BottomNav from './components/layout/BottomNav'
import ProtectedRoute from './components/auth/ProtectedRoute'
import useAuthStore from './store/auth.store'
import { useSettings } from './context/SettingsContext'

/**
 * Overlay che phủ toàn màn hình khi chuyển theme.
 * Fade-in nhanh → theme đổi tức thì phía sau → fade-out mượt mà.
 * User không bao giờ thấy trạng thái trung gian lẫn lộn màu.
 */
const ThemeTransitionOverlay = () => {
  const { isThemeTransitioning } = useSettings()
  
  return (
    <AnimatePresence>
      {isThemeTransitioning && (
        <motion.div
          key="theme-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ 
            enter: { duration: 0.25, ease: 'easeOut' },
            exit: { duration: 0.35, ease: 'easeInOut' },
            duration: 0.25 
          }}
          className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none"
          style={{ 
            backgroundColor: 'var(--color-surface)',
          }}
        >
          {/* Logo pulse nhẹ nhàng khi chuyển theme */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.1, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-12 h-12 rounded-2xl bg-gradient-brand flex items-center justify-center shadow-2xl"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Lazy load pages để code splitting
const HomePage = lazy(() => import('./pages/HomePage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const UploadPage = lazy(() => import('./pages/UploadPage'))
const MyPostsPage = lazy(() => import('./pages/MyPostsPage'))
const SearchPage = lazy(() => import('./pages/SearchPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const GoogleAuthSuccess = lazy(() => import('./pages/GoogleAuthSuccess'))
const PostDeepLinkPage = lazy(() => import('./pages/PostDeepLinkPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const PostDetailPage = lazy(() => import('./pages/PostDetailPage'))
const PricingPage = lazy(() => import('./pages/PricingPage'))
// PricingComponents.jsx là sub-components, không lazy load riêng — PricingPage import nó

// Skeleton page loading
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 rounded-2xl bg-gradient-brand animate-pulse" />
      <p className="text-white/30 text-sm">Đang tải...</p>
    </div>
  </div>
)

// Animation wrapper cho page transitions
const PageTransition = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
    transition={{ duration: 0.2 }}
  >
    {children}
  </motion.div>
)

// Layout chính (có header + bottom nav)
const MainLayout = ({ children }) => (
  <div className="flex flex-col min-h-screen">
    <Header />
    <main className="flex-1 pb-20 md:pb-0">{children}</main>
    <BottomNav />
  </div>
)

// Layout auth (không có header/nav)
const AuthLayout = ({ children }) => (
  <div className="min-h-screen bg-surface">{children}</div>
)

export default function App() {
  const location = useLocation()
  const refreshMe = useAuthStore((s) => s.refreshMe)
  const isAuth = useAuthStore((s) => !!s.user && !!s.accessToken)

  // Sync user data (coin, stats) mỗi khi user quay lại tab
  useEffect(() => {
    if (!isAuth) return
    const onFocus = () => refreshMe()
    window.addEventListener('focus', onFocus)
    // Cũng refresh ngay khi mount
    refreshMe()
    return () => window.removeEventListener('focus', onFocus)
  }, [isAuth]) // eslint-disable-line

  return (
    <>
      <ThemeTransitionOverlay />
      <AnimatePresence mode="wait">
      <Suspense fallback={<PageLoader />}>
        <Routes location={location} key={location.pathname}>
          {/* ===== AUTH ROUTES ===== */}
          <Route
            path="/login"
            element={
              <AuthLayout>
                <PageTransition>
                  <LoginPage />
                </PageTransition>
              </AuthLayout>
            }
          />
          <Route
            path="/auth/google/success"
            element={
              <AuthLayout>
                <PageTransition>
                  <GoogleAuthSuccess />
                </PageTransition>
              </AuthLayout>
            }
          />
          <Route
            path="/register"
            element={
              <AuthLayout>
                <PageTransition>
                  <RegisterPage />
                </PageTransition>
              </AuthLayout>
            }
          />

          {/* ===== MAIN ROUTES ===== */}
          <Route
            path="/"
            element={
              <MainLayout>
                <PageTransition>
                  <HomePage />
                </PageTransition>
              </MainLayout>
            }
          />
          <Route
            path="/search"
            element={
              <MainLayout>
                <PageTransition>
                  <SearchPage />
                </PageTransition>
              </MainLayout>
            }
          />
          <Route
            path="/profile/:username"
            element={
              <MainLayout>
                <PageTransition>
                  <ProfilePage />
                </PageTransition>
              </MainLayout>
            }
          />
          <Route
            path="/posts/:id"
            element={
              <MainLayout>
                <PageTransition>
                  <PostDetailPage />
                </PageTransition>
              </MainLayout>
            }
          />
          <Route
            path="/pricing"
            element={
              <MainLayout>
                <PageTransition>
                  <PricingPage />
                </PageTransition>
              </MainLayout>
            }
          />

          {/* ===== PROTECTED ROUTES ===== */}
          <Route
            path="/upload"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <PageTransition>
                    <UploadPage />
                  </PageTransition>
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/my-posts"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <PageTransition>
                    <MyPostsPage />
                  </PageTransition>
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <PageTransition>
                    <AdminPage />
                  </PageTransition>
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* ===== FALLBACKS ===== */}
          <Route path="/profile" element={<Navigate to="/" replace />} />
          <Route
            path="*"
            element={
              <AuthLayout>
                <PageTransition>
                  <NotFoundPage />
                </PageTransition>
              </AuthLayout>
            }
          />
        </Routes>
      </Suspense>
    </AnimatePresence>
    </>
  )
}
