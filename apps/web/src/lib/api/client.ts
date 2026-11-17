import { AUTH_COOKIE_NAME } from "@/lib/middleware-guard";

/**
 * API client for cookie sessions. The access and refresh tokens are httpOnly
 * cookies set by the API, so this file never sees them. It only:
 * - sends cookies (`credentials: "include"`),
 * - echoes the readable `luxa_csrf` cookie as `x-csrf-token` (double submit),
 * - refreshes once on a 401 and retries the request.
 */

export interface ApiErrorField {
  field?: string;
  message: string;
}

export class ApiError extends Error {
  errors?: ApiErrorField[];
  status?: number;

  constructor(message: string, errors?: ApiErrorField[], status?: number) {
    super(message);
    this.name = "ApiError";
    this.errors = errors;
    this.status = status;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  formData?: FormData;
}

type FetchInit = {
  method?: string;
  headers: Record<string, string>;
  body?: string | FormData;
  credentials: RequestCredentials;
};

export const CSRF_HEADER = "x-csrf-token";

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "/api";
}

export function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  for (const part of document.cookie.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() === name) {
      const value = part.slice(eq + 1).trim();
      return value ? decodeURIComponent(value) : null;
    }
  }
  return null;
}

/** The CSRF cookie doubles as the "a session exists" marker. */
export const csrfToken = () => readCookie(AUTH_COOKIE_NAME);
export const hasSession = () => csrfToken() !== null;

function csrfHeaders(): Record<string, string> {
  const token = csrfToken();
  return token ? { [CSRF_HEADER]: token } : {};
}

// A 401 here is about the credentials themselves, not an expired session.
const NO_REFRESH_PATHS = new Set([
  "/auth/login",
  "/auth/register",
  "/auth/refresh",
]);

/** Serialises refreshes across tabs where the Web Locks API exists. */
function withRefreshLock<T>(fn: () => Promise<T>): Promise<T> {
  const locks =
    typeof navigator !== "undefined"
      ? (navigator as Navigator & { locks?: LockManager }).locks
      : undefined;
  return locks
    ? (locks.request("luxa-session-refresh", fn) as Promise<T>)
    : fn();
}

let refreshPromise: Promise<boolean> | null = null;

/**
 * Single-flight refresh. Refresh tokens are single-use (a replay revokes the
 * session), so two tabs must never refresh with the same token. Each tab
 * waits for the lock. If the CSRF cookie changed meanwhile, another tab has
 * already rotated the shared cookies and there is nothing left to do.
 */
export function refreshSession(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  const before = csrfToken();
  if (!before) return Promise.resolve(false);

  refreshPromise = withRefreshLock(async () => {
    const now = csrfToken();
    if (now && now !== before) return true;
    if (!now) return false;
    const res = await fetch(`${baseUrl()}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json", ...csrfHeaders() },
    });
    return res.ok;
  })
    .catch(() => false)
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

async function toApiError(res: Response): Promise<ApiError> {
  let message = `Request failed with status ${res.status}`;
  let errors: ApiErrorField[] | undefined;
  try {
    const body = (await res.json()) as {
      message?: string | string[];
      errors?: ApiErrorField[];
    };
    if (typeof body.message === "string") {
      message = body.message;
    } else if (Array.isArray(body.message)) {
      message = body.message.join(", ");
    }
    if (Array.isArray(body.errors)) {
      errors = body.errors;
    }
  } catch {
    // Non-JSON error body; keep the status fallback message.
  }
  return new ApiError(message, errors, res.status);
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
  retryOnRefresh = true,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (options.method && options.method !== "GET") {
    Object.assign(headers, csrfHeaders());
  }

  const init: FetchInit = { headers, credentials: "include" };
  if (options.method) {
    init.method = options.method;
  }
  if (options.formData) {
    init.body = options.formData;
    delete headers["Content-Type"];
  } else if (options.body !== undefined) {
    init.body = JSON.stringify(options.body);
  }

  const res = await fetch(`${baseUrl()}${path}`, init);

  if (res.status === 401 && retryOnRefresh && !NO_REFRESH_PATHS.has(path)) {
    if (await refreshSession()) {
      return request<T>(path, options, false);
    }
    throw await toApiError(res);
  }

  if (!res.ok) {
    throw await toApiError(res);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body }),
  postForm: <T>(path: string, formData: FormData) =>
    request<T>(path, { method: "POST", formData }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
