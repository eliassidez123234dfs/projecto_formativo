import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css';
import { installGlobalErrorHandlers } from './utils/logger';
import { restoreSession } from './services/authService';

installGlobalErrorHandlers();

// Restaurar sesión al arrancar (regenera access token desde refresh token)
restoreSession().finally(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
