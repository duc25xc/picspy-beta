import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Suspense, lazy, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Header from './components/layout/Header'
import BottomNav from './components/layout/BottomNav'
import AnnouncementBanner from './components/layout/AnnouncementBanner'
import ProtectedRoute from './components/auth/ProtectedRoute'
import useAuthStore from './store/auth.store'
import { useSettings } from './context/SettingsContext'
import ContentLoader from './components/ui/ContentLoader'
import NotificationPanel from './components/common/NotificationPanel'
import useNotificationStore from './store/notification.store'

/**
 * Overlay che phủ toàn màn hình khi chuyển theme.
 * Luôn dùng nền tối cố định bất kể theme sáng/tối.
 * Fade-in nhanh → theme đổi tức thì phía sau → fade-out mượt mà.
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
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="fixed inset-0 z-[99998] flex items-center justify-center pointer-events-none"
          style={{ backgroundColor: '#0c0c0e' }}
        >
          {/* Radial glow */}
          <div
            className="absolute w-[280px] h-[280px] rounded-full blur-[110px] pointer-events-none"
            style={{
              backgroundColor:
                'hsla(var(--color-brand-h), var(--color-brand-s), 50%, 0.2)',
            }}
          />
          {/* Logo — đồng bộ với globalLoaderType do admin cài đặt */}
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.05, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 flex items-center justify-center"
          >
            <ContentLoader size="lg" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Lazy load pages để code splitting
const HomePage = lazy(() => import('./pages/HomePage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const UploadPage = lazy(() => import('./pages/UploadPage'))
const MyPostsPage = lazy(() => import('./pages/MyPostsPage'))
const SearchPage = lazy(() => import('./pages/SearchPage'))
const CategoriesPage = lazy(() => import('./pages/CategoriesPage'))
const ExplorePage = lazy(() => import('./pages/ExplorePage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const GoogleAuthSuccess = lazy(() => import('./pages/GoogleAuthSuccess'))
const PostDeepLinkPage = lazy(() => import('./pages/PostDeepLinkPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const PostDetailPage = lazy(() => import('./pages/PostDetailPage'))
const PricingPage = lazy(() => import('./pages/PricingPage'))
const StudioPage = lazy(() => import('./pages/StudioPage'))
// PricingComponents.jsx là sub-components, không lazy load riêng — PricingPage import nó

// Animation wrapper cho page transitions
const PageTransition = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.96 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.96 }}
    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
  >
    {children}
  </motion.div>
)

// Layout chính (có header + bottom nav)
const MainLayout = ({ children }) => (
  <div className="flex flex-col min-h-screen">
    <AnnouncementBanner />
    <Header />
    <main className="flex-1 pb-20 md:pb-0">
      {children}
    </main>
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
  const userId = useAuthStore((s) => s.user?._id ?? null)
  const accessToken = useAuthStore((s) => s.accessToken)
  const initSocket = useNotificationStore((s) => s.initSocket)
  const disconnectSocket = useNotificationStore((s) => s.disconnectSocket)

  // Khởi tạo kết nối socket.io real-time
  useEffect(() => {
    if (accessToken) {
      initSocket(accessToken)
    } else {
      disconnectSocket()
    }
    return () => disconnectSocket()
  }, [accessToken, initSocket, disconnectSocket])

  // Sync user data (coin, stats) mỗi khi userId thay đổi (kể cả khi switch account)
  // Dùng userId thay vì isAuth để effect re-run khi đăng nhập tài khoản khác
  // mà không cần logout trước
  useEffect(() => {
    if (!userId) return
    const onFocus = () => refreshMe()
    window.addEventListener('focus', onFocus)
    refreshMe()
    return () => window.removeEventListener('focus', onFocus)
  }, [userId]) // eslint-disable-line

  return (
    <>
      <ThemeTransitionOverlay />
      <NotificationPanel />
      <AnimatePresence mode="wait">
        {/* Suspense fallback = null: HomePage tự quản lý splash loader qua createPortal */}
        <Suspense fallback={null}>
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
              path="/forgot-password"
              element={
                <AuthLayout>
                  <PageTransition>
                    <ForgotPasswordPage />
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
              path="/categories"
              element={
                <MainLayout>
                  <PageTransition>
                    <CategoriesPage />
                  </PageTransition>
                </MainLayout>
              }
            />
            <Route
              path="/explore"
              element={
                <MainLayout>
                  <PageTransition>
                    <ExplorePage />
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

            <Route
              path="/studio"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <PageTransition>
                      <StudioPage />
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
