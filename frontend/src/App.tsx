import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ApiClient, ApiError, aborted, message } from './api/client';
import type { Session, Student } from './api/client';
import { ChangePassword, Login } from './auth/AuthForms';
import { NavLink, Notice, PageHeading, navigate } from './components/forms';
import { CreateStudent, OwnAccount, StudentDetail, StudentList } from './students/Students';

function subscribe(listener: () => void) { window.addEventListener('popstate', listener); return () => window.removeEventListener('popstate', listener); }
const home = (session: Session) => session.mustChangePassword ? '/auth/password' : session.role === 'Tutor' ? '/students' : '/me/account';

export function App() {
  const path = useSyncExternalStore(subscribe, () => window.location.pathname);
  const [session, setSession] = useState<Session | null>(null);
  const [state, setState] = useState<'checking' | 'ready' | 'failed' | 'signing-out' | 'signout-failed'>('checking');
  const [flash, setFlash] = useState('');
  const [createdId, setCreatedId] = useState<string | null>(null);
  const transition = useRef(false); const channel = useRef<BroadcastChannel | null>(null);
  const api = useMemo(() => new ApiClient(() => {
    setSession(null); setCreatedId(null); setState('ready'); setFlash('Phiên đăng nhập đã kết thúc. Vui lòng đăng nhập lại.'); navigate('/login', true);
  }), []);
  const verify = useCallback(async () => {
    if (transition.current) return;
    api.reset(); setSession(null); setCreatedId(null); setState('checking');
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
    document.title = `${session?.role === 'Tutor' ? 'Học sinh' : session ? 'Tài khoản' : 'Đăng nhập'} · Keemese`;
    const timer = window.setTimeout(() => document.querySelector<HTMLElement>('h1')?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [path, session?.id, state]);
  const signedIn = (user: Session) => { api.reset(); setCreatedId(null); setSession(user); setState('ready'); setFlash(''); navigate(home(user), true); channel.current?.postMessage('changed'); };
  const changed = () => { api.reset(); setSession(null); setCreatedId(null); setFlash('Đã đổi mật khẩu. Hãy đăng nhập bằng mật khẩu mới.'); navigate('/login', true); channel.current?.postMessage('changed'); };
  async function logout() {
    transition.current = true; api.reset(); setSession(null); setCreatedId(null); setFlash(''); setState('signing-out');
    try {
      await api.request('/auth/logout', {}, false); api.reset(); setState('ready'); setFlash('Đã đăng xuất an toàn.'); navigate('/login', true); channel.current?.postMessage('changed');
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) { api.reset(); setState('ready'); navigate('/login', true); channel.current?.postMessage('changed'); }
      else if (!aborted(e)) setState('signout-failed');
    } finally { transition.current = false; }
  }
  function created(student: Student) { setCreatedId(student.id); navigate(`/students/${student.id}`, true); }
  let content;
  if (state === 'checking' || state === 'signing-out') content = <Notice>{state === 'checking' ? 'Đang kiểm tra phiên đăng nhập…' : 'Đang đăng xuất…'}</Notice>;
  else if (state === 'signout-failed') content = <section className="form-panel"><PageHeading title="Chưa thể đăng xuất" /><Notice error>Không kết nối được máy chủ để kết thúc phiên đăng nhập. Hãy thử đăng xuất lại.</Notice><button className="primary" onClick={() => void logout()}>Thử đăng xuất lại</button></section>;
  else if (state === 'failed') content = <section className="form-panel"><PageHeading title="Chưa thể kết nối" /><Notice error>{message(null)}</Notice><button className="primary" onClick={() => void verify()}>Thử lại</button></section>;
  else if (!session) content = <Login api={api} signedIn={signedIn} flash={flash} />;
  else if (session.mustChangePassword || path === '/auth/password') content = <ChangePassword api={api} mandatory={session.mustChangePassword} changed={changed} />;
  else if (session.role === 'Tutor' && path === '/students') content = <StudentList api={api} />;
  else if (session.role === 'Tutor' && path === '/students/new') content = <CreateStudent api={api} created={created} />;
  else if (session.role === 'Tutor' && /^\/students\/[a-f0-9-]{36}$/i.test(path)) content = <StudentDetail api={api} id={path.split('/')[2]} flash={createdId === path.split('/')[2] ? 'Đã tạo tài khoản. Hãy trao mật khẩu tạm thời cho học sinh qua kênh riêng.' : ''} />;
  else if (session.role === 'Student' && path === '/me/account') content = <OwnAccount api={api} />;
  else content = <section className="form-panel"><PageHeading title="Không thể mở trang này" /><Notice error>Trang này không có sẵn cho tài khoản của bạn.</Notice><NavLink to={home(session)}>Quay về tài khoản</NavLink></section>;
  return <><a className="skip-link" href="#main">Đến nội dung chính</a><header className="app-header"><div className="header-inner">
    <NavLink to={session ? home(session) : '/login'} className="brand"><span aria-hidden="true" className="brand-mark">k</span>Keemese</NavLink>
    {session && state === 'ready' ? <><nav aria-label="Tài khoản" className="top-nav">
      {!session.mustChangePassword && <><NavLink to={home(session)}>{session.role === 'Tutor' ? 'Học sinh' : 'Tài khoản của tôi'}</NavLink><NavLink to="/auth/password">Đổi mật khẩu</NavLink></>}
      </nav><button className="secondary logout-button" onClick={() => void logout()}>Đăng xuất</button></> : <span className="private-label">Không gian học tập riêng</span>}
  </div></header><main id="main" tabIndex={-1} className={!session ? 'public-main' : ''}><div key={`${session?.id ?? 'public'}:${path}:${state}`}>{content}</div></main>
    <footer>Keemese <span aria-hidden="true">·</span> Dành cho gia sư và học sinh của bạn</footer></>;
}
