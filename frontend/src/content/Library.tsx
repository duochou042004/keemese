import { TagLabels, TagPanel, TagPicker, useTags } from './Tags';
import type { TagLabel } from './Tags';
import { FolderPanel, FolderSelect, useFolders } from './Folders';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiClient, ApiError, aborted, message } from '../api/client';
import { Field, NavLink, Notice, PageHeading, TextAreaField, navigate } from '../components/forms';
import { useLanguage } from '../i18n/Language';
import type { MessageKey } from '../i18n/messages';

export type TextItem = { id: string; title: string; description: string; body: string; archived: boolean; version: number; createdAt: string; updatedAt: string; folderId: string | null; tags: TagLabel[] };
type Summary = Omit<TextItem, 'body'>;

export function ContentLibrary({ api }: { api: ApiClient }) {
  const { t } = useLanguage();
  const tagState = useTags(api); const [tag, setTag] = useState('all');
  const folderState = useFolders(api); const [folder, setFolder] = useState('all');
  const [archived, setArchived] = useState(false); const [page, setPage] = useState(1); const [retry, setRetry] = useState(0);
  const [draftQuery, setDraftQuery] = useState(''); const [query, setQuery] = useState(''); const [invalid, setInvalid] = useState(false);
  const input = useRef<HTMLInputElement>(null); const composing = useRef(false);
  const pending = useRef('');
  const [data, setData] = useState<{ items: Summary[]; nextPage: number | null }>();
  const [error, setError] = useState<MessageKey | ''>('');
  const tuple = JSON.stringify([archived, folder, page, query, tag]);
  useEffect(() => {
    let active = true; pending.current = tuple; setData(undefined); setError('');
    const params = new URLSearchParams({ archived: String(archived), page: String(page) });
    if (folder !== 'all') params.set('folderId', folder);
    if (query) params.set('q', query);
    if (tag !== 'all') params.set('tagId', tag);
    void api.request<{ items: Summary[]; nextPage: number | null }>(`/content?${params}`)
      .then(value => { if (active) setData(value); }).catch(e => { if (active && !aborted(e)) setError(message(e)); })
      .finally(() => { if (active) pending.current = ''; });
    return () => { active = false; };
  }, [api, archived, page, retry, folder, query, tag, tuple]);
  function resetResults() { setData(undefined); setError(''); }
  function search(event: FormEvent) {
    event.preventDefault(); if (composing.current) return;
    // Match .NET Trim whitespace; JavaScript trim additionally removes BOM, but omits NEL.
    const trimmed = draftQuery.replace(/^[\u0009-\u000D\u0020\u0085\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]+|[\u0009-\u000D\u0020\u0085\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]+$/gu, '');
    if (draftQuery.length > 200 || /[\u0000-\u001F\u007F-\u009F]/u.test(trimmed) || [...draftQuery].some(c => { const n = c.codePointAt(0)!; return n >= 0xD800 && n <= 0xDFFF; })) {
      setInvalid(true); input.current?.focus(); return;
    }
    setInvalid(false);
    if (pending.current === JSON.stringify([archived, folder, 1, trimmed, tag])) return;
    resetResults(); setQuery(trimmed); setPage(1); setRetry(x => x + 1);
  }
  function clear() {
    setDraftQuery(''); setInvalid(false); input.current?.focus();
    if (pending.current === JSON.stringify([archived, folder, 1, '', tag])) return;
    resetResults(); setQuery(''); setPage(1); setRetry(x => x + 1);
  }
  return <><div className="heading-row"><PageHeading eyebrow={t('Tutor workspace')} title={t('Content library')}>{t('Create reusable teaching texts. Only you can access this library.')}</PageHeading>
    <NavLink to="/content/new" className="button primary">{t('New text content')}</NavLink></div>
    <div className="library-organization">{folderState.error ? <><Notice error>{t(folderState.error)}</Notice><button className="secondary" onClick={folderState.refresh}>{t('Try again')}</button></> : folderState.folders ?
      <FolderPanel api={api} folders={folderState.folders} selected={folder} select={id => { if (id !== folder || page !== 1) resetResults(); setFolder(id); setPage(1); }} changed={() => { folderState.refresh(); resetResults(); setPage(1); setRetry(x => x + 1); }} /> : <p className="muted">{t('Loading folders…')}</p>}
    <TagPanel api={api} tags={tagState.tags} error={tagState.error} refresh={tagState.refresh} selected={tag}
      select={id => { if (id !== tag || page !== 1) resetResults(); setTag(id); setPage(1); }} changed={() => { tagState.refresh(); resetResults(); setPage(1); setRetry(x => x + 1); }} />
    </div>
    <div className="library-filters" role="group" aria-label={t('Content status')}>
      <button className="secondary" aria-pressed={!archived} onClick={() => { if (archived || page !== 1) resetResults(); setArchived(false); setPage(1); }}>{t('Active content')}</button>
      <button className="secondary" aria-pressed={archived} onClick={() => { if (!archived || page !== 1) resetResults(); setArchived(true); setPage(1); }}>{t('Archived content')}</button>
    </div>
    <form className="library-search" role="search" onSubmit={search} noValidate>
      <div className="field"><label htmlFor="content-search">{t('Search content')}</label>
        <input ref={input} id="content-search" type="text" enterKeyHint="search" maxLength={200} value={draftQuery}
          aria-describedby={`content-search-hint${invalid ? ' content-search-error' : ''}`} aria-invalid={invalid || undefined}
          onChange={e => { setDraftQuery(e.target.value); setInvalid(false); }}
          onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }}
          onKeyDown={e => { if (e.key === 'Enter' && (composing.current || e.nativeEvent.isComposing || e.keyCode === 229)) e.preventDefault(); }} />
        <p id="content-search-hint" className="hint">{t('Search title, description and teaching text. Accents matter.')}</p>
        {invalid && <p id="content-search-error" role="alert" className="search-validation">{t('Use up to 200 characters without control characters.')}</p>}
      </div>
      <div className="actions"><button className="primary" type="submit">{t('Search')}</button>
        <button className="secondary" type="button" onClick={clear}>{t('Clear search')}</button></div>
    </form>
    {query && <p className="applied-query">{t('Results for “{query}”', { query })}</p>}
    {error ? <><div role="alert" className="notice error">{t(error)}</div><button className="secondary" onClick={() => { resetResults(); setRetry(x => x + 1); }}>{t('Try again')}</button></> : !data ? <Notice>{t('Loading content…')}</Notice> : <>
      <p className="visually-hidden" role="status">{t('Content results loaded.')}</p>
      {data.items.length === 0 ? <section className="empty"><h2>{page > 1 ? t('No results on this page') : !query && tag !== 'all' ? t('No content with this tag') : query ? t('No matching content') : archived ? t('No archived content') : folder !== 'all' ? t('No content in this folder') : t('Your library is empty')}</h2>
        <p>{page > 1 ? t('Return to the previous page or search again.') : !query && tag !== 'all' ? t('Choose another tag or adjust your filters.') : query ? t('Try another search or clear it. Your folder and status filters stay selected.') : archived ? t('Archived texts will appear here. You can restore them at any time.') : folder !== 'all' ? t('Choose this folder in the text editor to organize your content here.') : t('Start with a title and add your teaching text when ready.')}</p></section> :
        <ul className="content-list" aria-label={t('Content library')}>{data.items.map(item => <li key={item.id}><NavLink to={`/content/${item.id}`}>{item.title}</NavLink>
          {item.description && <p className="muted">{item.description}</p>}<TagLabels tags={item.tags ?? []} compact /></li>)}</ul>}
      {(data.items.length > 0 || page > 1) && <nav className="pagination" aria-label={t('Pagination')}><button className="secondary" disabled={page === 1} onClick={() => { resetResults(); setPage(x => x - 1); }}>{t('Previous page')}</button>
        <span>{t('Page {page}', { page })}</span><button className="secondary" disabled={!data.nextPage} onClick={() => { resetResults(); setPage(x => x + 1); }}>{t('Next page')}</button></nav>}
    </>}

  </>;
}

