import type { MessageKey } from '../i18n/messages';
export type Session = { id: string; role: 'Tutor' | 'Student'; mustChangePassword: boolean };
export type Student = { id: string; displayName: string; username: string; active: boolean; version: number };
export type Profile = Pick<Student, 'id' | 'displayName' | 'username'>;

const messages: Partial<Record<string, MessageKey>> = {
  invalid_folder_name: 'Enter a folder name of 1–100 characters.',
  folder_name_exists: 'A folder with this name already exists here.',
  folder_cycle: 'Choose a parent outside this folder and its descendants.',
  folder_missing: 'This folder could not be found. Your draft is kept.',
  folder_stale: 'This folder has changed. Your draft is kept. Reload before trying again.',
  folder_not_empty: 'Move all child folders and active or archived content before deleting this folder.',
  folder_limit: 'The library supports up to 1,000 folders.',
  invalid_content_title: 'Enter a title of 1–200 characters.',
  invalid_content_text: 'Use up to 2,000 characters for the description and 50,000 for the teaching text.',
  content_missing: 'This content could not be found.',
  content_stale: 'This content has changed. Your draft is kept. Reload the saved content before trying again.',
  content_archived: 'Restore this content before editing it.',
  invalid_credentials: "The username or password is incorrect, or this account is unavailable.",
  login_throttled: "Too many sign-in attempts. Please wait a minute and try again.",
  invalid_username: "Use 3–64 characters for the username: unaccented letters, numbers, periods, underscores or hyphens.",
  invalid_display_name: "The full name must contain 1–200 characters.",
  invalid_password: "The password must contain 12–128 characters; spaces and Vietnamese are supported.",
  invalid_current_password: "The current password is incorrect.",
  password_unchanged: "Choose a password different from your current password.",
  username_exists: "This username is already in use. Choose another.",
  stale_version: "The information has changed. Reload the profile before trying again.",
  student_inactive: "This account is inactive.",
  student_missing: "This student could not be found.",
  forbidden: "You do not have permission to perform this action.",
  password_change_required: "Change your password before viewing your account information.",
  invalid_csrf: "The verification session has changed. Please try the action again.",
  unauthenticated: "Your session has ended. Please sign in again.",
};

export class ApiError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
  }
}
export const aborted = (error: unknown) => error instanceof DOMException && error.name === 'AbortError';
export const message = (error: unknown): MessageKey => error instanceof ApiError ? (messages[error.code] ?? "Unable to complete the request. Please try again.") : "Cannot reach the server. Check your connection and try again.";

// CSRF and response state live only in memory. An epoch rejects late bytes after a user transition.
export class ApiClient {
  private token: string | null = null;
  private epoch = 0;
  private requests = new Set<AbortController>();
  constructor(private expired: () => void) {}
  reset() {
    this.epoch++; this.token = null;
    for (const request of this.requests) request.abort();
    this.requests.clear();
  }
  async request<T>(path: string, body?: unknown, handle401 = true): Promise<T> {
    const epoch = this.epoch;
    const controller = new AbortController(); this.requests.add(controller);
    let timedOut = false;
    const timeout = window.setTimeout(() => { timedOut = true; controller.abort(); }, 12000);
    const check = () => { if (epoch !== this.epoch) throw new DOMException('Superseded', 'AbortError'); };
    try {
      if (body !== undefined && !this.token) {
        const csrf = await fetch('/api/v1/auth/csrf', { credentials: 'same-origin', cache: 'no-store', signal: controller.signal });
        check(); if (!csrf.ok) throw new ApiError(csrf.status, 'service_unavailable');
        const data = await csrf.json() as { token: string }; check(); this.token = data.token;
      }
      const response = await fetch('/api/v1' + path, {
        method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
        headers: body === undefined ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-TOKEN': this.token! },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      check();
      if (!response.ok) {
        const detail = await response.json().catch(() => ({})) as { code?: string }; check();
        if (detail.code === 'invalid_csrf') this.token = null;
        if (response.status === 401 && handle401) { this.reset(); this.expired(); throw new DOMException('Signed out', 'AbortError'); }
        throw new ApiError(response.status, detail.code ?? 'request_failed');
      }
      const data = response.status === 204 ? undefined : await response.json(); check(); return data as T;
    } catch (error) {
      if (epoch !== this.epoch) throw new DOMException('Superseded', 'AbortError');
      if (timedOut) throw new Error('Timeout');
      throw error;
    } finally {
      window.clearTimeout(timeout); this.requests.delete(controller);
    }
  }
}
