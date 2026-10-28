import { useLanguage } from '../i18n/Language';
import type { MessageKey } from '../i18n/messages';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { ApiClient, aborted, message } from '../api/client';
import type { Session } from '../api/client';
import { Field, Notice, PageHeading } from '../components/forms';

export function Login({ api, signedIn, flash }: { api: ApiClient; signedIn: (s: Session) => void; flash: MessageKey | '' }) {
  const { t } = useLanguage();
  const [username, setUsername] = useState(''); const [password, setPassword] = useState('');
  const [error, setError] = useState<MessageKey | ''>(''); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setBusy(true);
    const secret = password; setPassword('');
    try { signedIn(await api.request<Session>('/auth/login', { username, password: secret }, false)); }
    catch (e) { if (!aborted(e)) setError(message(e)); }
    finally { setBusy(false); }
  }
  return <section className="auth-panel"><PageHeading title={t("Sign in")}>{t("Welcome back to Keemese.")}</PageHeading>
    {flash && <Notice>{t(flash)}</Notice>}
    <form onSubmit={submit} aria-label={t("Sign in")} aria-busy={busy}>
      {error && <Notice error>{t(error)}</Notice>}
      <Field id="username" label={t("Username")} autoComplete="username" maxLength={64} required value={username} onChange={e => setUsername(e.target.value)} />
      <Field id="password" label={t("Password")} type="password" disabled={busy} autoComplete="current-password" required maxLength={128} value={password} onChange={e => setPassword(e.target.value)} />
      <button className="primary wide" disabled={busy}>{busy ? t("Signing in…") : t("Sign in")}</button>
    </form><p className="footnote">{t("Your tutor provides your account. Contact your tutor if you need a password reset.")}</p></section>;
}

export function ChangePassword({ api, mandatory, changed }: { api: ApiClient; mandatory: boolean; changed: () => void }) {
  const { t } = useLanguage();
  const [currentPassword, setCurrent] = useState(''); const [newPassword, setNext] = useState('');
  const [confirmation, setConfirmation] = useState(''); const [error, setError] = useState<MessageKey | ''>(''); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('');
    if (newPassword !== confirmation) { setError("The new passwords do not match. Please enter them again."); setCurrent(''); setNext(''); setConfirmation(''); return; }
    const body = { currentPassword, newPassword }; setCurrent(''); setNext(''); setConfirmation(''); setBusy(true);
    try { await api.request('/auth/password', body); changed(); }
    catch (e) { if (!aborted(e)) setError(message(e)); }
    finally { setBusy(false); }
  }
  return <section className="form-panel"><PageHeading eyebrow={t("Account security")} title={t("Change password")}>{mandatory ? t("Change your temporary password before viewing your account. You will need to sign in again afterwards.") : t("Choose a new password to protect your account. You will need to sign in again afterwards.")}</PageHeading>
    <form onSubmit={submit} aria-label={t("Change password")} aria-busy={busy}>
      {error && <Notice error>{t(error)}</Notice>}
      <Field id="current-password" label={t("Current password")} type="password" disabled={busy} autoComplete="current-password" required maxLength={128} value={currentPassword} onChange={e => setCurrent(e.target.value)} />
      <Field id="new-password" label={t("New password")} hint={t('12–128 characters. Spaces and Vietnamese are supported.')} type="password" disabled={busy} autoComplete="new-password" required minLength={12} maxLength={128} value={newPassword} onChange={e => setNext(e.target.value)} />
      <Field id="confirmation" label={t("Confirm new password")} type="password" disabled={busy} autoComplete="new-password" required minLength={12} maxLength={128} value={confirmation} onChange={e => setConfirmation(e.target.value)} />
      <button className="primary" disabled={busy}>{busy ? t("Saving…") : t("Save new password")}</button>
    </form></section>;
}
