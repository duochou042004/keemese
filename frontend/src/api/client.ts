export type Session = { id: string; role: 'Tutor' | 'Student'; mustChangePassword: boolean };
export type Student = { id: string; displayName: string; username: string; active: boolean; version: number };
export type Profile = Pick<Student, 'id' | 'displayName' | 'username'>;

const messages: Record<string, string> = {
  invalid_credentials: 'Tên đăng nhập hoặc mật khẩu không đúng, hoặc tài khoản chưa thể truy cập.',
  login_throttled: 'Bạn đã thử đăng nhập nhiều lần. Vui lòng chờ một phút rồi thử lại.',
  invalid_username: 'Tên đăng nhập cần 3–64 ký tự: chữ không dấu, số, dấu chấm, gạch dưới hoặc gạch ngang.',
  invalid_display_name: 'Họ và tên cần từ 1 đến 200 ký tự.',
  invalid_password: 'Mật khẩu cần từ 12 đến 128 ký tự; có thể dùng dấu cách và tiếng Việt.',
  invalid_current_password: 'Mật khẩu hiện tại không đúng.',
  password_unchanged: 'Hãy chọn mật khẩu khác mật khẩu hiện tại.',
  username_exists: 'Tên đăng nhập đã được sử dụng. Hãy chọn tên khác.',
  stale_version: 'Thông tin đã thay đổi. Hãy tải lại hồ sơ trước khi thử lại.',
  student_inactive: 'Tài khoản này đã ngừng hoạt động.',
  student_missing: 'Không tìm thấy học sinh này.',
  forbidden: 'Bạn không có quyền thực hiện thao tác này.',
  password_change_required: 'Bạn cần đổi mật khẩu trước khi xem thông tin tài khoản.',
  invalid_csrf: 'Phiên xác nhận đã thay đổi. Hãy thử lại thao tác.',
  unauthenticated: 'Phiên đăng nhập đã kết thúc. Vui lòng đăng nhập lại.',
};

export class ApiError extends Error {
  constructor(public status: number, public code: string) {
    super(messages[code] ?? 'Chưa thể hoàn tất yêu cầu. Vui lòng thử lại.');
  }
}
export const aborted = (error: unknown) => error instanceof DOMException && error.name === 'AbortError';
export const message = (error: unknown) => error instanceof ApiError ? error.message : 'Không kết nối được máy chủ. Hãy kiểm tra kết nối rồi thử lại.';

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
