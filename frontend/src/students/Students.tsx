import { useLanguage } from '../i18n/Language';
import type { MessageKey } from '../i18n/messages';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiClient, aborted, message } from '../api/client';
import type { Profile, Student } from '../api/client';
import { Field, NavLink, Notice, PageHeading } from '../components/forms';

export function StudentList({ api }: { api: ApiClient }) {
  const { t } = useLanguage();
  const [page, setPage] = useState(1); const [retry, setRetry] = useState(0);
  const [data, setData] = useState<{ items: Student[]; nextPage: number | null }>(); const [error, setError] = useState<MessageKey | ''>('');
  useEffect(() => {
    let active = true; setData(undefined); setError('');
    void api.request<{ items: Student[]; nextPage: number | null }>(`/students?page=${page}`).then(value => { if (active) setData(value); })
      .catch(e => { if (active && !aborted(e)) setError(message(e)); });
    return () => { active = false; };
  }, [api, page, retry]);
  return <><div className="heading-row"><PageHeading eyebrow={t("Tutor workspace")} title={t("Students")}>{t("Manage student accounts and access.")}</PageHeading><NavLink className="button primary" to="/students/new">{t("Add student")}</NavLink></div>
    {error ? <><Notice error>{t(error)}</Notice><button className="secondary" onClick={() => setRetry(x => x + 1)}>{t("Try again")}</button></> : !data ? <Notice>{t("Loading students…")}</Notice> : data.items.length === 0 ?
      <section className="empty"><h2>{t("No students yet")}</h2><p>{t("Add the first account so a student can sign in.")}</p><NavLink to="/students/new">{t("Add your first student →")}</NavLink></section> :
      <><ul className="student-list" aria-label={t("Student list")}>{data.items.map(student => <li key={student.id}>
        <div className="student-name"><NavLink to={`/students/${student.id}`}>{student.displayName}</NavLink><span className="muted">{student.username}</span></div>
        <span className={`badge ${student.active ? '' : 'inactive'}`}>{student.active ? t("Active") : t("Inactive")}</span>
      </li>)}</ul><nav className="pagination" aria-label={t("Pagination")}><button className="secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>{t("Previous page")}</button><span>{t('Page {page}', { page })}</span><button className="secondary" disabled={!data.nextPage} onClick={() => setPage(p => p + 1)}>{t("Next page")}</button></nav></>}
  </>;
}

export function CreateStudent({ api, created }: { api: ApiClient; created: (student: Student) => void }) {
  const { t } = useLanguage();
  const [displayName, setName] = useState(''); const [username, setUsername] = useState(''); const [temporaryPassword, setPassword] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState<MessageKey | ''>('');
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setBusy(true); const body = { displayName, username, temporaryPassword }; setPassword('');
    try { created(await api.request<Student>('/students', body)); }
    catch (e) { if (!aborted(e)) setError(message(e)); }
    finally { setBusy(false); }
  }
  return <section className="form-panel"><NavLink to="/students">{t("← Student list")}</NavLink><PageHeading title={t("Add student")}>{t("Start with a name and sign-in details. The student will change their password at first sign-in.")}</PageHeading>
    <form onSubmit={submit} aria-label={t("Add student")} aria-busy={busy}>
      {error && <Notice error>{t(error)}</Notice>}
      <Field id="display-name" label={t("Full name")} required maxLength={200} autoComplete="off" value={displayName} onChange={e => setName(e.target.value)} />
      <Field id="student-username" label={t("Username")} hint={t("3–64 characters: unaccented letters, numbers, periods, underscores or hyphens.")} required minLength={3} maxLength={64} pattern="[A-Za-z0-9._\-]+" autoComplete="off" value={username} onChange={e => setUsername(e.target.value)} />
      <Field id="temporary-password" label={t("Temporary password")} hint={t('12–128 characters. Spaces and Vietnamese are supported.')} type="password" disabled={busy} autoComplete="new-password" required minLength={12} maxLength={128} value={temporaryPassword} onChange={e => setPassword(e.target.value)} />
      <p className="hint">{t("Share the password with the student privately. Keemese does not send or reveal passwords later.")}</p>
      <div className="actions"><button className="primary" disabled={busy}>{busy ? t("Creating…") : t("Create account")}</button><NavLink to="/students">{t("Cancel")}</NavLink></div>
    </form></section>;
}

