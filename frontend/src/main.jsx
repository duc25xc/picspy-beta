import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.jsx'

import { SettingsProvider } from './context/SettingsContext.jsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 phút
      retry: 1,
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <SettingsProvider>
          <App />
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: 'var(--toaster-bg)',
                color: 'var(--toaster-color)',
                border: '1px solid var(--color-border)',
                borderRadius: '12px',
                fontSize: '14px',
              },
              success: { iconTheme: { primary: '#8b5cf6', secondary: '#fff' }, duration: 3000 },
              error: { iconTheme: { primary: '#ef4444', secondary: '#fff' }, duration: 4000 },
            }}
          />
        </SettingsProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>
)
