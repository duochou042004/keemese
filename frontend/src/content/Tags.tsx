import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiClient, ApiError, aborted, message } from '../api/client';
import { Field, Notice } from '../components/forms';
import { useLanguage } from '../i18n/Language';
import type { MessageKey } from '../i18n/messages';

export type Tag = { id: string; name: string; version: number };
export type TagLabel = Pick<Tag, 'id' | 'name'>;
export function useTags(api: ApiClient) {
  const [tags, setTags] = useState<Tag[]>(); const [error, setError] = useState<MessageKey | ''>(''); const [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true; setError('');
    void api.request<Tag[]>('/content/tags').then(value => { if (live) setTags(value); })
      .catch(e => { if (live && !aborted(e)) setError(message(e)); });
    return () => { live = false; };
  }, [api, retry]);
  return { tags, error, refresh: () => setRetry(x => x + 1) };
}
export function TagLabels({ tags, compact = false }: { tags: TagLabel[]; compact?: boolean }) {
  const { t } = useLanguage();
  return tags.length ? <ul className="tag-labels" aria-label={t('Tags')}>{(compact ? tags.slice(0, 3) : tags).map(tag => <li key={tag.id}>{tag.name}</li>)}{compact && tags.length > 3 && <li>{t('+{count} more tags', { count: tags.length - 3 })}</li>}</ul> : null;
}
export function TagPicker({ tags, selected, setSelected, disabled, error, refresh }: {
  tags?: Tag[]; selected: TagLabel[]; setSelected: (tags: TagLabel[]) => void; disabled: boolean; error: MessageKey | ''; refresh: () => void;
}) {
  const { t } = useLanguage(); const [choice, setChoice] = useState(''); const select = useRef<HTMLSelectElement>(null); const chips = useRef<HTMLUListElement>(null); const group = useRef<HTMLFieldSetElement>(null); const returnFocus = useRef(false);
  useEffect(() => { if (returnFocus.current) { (select.current?.disabled ? chips.current?.querySelector('button') ?? group.current : select.current)?.focus(); returnFocus.current = false; } }, [selected]);
  const current = selected.map(tag => ({ ...tag, name: tags?.find(x => x.id === tag.id)?.name ?? tag.name, missing: !!tags && !tags.some(x => x.id === tag.id) }));
  function remove(id: string) { returnFocus.current = true; setSelected(current.filter(x => x.id !== id)); }
  return <fieldset ref={group} tabIndex={-1} className="tag-picker" disabled={disabled}><legend>{t('Tags (optional)')}</legend>
    <p className="hint" id="tag-picker-hint">{t('Add up to 20 tags. Create reusable tags in the library before editing.')}</p>
    {error && <div role="alert" className="notice error">{t(error)} <button className="secondary" type="button" onClick={refresh}>{t('Retry tags')}</button></div>}
    {!tags && !error && <p className="muted" role="status">{t('Loading tags…')}</p>}
    {tags && tags.length === 0 && <p className="hint">{t('No tags yet. You can save this text without tags.')}</p>}
    <div className="tag-add-row"><div className="field"><label htmlFor="content-tag">{t('Choose a tag')}</label>
      <select ref={select} id="content-tag" value={choice} aria-describedby="tag-picker-hint" disabled={!tags?.some(tag => !selected.some(x => x.id === tag.id)) || selected.length >= 20} onChange={e => setChoice(e.target.value)}>
        <option value="">{t('Select a tag')}</option>{tags?.filter(tag => !selected.some(x => x.id === tag.id)).map(tag => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
      </select></div><button type="button" className="secondary" disabled={!choice || selected.length >= 20 || !tags?.some(x => x.id === choice)} onClick={() => {
        const tag = tags?.find(x => x.id === choice); if (tag && !selected.some(x => x.id === tag.id)) { returnFocus.current = true; setSelected([...current, tag]); } setChoice('');
      }}>{t('Add tag')}</button></div>
    <p className="hint tag-count" aria-live="polite">{t('{count} of 20 tags selected', { count: selected.length })}</p>
    {current.length > 0 && <ul ref={chips} className="selected-tags" aria-label={t('Selected tags')}>{current.map(tag => <li key={tag.id} className={tag.missing ? 'tag-unavailable' : ''}>
      <span>{tag.name}{tag.missing && <span className="tag-warning"> — {t('Tag unavailable. Remove it before saving.')}</span>}</span>
      <button type="button" className="tag-remove" aria-label={t('Remove tag “{name}”', { name: tag.name })} onClick={() => remove(tag.id)}><span aria-hidden="true">×</span></button>
    </li>)}</ul>}
  </fieldset>;
}
export function TagPanel({ api, tags, error, refresh, selected, select, changed }: {
  api: ApiClient; tags?: Tag[]; error: MessageKey | ''; refresh: () => void; selected: string; select: (id: string) => void; changed: () => void;
}) {
  const { t } = useLanguage(); const [editing, setEditing] = useState<Tag | 'new' | null>(null); const [name, setName] = useState('');
  const [busy, setBusy] = useState(false); const [fault, setFault] = useState<MessageKey | ''>(''); const [notice, setNotice] = useState<MessageKey | ''>('');
  const [stale, setStale] = useState(false); const [confirmation, setConfirmation] = useState<'delete' | 'reload' | null>(null);
  const newButton = useRef<HTMLButtonElement>(null); const filter = useRef<HTMLSelectElement>(null); const wasEditing = useRef(false); const returnToFilter = useRef(false);
  useEffect(() => { if (wasEditing.current && !editing) { (returnToFilter.current ? filter.current : newButton.current)?.focus(); returnToFilter.current = false; } wasEditing.current = !!editing; }, [editing]);
  const existing = editing && editing !== 'new' ? editing : null; const current = tags?.find(x => x.id === selected);
  function adopt(tag: Tag | 'new') { setEditing(tag); setName(tag === 'new' ? '' : tag.name); setStale(false); setFault(''); setNotice(''); setConfirmation(null); }
  function failed(e: unknown) { if (!aborted(e)) { setFault(message(e)); setStale(e instanceof ApiError && e.code === 'tag_stale'); } }
  async function save(e: FormEvent) {
    e.preventDefault(); setBusy(true); setFault(''); setNotice('');
    try {
      await api.request<Tag>(existing ? `/content/tags/${existing.id}` : '/content/tags', { name, ...(existing ? { version: existing.version } : {}) });
      setEditing(null); changed(); setNotice('Tag saved.');
    } catch (e) { failed(e); } finally { setBusy(false); }
  }
  async function remove() {
    if (!existing) return; setBusy(true); setFault('');
    try { await api.request(`/content/tags/${existing.id}/delete`, { version: existing.version }); returnToFilter.current = true; setEditing(null); setConfirmation(null); select('all'); changed(); setNotice('Tag deleted.'); }
    catch (e) { failed(e); } finally { setBusy(false); }
  }
  async function reload() {
    if (!existing) return; setBusy(true); setFault('');
    try { adopt(await api.request<Tag>(`/content/tags/${existing.id}`)); refresh(); }
    catch (e) { failed(e); } finally { setBusy(false); }
  }
  return <section className="tag-panel" aria-label={t('Tag organization')}>
    <div className="tag-toolbar"><div className="field tag-filter"><label htmlFor="tag-filter">{t('Browse tag')}</label>
      <select ref={filter} id="tag-filter" value={selected} disabled={!tags || !!editing || busy} onChange={e => { select(e.target.value); setNotice(''); }}>
        <option value="all">{t('All tags')}</option><option value="untagged">{t('Untagged content')}</option>
        {!['all', 'untagged'].includes(selected) && !current && <option value={selected}>{t('Tag unavailable')}</option>}
        {tags?.map(tag => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
      </select></div><div className="actions"><button ref={newButton} className="secondary" disabled={!!editing || busy || !tags} onClick={() => adopt('new')}>{t('New tag')}</button>
        {current && <button className="secondary" disabled={!!editing || busy} onClick={() => adopt(current)}>{t('Edit tag')}</button>}</div></div>
    {!tags && !error && <p className="hint" role="status">{t('Loading tags…')}</p>}
    {error && <div role="alert" className="notice error">{t(error)} <button className="secondary" onClick={refresh}>{t('Retry tags')}</button></div>}
    {notice && <Notice>{t(notice)}</Notice>}{fault && <Notice error>{t(fault)}</Notice>}
    {editing && <form className="tag-form" aria-label={existing ? t('Edit tag') : t('New tag')} aria-busy={busy} onSubmit={save}>
      <h2>{existing ? t('Edit tag') : t('New tag')}</h2><Field id="tag-name" autoFocus label={t('Tag name')} hint={t('Required. Up to 50 characters. Accents matter.')} required maxLength={50} value={name} onChange={e => setName(e.target.value)} disabled={busy} />
      <p className="hint">{existing ? t('Renaming updates this label on every text. Saved teaching text stays unchanged.') : t('Reuse tags across your texts. No predefined categories are required.')}</p>
      <div className="actions"><button className="primary" disabled={busy || stale}>{busy ? t('Saving…') : t('Save tag')}</button>
        <button type="button" className="secondary" disabled={busy} onClick={() => { setEditing(null); setFault(''); setConfirmation(null); }}>{t('Cancel')}</button>
        {existing && <button type="button" className="secondary" disabled={busy || stale} onClick={() => setConfirmation('delete')}>{t('Delete tag')}</button>}
        {stale && <button type="button" className="secondary" disabled={busy} onClick={() => setConfirmation('reload')}>{t('Reload tag')}</button>}</div>
      {confirmation && <div className="confirmation"><p>{confirmation === 'delete' ? t('Delete “{name}”? Only tags unused by active and archived texts can be deleted.', { name: existing?.name ?? '' }) : t('Reloading discards your unsaved edits. Continue?')}</p>
        <div className="actions"><button type="button" className="secondary" disabled={busy || (stale && confirmation === 'delete')} onClick={() => void (confirmation === 'delete' ? remove() : reload())}>{confirmation === 'delete' ? t('Confirm delete') : t('Discard edits and reload')}</button>
          <button type="button" className="secondary" disabled={busy} onClick={() => setConfirmation(null)}>{t('Cancel confirmation')}</button></div></div>}
    </form>}
  </section>;
}
