import { ContentEditor, ContentLibrary } from './content/Library';
import { LanguageSelector, useLanguage } from './i18n/Language';
import type { MessageKey } from './i18n/messages';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ApiClient, ApiError, aborted, message } from './api/client';
import type { Session, Student } from './api/client';
import { ChangePassword, Login } from './auth/AuthForms';
import { NavLink, Notice, PageHeading, navigate } from './components/forms';
import { CreateStudent, OwnAccount, StudentDetail, StudentList } from './students/Students';

function subscribe(listener: () => void) { window.addEventListener('popstate', listener); return () => window.removeEventListener('popstate', listener); }
const home = (session: Session) => session.mustChangePassword ? '/auth/password' : session.role === 'Tutor' ? '/students' : '/me/account';

export function App() {
  const { t } = useLanguage();
  const path = useSyncExternalStore(subscribe, () => window.location.pathname);
  const [session, setSession] = useState<Session | null>(null);
  const [state, setState] = useState<'checking' | 'ready' | 'failed' | 'signing-out' | 'signout-failed'>('checking');
  const [flash, setFlash] = useState<MessageKey | ''>('');
  const [createdContentId, setCreatedContentId] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const transition = useRef(false); const channel = useRef<BroadcastChannel | null>(null);
  const api = useMemo(() => new ApiClient(() => {
    setSession(null); setCreatedId(null); setCreatedContentId(null); setState('ready'); setFlash("Your session has ended. Please sign in again."); navigate('/login', true);
  }), []);
  const verify = useCallback(async () => {
    if (transition.current) return;
    api.reset(); setSession(null); setCreatedId(null); setCreatedContentId(null); setState('checking');
    try {
      const user = await api.request<Session>('/auth/me', undefined, false); setSession(user); setState('ready');
      const current = window.location.pathname;
      if (current === '/' || current === '/login' || user.mustChangePassword) navigate(home(user), true);
    } catch (e) {
      if (aborted(e)) return;
      if (e instanceof ApiError && e.status === 401) { setSession(null); setState('ready'); navigate('/login', true); }
      else { setSession(null); setState('failed'); }
    }
  }, [api]);
  useEffect(() => {
    void verify();
    const visible = () => { if (document.visibilityState === 'visible') void verify(); };
    window.addEventListener('focus', visible); document.addEventListener('visibilitychange', visible);
    window.addEventListener('pageshow', visible);
    channel.current = new BroadcastChannel('keemese.auth'); channel.current.onmessage = visible;
    return () => { api.reset(); window.removeEventListener('focus', visible); window.removeEventListener('pageshow', visible); document.removeEventListener('visibilitychange', visible); channel.current?.close(); };
  }, [api, verify]);
  useEffect(() => {
    const timer = window.setTimeout(() => { if (document.activeElement?.id !== 'ui-language') document.querySelector<HTMLElement>('h1')?.focus(); }, 0);
    return () => window.clearTimeout(timer);
  }, [path, session?.id, state]);
  useEffect(() => {
    document.title = `${session?.mustChangePassword || path === '/auth/password' ? t('Change password') : session?.role === 'Tutor' ? (path.startsWith('/content') ? t('Content library') : t("Students")) : session ? t("Account") : t("Sign in")} · Keemese`;
  }, [t, path, session?.role, session?.mustChangePassword]);
  const signedIn = (user: Session) => { api.reset(); setCreatedId(null); setCreatedContentId(null); setSession(user); setState('ready'); setFlash(''); navigate(home(user), true); channel.current?.postMessage('changed'); };
  const changed = () => { api.reset(); setSession(null); setCreatedId(null); setCreatedContentId(null); setFlash("Password changed. Sign in with your new password."); navigate('/login', true); channel.current?.postMessage('changed'); };
  async function logout() {
    transition.current = true; api.reset(); setSession(null); setCreatedId(null); setCreatedContentId(null); setFlash(''); setState('signing-out');
    try {
      await api.request('/auth/logout', {}, false); api.reset(); setState('ready'); setFlash("You have signed out safely."); navigate('/login', true); channel.current?.postMessage('changed');
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) { api.reset(); setState('ready'); navigate('/login', true); channel.current?.postMessage('changed'); }
      else if (!aborted(e)) setState('signout-failed');
    } finally { transition.current = false; }
  }
  function created(student: Student) { setCreatedId(student.id); navigate(`/students/${student.id}`, true); }
  let content;
  if (state === 'checking' || state === 'signing-out') content = <Notice>{state === 'checking' ? t("Checking your session…") : t("Signing out…")}</Notice>;
  else if (state === 'signout-failed') content = <section className="form-panel"><PageHeading title={t("Unable to sign out")} /><Notice error>{t("Cannot reach the server to end your session. Please try signing out again.")}</Notice><button className="primary" onClick={() => void logout()}>{t("Try signing out again")}</button></section>;
  else if (state === 'failed') content = <section className="form-panel"><PageHeading title={t("Unable to connect")} /><Notice error>{t(message(null))}</Notice><button className="primary" onClick={() => void verify()}>{t("Try again")}</button></section>;
  else if (!session) content = <Login api={api} signedIn={signedIn} flash={flash} />;
  else if (session.mustChangePassword || path === '/auth/password') content = <ChangePassword api={api} mandatory={session.mustChangePassword} changed={changed} />;
  else if (session.role === 'Tutor' && path === '/content') content = <ContentLibrary api={api} />;
  else if (session.role === 'Tutor' && (path === '/content/new' || /^\/content\/[a-f0-9-]{36}$/i.test(path))) content = <ContentEditor api={api} id={path === '/content/new' ? undefined : path.split('/')[2]} justCreated={createdContentId === path.split('/')[2]} created={id => { setCreatedContentId(id); navigate(`/content/${id}`, true); }} />;
  else if (session.role === 'Tutor' && path === '/students') content = <StudentList api={api} />;
  else if (session.role === 'Tutor' && path === '/students/new') content = <CreateStudent api={api} created={created} />;
  else if (session.role === 'Tutor' && /^\/students\/[a-f0-9-]{36}$/i.test(path)) content = <StudentDetail api={api} id={path.split('/')[2]} flash={createdId === path.split('/')[2] ? "Account created. Share the temporary password with the student privately." : ''} />;
  else if (session.role === 'Student' && path === '/me/account') content = <OwnAccount api={api} />;
  else content = <section className="form-panel"><PageHeading title={t("Unable to open this page")} /><Notice error>{t("This page is unavailable for your account.")}</Notice><NavLink to={home(session)}>{t("Return to your account")}</NavLink></section>;
  return <><a className="skip-link" href="#main">{t("Skip to main content")}</a><header className="app-header"><div className="header-inner">
    <NavLink to={session ? home(session) : '/login'} className="brand"><span aria-hidden="true" className="brand-mark">k</span>Keemese</NavLink>
    {session && state === 'ready' ? <><nav aria-label={t("Account")} className="top-nav">
      {!session.mustChangePassword && <><NavLink to={home(session)}>{session.role === 'Tutor' ? t("Students") : t("My account")}</NavLink>{session.role === 'Tutor' && <NavLink to="/content">{t('Content library')}</NavLink>}<NavLink to="/auth/password">{t("Change password")}</NavLink></>}
      </nav><button className="secondary logout-button" onClick={() => void logout()}>{t("Sign out")}</button></> : <span className="private-label">{t("Private learning workspace")}</span>}
    <LanguageSelector />
  </div></header><main id="main" tabIndex={-1} className={!session ? 'public-main' : ''}><div key={`${session?.id ?? 'public'}:${path}:${state}`}>{content}</div></main>
    <footer>Keemese <span aria-hidden="true">·</span> {t("For you and your students")}</footer></>;
}
