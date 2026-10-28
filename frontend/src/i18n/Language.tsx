import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { en, vi } from './messages';
import type { MessageKey } from './messages';

export type Language = 'vi' | 'en';
const preferenceKey = 'keemese.uiLanguage';
function initialLanguage(): Language {
  try { return localStorage.getItem(preferenceKey) === 'en' ? 'en' : 'vi'; }
  catch { return 'vi'; }
}
export function translate(language: Language, key: MessageKey | '', parameters: Record<string, string | number> = {}) {
  if (!key) return '';
  const template = (language === 'vi' ? vi : en)[key];
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) => String(parameters[name] ?? placeholder));
}
const LanguageContext = createContext<{
  language: Language; setLanguage: (language: Language) => void;
  t: (key: MessageKey | '', parameters?: Record<string, string | number>) => string;
} | null>(null);
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, updateLanguage] = useState<Language>(initialLanguage);
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  function setLanguage(value: Language) {
    updateLanguage(value);
    try { localStorage.setItem(preferenceKey, value); } catch { /* Memory selection remains usable. */ }
  }
  const t = useCallback((key: MessageKey | '', parameters?: Record<string, string | number>) => translate(language, key, parameters), [language]);
  return <LanguageContext value={{ language, setLanguage, t }}>{children}</LanguageContext>;
}
export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error('LanguageProvider is required');
  return value;
}
export function LanguageSelector() {
  const { language, setLanguage, t } = useLanguage();
  return <div className="language-selector"><label htmlFor="ui-language">{t('Language')}</label>
    <select id="ui-language" value={language} onChange={event => setLanguage(event.target.value === 'en' ? 'en' : 'vi')}>
      <option value="vi" lang="vi">Tiếng Việt</option><option value="en" lang="en">English</option>
    </select></div>;
}
