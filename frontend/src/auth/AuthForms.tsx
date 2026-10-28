import { useState } from 'react';
import type { FormEvent } from 'react';
import { ApiClient, aborted, message } from '../api/client';
import type { Session } from '../api/client';
import { Field, Notice, PageHeading, passwordHint } from '../components/forms';

export function Login({ api, signedIn, flash }: { api: ApiClient; signedIn: (s: Session) => void; flash: string }) {
  const [username, setUsername] = useState(''); const [password, setPassword] = useState('');
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setBusy(true);
    const secret = password; setPassword('');
    try { signedIn(await api.request<Session>('/auth/login', { username, password: secret }, false)); }
    catch (e) { if (!aborted(e)) setError(message(e)); }
    finally { setBusy(false); }
  }
  return <section className="auth-panel"><PageHeading title="Đăng nhập">Chào mừng bạn trở lại Keemese.</PageHeading>
    {flash && <Notice>{flash}</Notice>}
    <form onSubmit={submit} aria-label="Đăng nhập" aria-busy={busy}>
      {error && <Notice error>{error}</Notice>}
      <Field id="username" label="Tên đăng nhập" autoComplete="username" maxLength={64} required value={username} onChange={e => setUsername(e.target.value)} />
      <Field id="password" label="Mật khẩu" type="password" disabled={busy} autoComplete="current-password" required maxLength={128} value={password} onChange={e => setPassword(e.target.value)} />
      <button className="primary wide" disabled={busy}>{busy ? 'Đang đăng nhập…' : 'Đăng nhập'}</button>
    </form><p className="footnote">Tài khoản do gia sư cung cấp. Nếu cần đặt lại mật khẩu, hãy liên hệ gia sư.</p></section>;
}

export function ChangePassword({ api, mandatory, changed }: { api: ApiClient; mandatory: boolean; changed: () => void }) {
  const [currentPassword, setCurrent] = useState(''); const [newPassword, setNext] = useState('');
  const [confirmation, setConfirmation] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('');
    if (newPassword !== confirmation) { setError('Hai mật khẩu mới chưa khớp. Hãy nhập lại.'); setCurrent(''); setNext(''); setConfirmation(''); return; }
    const body = { currentPassword, newPassword }; setCurrent(''); setNext(''); setConfirmation(''); setBusy(true);
    try { await api.request('/auth/password', body); changed(); }
    catch (e) { if (!aborted(e)) setError(message(e)); }
    finally { setBusy(false); }
  }
  return <section className="form-panel"><PageHeading eyebrow="Bảo vệ tài khoản" title="Đổi mật khẩu">{mandatory ? 'Hãy thay mật khẩu tạm thời trước khi xem tài khoản của bạn.' : 'Chọn mật khẩu mới để bảo vệ tài khoản.'} Bạn sẽ cần đăng nhập lại sau khi đổi.</PageHeading>
    <form onSubmit={submit} aria-label="Đổi mật khẩu" aria-busy={busy}>
      {error && <Notice error>{error}</Notice>}
      <Field id="current-password" label="Mật khẩu hiện tại" type="password" disabled={busy} autoComplete="current-password" required maxLength={128} value={currentPassword} onChange={e => setCurrent(e.target.value)} />
      <Field id="new-password" label="Mật khẩu mới" hint={passwordHint} type="password" disabled={busy} autoComplete="new-password" required minLength={12} maxLength={128} value={newPassword} onChange={e => setNext(e.target.value)} />
      <Field id="confirmation" label="Nhập lại mật khẩu mới" type="password" disabled={busy} autoComplete="new-password" required minLength={12} maxLength={128} value={confirmation} onChange={e => setConfirmation(e.target.value)} />
      <button className="primary" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu mật khẩu mới'}</button>
    </form></section>;
}
