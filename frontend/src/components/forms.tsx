import { useLanguage } from '../i18n/Language';
import { useCallback, useEffect, useRef } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';

export function Notice({ children, error = false }: { children: ReactNode; error?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  // Translation changes must not steal focus from the language selector.
  useEffect(() => { if (error) ref.current?.focus(); }, [error]);
  return <div ref={ref} tabIndex={error ? -1 : undefined} role={error ? 'alert' : 'status'} className={`notice ${error ? 'error' : ''}`}>{children}</div>;
}
export function Field({ label, hint, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  const { t, language } = useLanguage();
  const ref = useRef<HTMLInputElement>(null);
  const validation = useCallback((input: HTMLInputElement) => {
    input.setCustomValidity('');
    if (input.validity.valid) return;
    input.setCustomValidity(input.validity.valueMissing ? t('Please enter {label}.', { label: label.toLocaleLowerCase(language) })
      : input.validity.tooShort ? t('Please enter at least {count} characters.', { count: input.minLength })
      : t('Invalid information. Check the instructions for this field.'));
  }, [t, label, language]);
  useEffect(() => {
    if (ref.current?.validity.customError) validation(ref.current);
  }, [validation]);
  return <div className="field"><label htmlFor={props.id}>{label}</label>
    <input {...props} ref={ref} onInvalid={event => validation(event.currentTarget)}
      onInput={event => event.currentTarget.setCustomValidity('')} aria-describedby={hint ? `${props.id}-hint` : undefined} />
    {hint && <p className="hint" id={`${props.id}-hint`}>{hint}</p>}</div>;
}
export function PageHeading({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return <div className="page-heading">{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1 tabIndex={-1}>{title}</h1>{children && <p className="intro">{children}</p>}</div>;
}
export function navigate(path: string, replace = false) {
  if (replace) window.history.replaceState(null, '', path); else window.history.pushState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
export function NavLink({ to, children, className }: { to: string; children: ReactNode; className?: string }) {
  return <a href={to} aria-current={window.location.pathname === to ? 'page' : undefined} className={className} onClick={event => {
    if (!event.metaKey && !event.ctrlKey && !event.shiftKey && event.button === 0) { event.preventDefault(); navigate(to); }
  }}>{children}</a>;
}
