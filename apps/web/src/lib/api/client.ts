import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
} from "./tokens";

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
}

type FetchInit = {
  method?: string;
  headers: Record<string, string>;
  body?: string;
};

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "/api";
}

let refreshPromise: Promise<boolean> | null = null;

// A 401 here means invalid credentials, not an expired token.
const NO_REFRESH_PATHS = new Set(["/auth/login"]);

async function refreshTokens(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearTokens();
      return false;
    }
    try {
      const res = await fetch(`${baseUrl()}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        clearTokens();
        return false;
      }
      const data = (await res.json()) as {
        access_token: string;
        refresh_token: string;
      };
      setTokens(data.access_token, data.refresh_token);
      return true;
    } catch {
      clearTokens();
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
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
  const accessToken = getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const init: FetchInit = { headers };
  if (options.method) {
    init.method = options.method;
  }
  if (options.body !== undefined) {
    init.body = JSON.stringify(options.body);
  }

  const res = await fetch(`${baseUrl()}${path}`, init);

  if (res.status === 401 && retryOnRefresh && !NO_REFRESH_PATHS.has(path)) {
    const refreshed = await refreshTokens();
    if (refreshed) {
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
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};