export function ContentEditor({ api, id, copy = false, created, justCreated }: { api: ApiClient; id?: string; copy?: boolean; created: (id: string) => void; justCreated: boolean }) {
  const { t } = useLanguage();
  const folderState = useFolders(api); const tagState = useTags(api); const [selectedTags, setSelectedTags] = useState<TagLabel[]>([]); const [folder, setFolder] = useState('');
  const [data, setData] = useState<TextItem>(); const [loaded, setLoaded] = useState(!id);
  const [title, setTitle] = useState(''); const [description, setDescription] = useState(''); const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false); const [retry, setRetry] = useState(0);
  const [error, setError] = useState<MessageKey | ''>(''); const [stale, setStale] = useState(false);
  const [notice, setNotice] = useState<MessageKey | ''>(justCreated && !copy ? 'Content created.' : '');
  const [confirmation, setConfirmation] = useState<'archive' | 'reload' | 'discard' | null>(null);
  const [rejectedFolder, setRejectedFolder] = useState(''); const [rejectedTags, setRejectedTags] = useState<string[]>([]); const [repairingTags, setRepairingTags] = useState(false);
  const owner = useRef(true); const inFlight = useRef(false); const cancelTrigger = useRef<HTMLButtonElement>(null);
  useEffect(() => { owner.current = true; return () => { owner.current = false; }; }, []);
  const dirty = !!data && (title !== data.title || description !== data.description || body !== data.body || folder !== (data.folderId ?? '') || JSON.stringify(selectedTags.map(x => x.id).sort()) !== JSON.stringify((data.tags ?? []).map(x => x.id).sort()));
  const missingMetadata = !!(folder && folder === rejectedFolder) || selectedTags.some(x => rejectedTags.includes(x.id)) || !!(folder && folderState.folders && !folderState.folders.some(x => x.id === folder)) || !!(tagState.tags && selectedTags.some(x => !tagState.tags!.some(tag => tag.id === x.id)));
  const metadataPending = repairingTags || !folderState.folders || !tagState.tags || !!folderState.error || !!tagState.error;
  function cancelCopy() { if (dirty) setConfirmation('discard'); else navigate(`/content/${id}`); }
  function dismissDiscard() { setConfirmation(null); cancelTrigger.current?.focus(); }
  function adopt(item: TextItem) { setData(item); setTitle(item.title); setDescription(item.description); setBody(item.body); setFolder(item.folderId ?? ''); setSelectedTags(item.tags ?? []); setLoaded(true); }
  useEffect(() => {
    if (!id) return;
    let active = true; setLoaded(false); setError(''); setStale(false);
    void api.request<TextItem>(`/content/${id}`).then(item => { if (active) adopt(item); })
      .catch(e => { if (active && !aborted(e)) setError(message(e)); });
    return () => { active = false; };
  }, [api, id, retry]);
  function failed(e: unknown) {
    if (aborted(e)) return;
    setError(message(e)); setStale(e instanceof ApiError && e.code === 'content_stale');
    if (e instanceof ApiError && e.code === 'tag_missing') {
      tagState.refresh();
      if (copy) {
        // Block another submit until the rejected IDs are known, even while the catalog is refreshing.
        setRepairingTags(true);
        void api.request<TagLabel[]>('/content/tags').then(tags => {
          if (owner.current) setRejectedTags(selectedTags.filter(x => !tags.some(tag => tag.id === x.id)).map(x => x.id));
        }).catch(error => {
          if (owner.current && !aborted(error)) { setRejectedTags(selectedTags.map(x => x.id)); setError(message(error)); }
        }).finally(() => { if (owner.current) setRepairingTags(false); });
      }
    }
    if (e instanceof ApiError && e.code === 'folder_missing') { if (copy) setRejectedFolder(folder); folderState.refresh(); }
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (inFlight.current || !loaded || stale || (copy && (missingMetadata || metadataPending || confirmation))) return;
    inFlight.current = true; setBusy(true); setError(''); setNotice('');
    try {
      const item = await api.request<TextItem>(id && !copy ? `/content/${id}` : '/content', { title, description, body, folderId: folder || null, tagIds: selectedTags.map(x => x.id), ...(data && !copy ? { version: data.version } : {}) });
      if (!owner.current) return;
      if (!id || copy) { created(item.id); return; }
      adopt(item); setStale(false); setNotice('Changes saved.');
    } catch (e) { if (owner.current && !aborted(e)) { if (copy && (!(e instanceof ApiError) || e.status >= 500)) setError('The copy may have been saved. Check the library before trying again; retrying may create another copy.'); else failed(e); } }
    finally { inFlight.current = false; if (owner.current) setBusy(false); }
  }
  async function changeArchive(archived: boolean) {
    if (!data) return;
    setBusy(true); setError(''); setNotice('');
    try {
      adopt(await api.request<TextItem>(`/content/${data.id}/${archived ? 'archive' : 'restore'}`, { version: data.version }));
      setConfirmation(null); setStale(false); setNotice(archived ? 'Content archived.' : 'Content restored.');
    } catch (e) { failed(e); }
    finally { setBusy(false); }
  }
  function reload() { setConfirmation(null); setNotice(''); setRetry(x => x + 1); }
  return <section className="content-editor"><NavLink className="back-link" to="/content">{t('← Content library')}</NavLink>
    <PageHeading eyebrow={t('Content library')} title={copy ? t('New text from a copy') : !id ? t('New text content') : data?.archived ? t('Archived text content') : t('Edit text content')}>{t('Reusable source content stays separate from student activity.')}</PageHeading>
    {copy && <div className="copy-context"><p className="intro">{t('Nothing is saved until you create the copy.')}</p>{loaded && data && <p>{t('Source: {name}', { name: data.title })}</p>}</div>}
    {loaded && notice && <Notice>{t(notice)}</Notice>}{error && <Notice error>{t(error)}</Notice>}
    {!loaded ? error ? <button className="secondary" onClick={reload}>{t('Try again')}</button> : <Notice>{t('Loading content…')}</Notice> : <>
      {stale && <button className="secondary" disabled={busy} onClick={() => setConfirmation('reload')}>{t('Reload saved content')}</button>}
      {confirmation === 'reload' && <div className="confirmation"><p>{t('Reloading discards your unsaved edits. Continue?')}</p><div className="actions"><button className="secondary" onClick={reload}>{t('Discard edits and reload')}</button><button className="secondary" onClick={() => setConfirmation(null)}>{t('Cancel')}</button></div></div>}
      {data?.archived && !copy ? <div className="archived-text"><h2>{data.title}</h2><TagLabels tags={data.tags ?? []} />{data.description && <p className="content-text muted">{data.description}</p>}<div className="content-text">{data.body || t('No text added yet.')}</div>
        <button className="primary" disabled={busy || stale} onClick={() => void changeArchive(false)}>{busy ? t('Saving…') : t('Restore content')}</button></div> :
      <form aria-label={t('Text content')} aria-busy={busy} onSubmit={save} onChange={() => setNotice('')}>
        <Field id="content-title" label={t('Title')} hint={t('Required. Up to 200 characters.')} required maxLength={200} value={title} disabled={busy} onChange={e => setTitle(e.target.value)} />
        {folderState.error ? <><Notice error>{t(folderState.error)}</Notice><button type="button" className="secondary" onClick={folderState.refresh}>{t('Try again')}</button></> : folderState.folders ?
          <FolderSelect folders={folderState.folders} id="content-folder" label={t('Folder')} value={folder} onChange={setFolder} disabled={busy} /> : <p className="muted">{t('Loading folders…')}</p>}
        <TagPicker tags={tagState.tags} selected={selectedTags} setSelected={setSelectedTags} disabled={busy} error={tagState.error} refresh={tagState.refresh} />
        <TextAreaField id="content-description" label={t('Description (optional)')} rows={3} maxLength={2000} disabled={busy} value={description} onChange={e => setDescription(e.target.value)} />
        <TextAreaField id="content-body" label={t('Teaching text (optional)')} hint={t('Plain text, up to 50,000 characters. Your text is not translated when you change the interface language.')} rows={12} maxLength={50000} disabled={busy} value={body} onChange={e => setBody(e.target.value)} />
        <div className="actions"><button className="primary" disabled={busy || stale || (copy && (missingMetadata || metadataPending || !!confirmation))}>{busy ? t('Saving…') : copy ? t('Create copy') : id ? t('Save changes') : t('Create content')}</button>{copy ? <button ref={cancelTrigger} type="button" className="secondary" disabled={busy} onClick={cancelCopy}>{t('Cancel copy')}</button> : <NavLink to="/content">{t('Back to library')}</NavLink>}</div>
      </form>}
      {copy && missingMetadata && <p className="hint">{t('Remove or replace unavailable folders and tags before creating the copy.')}</p>}
      {copy && confirmation === 'discard' && <div className="confirmation"><p>{t('Discard this copy draft and return to the source?')}</p><div className="actions"><button className="secondary" onClick={() => navigate(`/content/${id}`)}>{t('Discard copy')}</button><button className="secondary" onClick={dismissDiscard}>{t('Keep editing')}</button></div></div>}
      {data && !copy && <div className="section"><button className="secondary" disabled={busy || stale || dirty || !!confirmation} aria-describedby="copy-hint" onClick={() => navigate(`/content/${data.id}/copy`)}>{t('Create a copy')}</button><p className="hint" id="copy-hint">{t('Save or discard your edits before creating a copy.')}</p>{dirty && !stale && !confirmation && <button className="secondary" disabled={busy} onClick={() => setConfirmation('reload')}>{t('Reload saved content')}</button>}</div>}
      {data && !copy && !data.archived && <section className="section"><h2>{t('Archive content')}</h2><p className="intro">{t('Keep saved content out of the active library. You can restore it later.')}</p>
        {confirmation === 'archive' ? <div className="confirmation"><p id="archive-question">{t('Archive “{name}”? Unsaved edits will not be saved.', { name: data.title })}</p><div className="actions">
          <button className="secondary" aria-describedby="archive-question" disabled={busy || stale} onClick={() => void changeArchive(true)}>{busy ? t('Saving…') : t('Confirm archive')}</button>
          <button className="secondary" disabled={busy} onClick={() => setConfirmation(null)}>{t('Cancel')}</button></div></div> :
          <button className="secondary archive-button" disabled={busy || stale} onClick={() => setConfirmation('archive')}>{t('Archive content')}</button>}
      </section>}
    </>}
  </section>;
}
