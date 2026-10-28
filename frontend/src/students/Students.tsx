import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiClient, aborted, message } from '../api/client';
import type { Profile, Student } from '../api/client';
import { Field, NavLink, Notice, PageHeading, passwordHint } from '../components/forms';

export function StudentList({ api }: { api: ApiClient }) {
  const [page, setPage] = useState(1); const [retry, setRetry] = useState(0);
  const [data, setData] = useState<{ items: Student[]; nextPage: number | null }>(); const [error, setError] = useState('');
  useEffect(() => {
    let active = true; setData(undefined); setError('');
    void api.request<{ items: Student[]; nextPage: number | null }>(`/students?page=${page}`).then(value => { if (active) setData(value); })
      .catch(e => { if (active && !aborted(e)) setError(message(e)); });
    return () => { active = false; };
  }, [api, page, retry]);
  return <><div className="heading-row"><PageHeading eyebrow="Không gian gia sư" title="Học sinh">Quản lý tài khoản và quyền truy cập của học sinh.</PageHeading><NavLink className="button primary" to="/students/new">Thêm học sinh</NavLink></div>
    {error ? <><Notice error>{error}</Notice><button className="secondary" onClick={() => setRetry(x => x + 1)}>Thử lại</button></> : !data ? <Notice>Đang tải danh sách học sinh…</Notice> : data.items.length === 0 ?
      <section className="empty"><h2>Chưa có học sinh</h2><p>Thêm tài khoản đầu tiên để học sinh có thể đăng nhập.</p><NavLink to="/students/new">Thêm học sinh đầu tiên →</NavLink></section> :
      <><ul className="student-list" aria-label="Danh sách học sinh">{data.items.map(student => <li key={student.id}>
        <div className="student-name"><NavLink to={`/students/${student.id}`}>{student.displayName}</NavLink><span className="muted">{student.username}</span></div>
        <span className={`badge ${student.active ? '' : 'inactive'}`}>{student.active ? 'Đang hoạt động' : 'Đã ngừng hoạt động'}</span>
      </li>)}</ul><nav className="pagination" aria-label="Phân trang"><button className="secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Trang trước</button><span>Trang {page}</span><button className="secondary" disabled={!data.nextPage} onClick={() => setPage(p => p + 1)}>Trang sau</button></nav></>}
  </>;
}

export function CreateStudent({ api, created }: { api: ApiClient; created: (student: Student) => void }) {
  const [displayName, setName] = useState(''); const [username, setUsername] = useState(''); const [temporaryPassword, setPassword] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setBusy(true); const body = { displayName, username, temporaryPassword }; setPassword('');
    try { created(await api.request<Student>('/students', body)); }
    catch (e) { if (!aborted(e)) setError(message(e)); }
    finally { setBusy(false); }
  }
  return <section className="form-panel"><NavLink to="/students">← Danh sách học sinh</NavLink><PageHeading title="Thêm học sinh">Chỉ cần tên và thông tin đăng nhập. Học sinh sẽ đổi mật khẩu trong lần đăng nhập đầu tiên.</PageHeading>
    <form onSubmit={submit} aria-label="Thêm học sinh" aria-busy={busy}>
      {error && <Notice error>{error}</Notice>}
      <Field id="display-name" label="Họ và tên" required maxLength={200} autoComplete="off" value={displayName} onChange={e => setName(e.target.value)} />
      <Field id="student-username" label="Tên đăng nhập" hint="3–64 ký tự: chữ không dấu, số, dấu chấm, gạch dưới hoặc gạch ngang." required minLength={3} maxLength={64} pattern="[A-Za-z0-9._\-]+" autoComplete="off" value={username} onChange={e => setUsername(e.target.value)} />
      <Field id="temporary-password" label="Mật khẩu tạm thời" hint={passwordHint} type="password" disabled={busy} autoComplete="new-password" required minLength={12} maxLength={128} value={temporaryPassword} onChange={e => setPassword(e.target.value)} />
      <p className="hint">Tự trao mật khẩu cho học sinh qua kênh riêng. Keemese không gửi hoặc cho xem lại mật khẩu.</p>
      <div className="actions"><button className="primary" disabled={busy}>{busy ? 'Đang tạo…' : 'Tạo tài khoản'}</button><NavLink to="/students">Hủy</NavLink></div>
    </form></section>;
}

