import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiClient, ApiError, aborted, message } from '../api/client';
import { Field, Notice } from '../components/forms';
import { useLanguage } from '../i18n/Language';
import type { MessageKey } from '../i18n/messages';

export type Folder = { id: string; name: string; parentId: string | null; version: number };
export function useFolders(api: ApiClient) {
  const [folders, setFolders] = useState<Folder[]>(); const [error, setError] = useState<MessageKey | ''>(''); const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true; setError('');
    void api.request<Folder[]>('/content/folders').then(rows => { if (active) setFolders(rows); }).catch(e => { if (active && !aborted(e)) setError(message(e)); });
    return () => { active = false; };
  }, [api, revision]);
  return { folders, error, refresh: () => setRevision(x => x + 1) };
}
export function folderPath(folder: Folder, folders: Folder[]) {
  const names = [folder.name]; const seen = new Set([folder.id]); let parent = folder.parentId;
  const byId = new Map(folders.map(x => [x.id, x]));
  while (parent && !seen.has(parent)) {
    seen.add(parent); const ancestor = byId.get(parent); if (!ancestor) break;
    names.unshift(ancestor.name); parent = ancestor.parentId;
  }
  return names.join(' / ');
}
export function FolderSelect({ folders, value, onChange, id, label, disabled = false, filter = false }: {
  folders: Folder[]; value: string; onChange: (value: string) => void; id: string; label: string; disabled?: boolean; filter?: boolean;
}) {
  const { t } = useLanguage();
  return <div className="field folder-select"><label htmlFor={id}>{label}</label><select id={id} value={value} disabled={disabled} onChange={e => onChange(e.target.value)}>
    {filter && <option value="all">{t('All folders')}</option>}<option value={filter ? 'unfiled' : ''}>{filter ? t('Unfiled content') : t('Library root')}</option>
    {value && !['all', 'unfiled'].includes(value) && !folders.some(x => x.id === value) && <option value={value}>{t('Folder unavailable')}</option>}
    {folders.map(folder => <option key={folder.id} value={folder.id}>{folderPath(folder, folders)}</option>)}
  </select></div>;
}
export function FolderPanel({ api, folders, selected, select, changed }: {
  api: ApiClient; folders: Folder[]; selected: string; select: (id: string) => void; changed: () => void;
}) {
  const { t } = useLanguage();
  const [editing, setEditing] = useState<Folder | 'new' | null>(null);
  const [name, setName] = useState(''); const [parent, setParent] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState<MessageKey | ''>(''); const [notice, setNotice] = useState<MessageKey | ''>('');
  const [stale, setStale] = useState(false); const [confirmation, setConfirmation] = useState<'delete' | 'reload' | null>(null);
  const current = folders.find(x => x.id === selected);
  const existing = editing && editing !== 'new' ? editing : null;
  function adopt(folder: Folder | 'new') { setEditing(folder); setName(folder === 'new' ? '' : folder.name); setParent(folder === 'new' ? current?.id ?? '' : folder.parentId ?? ''); setStale(false); setError(''); setNotice(''); setConfirmation(null); }
  function failed(e: unknown) { if (!aborted(e)) { setError(message(e)); setStale(e instanceof ApiError && e.code === 'folder_stale'); } }
  async function save(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const item = await api.request<Folder>(existing ? `/content/folders/${existing.id}` : '/content/folders', { name, parentId: parent || null, ...(existing ? { version: existing.version } : {}) });
      setEditing(null); select(item.id); changed(); setNotice('Folder saved.');
    } catch (e) { failed(e); } finally { setBusy(false); }
  }
  async function remove() {
    if (!existing) return;
    setBusy(true); setError(''); setNotice('');
    try { await api.request(`/content/folders/${existing.id}/delete`, { version: existing.version }); setEditing(null); setConfirmation(null); select('all'); changed(); setNotice('Folder deleted.'); }
    catch (e) { failed(e); } finally { setBusy(false); }
  }
  async function reload() {
    if (!existing) return;
    setBusy(true); setError('');
    try { const rows = await api.request<Folder[]>('/content/folders'); const item = rows.find(x => x.id === existing.id); if (!item) throw new ApiError(404, 'folder_missing'); adopt(item); changed(); }
    catch (e) { failed(e); } finally { setBusy(false); }
  }
  return <section className="folder-panel" aria-label={t('Folder organization')}>
    <div className="folder-toolbar"><FolderSelect folders={folders} id="folder-filter" label={t('Browse folder')} value={selected} onChange={value => { select(value); setNotice(''); }} disabled={!!editing || busy} filter />
      <div className="actions"><button className="secondary" disabled={!!editing || busy} onClick={() => adopt('new')}>{t('New folder')}</button>
        {current && <button className="secondary" disabled={!!editing || busy} onClick={() => adopt(current)}>{t('Edit folder')}</button>}</div></div>
    {notice && <Notice>{t(notice)}</Notice>}{error && <Notice error>{t(error)}</Notice>}
    {editing && <form className="folder-form" aria-label={existing ? t('Edit folder') : t('New folder')} aria-busy={busy} onSubmit={save}>
      <h2>{existing ? t('Edit folder') : t('New folder')}</h2>
      <Field id="folder-name" label={t('Folder name')} hint={t('Required. Up to 100 characters.')} required maxLength={100} value={name} onChange={e => setName(e.target.value)} disabled={busy} />
      <FolderSelect folders={folders.filter(x => x.id !== existing?.id)} id="folder-parent" label={t('Parent folder')} value={parent} onChange={setParent} disabled={busy} />
      <div className="actions"><button className="primary" disabled={busy || stale}>{busy ? t('Saving…') : t('Save folder')}</button><button type="button" className="secondary" disabled={busy} onClick={() => { setEditing(null); setError(''); setConfirmation(null); }}>{t('Cancel')}</button>
        {existing && <button type="button" className="secondary" disabled={busy || stale} onClick={() => setConfirmation('delete')}>{t('Delete folder')}</button>}
        {stale && <button type="button" className="secondary" disabled={busy} onClick={() => setConfirmation('reload')}>{t('Reload folder')}</button>}</div>
      {confirmation && <div className="confirmation"><p>{confirmation === 'delete' ? t('Delete “{name}”? Only empty folders can be deleted.', { name: existing?.name ?? '' }) : t('Reloading discards your unsaved edits. Continue?')}</p><div className="actions">
        <button type="button" className="secondary" disabled={busy || (stale && confirmation === 'delete')} onClick={() => void (confirmation === 'delete' ? remove() : reload())}>{confirmation === 'delete' ? t('Confirm delete') : t('Discard edits and reload')}</button>
        <button type="button" className="secondary" disabled={busy} onClick={() => setConfirmation(null)}>{t('Cancel confirmation')}</button></div></div>}
    </form>}
  </section>;
}