export function StudentDetail({ api, id, flash }: { api: ApiClient; id: string; flash: MessageKey | '' }) {
  const { t } = useLanguage();
  const [data, setData] = useState<Student>(); const [error, setError] = useState<MessageKey | ''>(''); const [notice, setNotice] = useState(flash);
  const [password, setPassword] = useState(''); const [busy, setBusy] = useState(false); const [confirm, setConfirm] = useState(false); const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true; setData(undefined); setError('');
    void api.request<Student>(`/students/${id}`).then(value => { if (active) setData(value); }).catch(e => { if (active && !aborted(e)) setError(message(e)); });
    return () => { active = false; };
  }, [api, id, retry]);
  async function update(deactivate: boolean) {
    if (!data) return;
    setError(''); setNotice(''); setBusy(true); const temporaryPassword = password; setPassword('');
    try {
      setData(await api.request<Student>(`/students/${id}/${deactivate ? 'deactivate' : 'credentials/reset'}`, { version: data.version, ...(deactivate ? {} : { temporaryPassword }) }));
      setConfirm(false); setNotice(deactivate ? "Account deactivated. All sign-in sessions have been revoked." : "Password reset. The student must sign in and change the temporary password.");
    } catch (e) { if (!aborted(e)) setError(message(e)); }
    finally { setBusy(false); }
  }
  return <section className="detail-panel"><NavLink className="back-link" to="/students">{t("← Student list")}</NavLink>
    {error && <Notice error>{t(error)}</Notice>}{notice && <Notice>{t(notice)}</Notice>}
    {!data ? error ? <button className="secondary" onClick={() => setRetry(x => x + 1)}>{t("Reload profile")}</button> : <Notice>{t("Loading profile…")}</Notice> : <>
      <PageHeading eyebrow={t("Account profile")} title={data.displayName}>{data.username}</PageHeading>
      <p><span className={`badge ${data.active ? '' : 'inactive'}`}>{data.active ? t("Active") : t("Inactive")}</span></p>
      {error && <button className="secondary" disabled={busy} onClick={() => { setConfirm(false); setNotice(''); setRetry(x => x + 1); }}>{t("Reload profile")}</button>}
      {data.active && <><section className="section settings-row"><div className="section-heading"><h2>{t("Reset password")}</h2><p>{t("This ends all of the student's sign-in sessions.")}</p></div>
        <form aria-label={t("Reset password")} aria-busy={busy} onSubmit={e => { e.preventDefault(); void update(false); }}>
          <Field id="reset-password" label={t("New temporary password")} hint={t('12–128 characters. Spaces and Vietnamese are supported.')} type="password" disabled={busy} autoComplete="new-password" required minLength={12} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} />
          <button className="secondary" disabled={busy}>{busy ? t("Saving…") : t("Reset password")}</button>
        </form></section>
        <section className="section settings-row"><div className="section-heading"><h2>{t("Deactivate account")}</h2><p>{t("The student will no longer be able to sign in. Their profile will be kept.")}</p></div><div>
          {confirm ? <div className="confirmation"><p id="deactivate-question">{t('Deactivate the account for {name}?', { name: data.displayName })}</p><div className="actions">
            <button className="danger" disabled={busy} aria-describedby="deactivate-question" onClick={() => void update(true)}>{busy ? t("Saving…") : t("Confirm deactivation")}</button>
            <button className="secondary" disabled={busy} onClick={() => setConfirm(false)}>{t("Cancel")}</button></div></div> : <button className="danger-outline" disabled={busy} onClick={() => setConfirm(true)}>{t("Deactivate")}</button>}</div>
        </section></>}
    </>}
  </section>;
}

export function OwnAccount({ api }: { api: ApiClient }) {
  const { t } = useLanguage();
  const [data, setData] = useState<Profile>(); const [error, setError] = useState<MessageKey | ''>(''); const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    void api.request<Profile>('/me/profile').then(value => { if (active) setData(value); }).catch(e => { if (active && !aborted(e)) setError(message(e)); });
    return () => { active = false; };
  }, [api, retry]);
  return <section className="form-panel"><PageHeading eyebrow={t("Student workspace")} title={t("My account")}>{t("Sign-in information provided by your tutor.")}</PageHeading>
    {error ? <><Notice error>{t(error)}</Notice><button className="secondary" onClick={() => { setError(''); setRetry(x => x + 1); }}>{t("Try again")}</button></> : !data ? <Notice>{t("Loading account…")}</Notice> :
      <><dl className="profile"><dt>{t("Full name")}</dt><dd>{data.displayName}</dd><dt>{t("Username")}</dt><dd>{data.username}</dd></dl><NavLink to="/auth/password">{t("Change password →")}</NavLink></>}
  </section>;
}
