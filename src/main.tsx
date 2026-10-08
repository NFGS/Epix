import '@/shared/lib/zod-jitless';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from '@/app/App';
import { initErrorReporting } from '@/infrastructure/observability/error-reporting';
import { AppErrorBoundary } from '@/presentation/components/AppErrorBoundary';
import '@/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
);

// No bloquea el arranque: sin DSN es un no-op y con DSN importa Sentry en un
// chunk perezoso una vez pintada la app.
void initErrorReporting();
