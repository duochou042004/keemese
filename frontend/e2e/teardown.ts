import { readFile, unlink } from 'node:fs/promises';

export default async function teardown() {
  const response = await fetch('http://127.0.0.1:5080/__test/stop', { method: 'POST', headers: { 'X-Test-Control': process.env.KEEMESE_UI_CONTROL! } });
  if (!response.ok) throw new Error('Disposable API host stop was not acknowledged. Inspect exact test-owned container.');
  // HTTP listener closure precedes DB cleanup. Wait for the host's post-cleanup acknowledgement.
  const marker = process.env.KEEMESE_UI_COMPLETION!;
  for (let attempt = 0; attempt < 80; attempt++) {
    const result = await readFile(marker, 'utf8').catch(() => null);
    if (result === 'cleanup_verified') { await unlink(marker); return; }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error('Disposable database cleanup was not verified. Inspect the exact test-owned container.');
}
