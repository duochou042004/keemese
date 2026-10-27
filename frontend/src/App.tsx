import { useEffect, useState } from 'react';

type Connection = 'checking' | 'connected' | 'unavailable';

const messages: Record<Connection, { title: string; detail: string }> = {
  checking: { title: 'Checking connection…', detail: 'Contacting the local API.' },
  connected: { title: 'API connected', detail: 'The API is responding to liveness checks.' },
  unavailable: {
    title: 'API unavailable',
    detail: 'The API did not return a valid response. Check that it is running, then try again.',
  },
};

export function App() {
  const [connection, setConnection] = useState<Connection>('checking');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => controller.abort(), 5000);
    setConnection('checking');

    async function check() {
      try {
        const response = await fetch('/api/v1/health/live', {
          signal: controller.signal,
          cache: 'no-store',
          credentials: 'omit',
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) throw new Error('Unsuccessful liveness response');
        const body: unknown = await response.json();
        if (typeof body !== 'object' || body === null || !('status' in body) || body.status !== 'ok') {
          throw new Error('Invalid liveness response');
        }
        if (active) setConnection('connected');
      } catch {
        if (active) setConnection('unavailable');
      } finally {
        window.clearTimeout(timeout);
      }
    }
    void check();
    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [attempt]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-8">
          <span className="text-xl font-semibold tracking-tight">Keemese</span>
          <span className="text-sm font-medium text-slate-600">Development shell</span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-8 sm:py-16">
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-800">Foundation · F0a</p>
        <h1 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">A foundation for teaching.</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-slate-700">
          This local preview checks the connection between the interface and API.
          Accounts and teaching features are not available yet.
        </p>
        <section aria-labelledby="connection-heading" className="mt-10 max-w-2xl rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
          <h2 id="connection-heading" className="text-lg font-semibold">API connection</h2>
          <div role="status" aria-live="polite" aria-atomic="true" className="mt-5">
            <p className={`font-semibold ${connection === 'unavailable' ? 'text-red-800' : 'text-teal-800'}`}>
              {messages[connection].title}
            </p>
            <p className="mt-2 leading-6 text-slate-700">{messages[connection].detail}</p>
          </div>
          <button
            type="button"
            disabled={connection === 'checking'}
            onClick={() => { setConnection('checking'); setAttempt((value) => value + 1); }}
            className="mt-6 min-h-11 rounded-md bg-teal-800 px-5 py-3 font-medium text-white hover:bg-teal-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-800 disabled:cursor-wait disabled:opacity-60"
          >
            {connection === 'checking' ? 'Checking…' : 'Check again'}
          </button>
        </section>
        <p className="mt-6 max-w-2xl text-sm leading-6 text-slate-600">
          Development only. This shell has no access controls. Do not enter student information.
        </p>
      </main>
    </div>
  );
}