export function StudentDetail({ api, id, flash }: { api: ApiClient; id: string; flash: string }) {
  const [data, setData] = useState<Student>(); const [error, setError] = useState(''); const [notice, setNotice] = useState(flash);
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
      setConfirm(false); setNotice(deactivate ? 'Đã ngừng hoạt động tài khoản. Các phiên đăng nhập đã bị thu hồi.' : 'Đã đặt lại mật khẩu. Học sinh cần đăng nhập và đổi mật khẩu tạm thời.');
    } catch (e) { if (!aborted(e)) setError(message(e)); }
    finally { setBusy(false); }
  }
  return <section className="detail-panel"><NavLink className="back-link" to="/students">← Danh sách học sinh</NavLink>
    {error && <Notice error>{error}</Notice>}{notice && <Notice>{notice}</Notice>}
    {!data ? error ? <button className="secondary" onClick={() => setRetry(x => x + 1)}>Tải lại hồ sơ</button> : <Notice>Đang tải hồ sơ…</Notice> : <>
      <PageHeading eyebrow="Hồ sơ tài khoản" title={data.displayName}>{data.username}</PageHeading>
      <p><span className={`badge ${data.active ? '' : 'inactive'}`}>{data.active ? 'Đang hoạt động' : 'Đã ngừng hoạt động'}</span></p>
      {error && <button className="secondary" disabled={busy} onClick={() => { setConfirm(false); setNotice(''); setRetry(x => x + 1); }}>Tải lại hồ sơ</button>}
      {data.active && <><section className="section settings-row"><div className="section-heading"><h2>Đặt lại mật khẩu</h2><p>Thao tác sẽ kết thúc mọi phiên đăng nhập của học sinh.</p></div>
        <form aria-label="Đặt lại mật khẩu" aria-busy={busy} onSubmit={e => { e.preventDefault(); void update(false); }}>
          <Field id="reset-password" label="Mật khẩu tạm thời mới" hint={passwordHint} type="password" disabled={busy} autoComplete="new-password" required minLength={12} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} />
          <button className="secondary" disabled={busy}>{busy ? 'Đang lưu…' : 'Đặt lại mật khẩu'}</button>
        </form></section>
        <section className="section settings-row"><div className="section-heading"><h2>Ngừng hoạt động tài khoản</h2><p>Học sinh sẽ không thể đăng nhập. Hồ sơ vẫn được giữ lại.</p></div><div>
          {confirm ? <div className="confirmation"><p id="deactivate-question">Ngừng hoạt động tài khoản của {data.displayName}?</p><div className="actions">
            <button className="danger" disabled={busy} aria-describedby="deactivate-question" onClick={() => void update(true)}>{busy ? 'Đang lưu…' : 'Xác nhận ngừng hoạt động'}</button>
            <button className="secondary" disabled={busy} onClick={() => setConfirm(false)}>Hủy</button></div></div> : <button className="danger-outline" disabled={busy} onClick={() => setConfirm(true)}>Ngừng hoạt động</button>}</div>
        </section></>}
    </>}
  </section>;
}

export function OwnAccount({ api }: { api: ApiClient }) {
  const [data, setData] = useState<Profile>(); const [error, setError] = useState(''); const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    void api.request<Profile>('/me/profile').then(value => { if (active) setData(value); }).catch(e => { if (active && !aborted(e)) setError(message(e)); });
    return () => { active = false; };
  }, [api, retry]);
  return <section className="form-panel"><PageHeading eyebrow="Không gian học sinh" title="Tài khoản của tôi">Thông tin đăng nhập do gia sư cung cấp.</PageHeading>
    {error ? <><Notice error>{error}</Notice><button className="secondary" onClick={() => { setError(''); setRetry(x => x + 1); }}>Thử lại</button></> : !data ? <Notice>Đang tải tài khoản…</Notice> :
      <><dl className="profile"><dt>Họ và tên</dt><dd>{data.displayName}</dd><dt>Tên đăng nhập</dt><dd>{data.username}</dd></dl><NavLink to="/auth/password">Đổi mật khẩu →</NavLink></>}
  </section>;
}
