import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { LanguageProvider } from './i18n/Language';
import { App } from './App';
import './styles.css';


createRoot(document.getElementById('root')!).render(
  <StrictMode><LanguageProvider><App /></LanguageProvider></StrictMode>,
);
