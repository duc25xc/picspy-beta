import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
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
            position="top-right"
            visibleToasts={3}
            expand={false}
            style={{ top: '72px', zIndex: 99999 }}
            toastOptions={{
              style: {
                background: 'oklch(14% 0.01 285)',
                color: 'oklch(95% 0.005 285)',
                border: '1px solid oklch(25% 0.01 285)',
                borderRadius: '16px',
                padding: '12px 16px',
                fontSize: '14px',
                fontFamily: 'var(--font-body)',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
              },
              success: {
                duration: 3500,
                style: {
                  background: 'oklch(20% 0.035 145)',
                  color: 'oklch(85% 0.04 145)',
                  borderColor: 'oklch(35% 0.06 145)',
                }
              },
              error: {
                duration: 8500,
                style: {
                  background: 'oklch(20% 0.045 15)',
                  color: 'oklch(85% 0.05 15)',
                  borderColor: 'oklch(35% 0.07 15)',
                }
              },
              warning: {
                duration: 5000,
                style: {
                  background: 'oklch(20% 0.04 70)',
                  color: 'oklch(85% 0.04 70)',
                  borderColor: 'oklch(35% 0.06 70)',
                }
              },
              info: {
                duration: 4000,
                style: {
                  background: 'oklch(20% 0.035 285)',
                  color: 'oklch(85% 0.04 285)',
                  borderColor: 'oklch(35% 0.06 285)',
                }
              }
            }}
          />
        </SettingsProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>
)
