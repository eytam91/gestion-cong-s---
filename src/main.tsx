import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { ConfidentialityProvider } from './context/ConfidentialityContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <ConfidentialityProvider>
        <App />
      </ConfidentialityProvider>
    </AuthProvider>
  </StrictMode>,
);
