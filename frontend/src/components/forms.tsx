import { useEffect, useRef } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';

export function Notice({ children, error = false }: { children: ReactNode; error?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (error) ref.current?.focus(); }, [children, error]);
  return <div ref={ref} tabIndex={error ? -1 : undefined} role={error ? 'alert' : 'status'} className={`notice ${error ? 'error' : ''}`}>{children}</div>;
}
export function Field({ label, hint, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return <div className="field"><label htmlFor={props.id}>{label}</label>
    <input {...props} onInvalid={event => {
      const input = event.currentTarget;
      input.setCustomValidity(input.validity.valueMissing ? `Vui lòng nhập ${label.toLocaleLowerCase('vi')}.` : input.validity.tooShort ? `Vui lòng nhập ít nhất ${input.minLength} ký tự.` : 'Thông tin chưa hợp lệ. Hãy kiểm tra hướng dẫn của trường này.');
    }} onInput={event => event.currentTarget.setCustomValidity('')} aria-describedby={hint ? `${props.id}-hint` : undefined} />
    {hint && <p className="hint" id={`${props.id}-hint`}>{hint}</p>}</div>;
}
export const passwordHint = '12–128 ký tự. Có thể dùng dấu cách và tiếng Việt.';
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
