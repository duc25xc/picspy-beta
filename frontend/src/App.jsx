import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Header from './components/layout/Header'
import BottomNav from './components/layout/BottomNav'
import ProtectedRoute from './components/auth/ProtectedRoute'

// Lazy load pages để code splitting
const HomePage       = lazy(() => import('./pages/HomePage'))
const HomePageV2       = lazy(() => import('./pages/HomePageV2'))
const LoginPage      = lazy(() => import('./pages/LoginPage'))
const RegisterPage   = lazy(() => import('./pages/RegisterPage'))
const ProfilePage    = lazy(() => import('./pages/ProfilePage'))
const UploadPage     = lazy(() => import('./pages/UploadPage'))
const SearchPage     = lazy(() => import('./pages/SearchPage'))
const NotFoundPage   = lazy(() => import('./pages/NotFoundPage'))

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
    <main className="flex-1 pb-20 md:pb-0">
      {children}
    </main>
    <BottomNav />
  </div>
)

// Layout auth (không có header/nav)
const AuthLayout = ({ children }) => (
  <div className="min-h-screen bg-surface">
    {children}
  </div>
)

export default function App() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<PageLoader />}>
        <Routes location={location} key={location.pathname}>
          {/* ===== AUTH ROUTES ===== */}
          <Route
            path="/login"
            element={
              <AuthLayout>
                <PageTransition><LoginPage /></PageTransition>
              </AuthLayout>
            }
          />
          <Route
            path="/register"
            element={
              <AuthLayout>
                <PageTransition><RegisterPage /></PageTransition>
              </AuthLayout>
            }
          />

          {/* ===== MAIN ROUTES ===== */}
          <Route
            path="/"
            element={
              <MainLayout>
                <PageTransition><HomePage /></PageTransition>
              </MainLayout>
            }
          />
          <Route
            path="/v2"
            element={
              <MainLayout>
                <PageTransition><HomePageV2 /></PageTransition>
              </MainLayout>
            }
          />
          <Route
            path="/search"
            element={
              <MainLayout>
                <PageTransition><SearchPage /></PageTransition>
              </MainLayout>
            }
          />
          <Route
            path="/profile/:username"
            element={
              <MainLayout>
                <PageTransition><ProfilePage /></PageTransition>
              </MainLayout>
            }
          />

          {/* ===== PROTECTED ROUTES ===== */}
          <Route
            path="/upload"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <PageTransition><UploadPage /></PageTransition>
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* ===== FALLBACKS ===== */}
          <Route path="/profile" element={<Navigate to="/" replace />} />
          <Route path="*" element={<AuthLayout><PageTransition><NotFoundPage /></PageTransition></AuthLayout>} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  )
}
