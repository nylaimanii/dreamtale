import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { Toaster } from 'react-hot-toast'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#2D2B69',
            color: '#fff',
            borderRadius: '16px',
            fontFamily: 'Nunito, sans-serif',
            fontWeight: '700',
            fontSize: '16px',
          },
        }}
      />
    </AuthProvider>
  </StrictMode>,
)
