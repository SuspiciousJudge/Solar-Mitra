import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ConsumerProvider } from './context/ConsumerContext';
import { DemoProvider } from './context/DemoContext';
import { LanguageProvider } from './context/LanguageContext';
import './fonts';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <LanguageProvider>
        <ConsumerProvider>
          <AuthProvider>
            <DemoProvider>
              <App />
              <Toaster position="top-center" richColors closeButton toastOptions={{ style: { borderRadius: 16 } }} />
            </DemoProvider>
          </AuthProvider>
        </ConsumerProvider>
      </LanguageProvider>
    </BrowserRouter>
  </StrictMode>,
);
