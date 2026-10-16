import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/600.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { m } from './i18n';
import './styles.css';

// The static index.html carries the same title and description for crawlers; this keeps them tied to the messages file.
document.title = m.meta.title;
document.querySelector('meta[name="description"]')?.setAttribute('content', m.meta.description);
document.documentElement.lang = m.locale.split('-')[0];

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
