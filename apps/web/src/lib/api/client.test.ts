import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { api, hasSession, readCookie, refreshSession } from "@/lib/api/client";

const fetchMock = vi.fn();
const callLog: Array<{ url: string; init: RequestInit }> = [];

function res(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

const headersOf = (i: number) =>
  (callLog[i].init.headers ?? {}) as Record<string, string>;

function setCookie(value: string) {
  document.cookie = `luxa_csrf=${value}; path=/`;
}

function clearCookies() {
  document.cookie = "luxa_csrf=; Max-Age=0; path=/";
  document.cookie = "other=; Max-Age=0; path=/";
}

describe("api client", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_URL = "/api";
    callLog.length = 0;
    clearCookies();
    fetchMock.mockReset();
    fetchMock.mockImplementation(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        callLog.push({ url: String(input), init: init ?? {} });
        return res({});
      },
    );
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    clearCookies();
  });

  it("sends cookies and never an Authorization header", async () => {
    setCookie("csrf-1");
    await api.get("/data");

    expect(callLog[0].url).toBe("/api/data");
    expect(callLog[0].init.credentials).toBe("include");
    expect(headersOf(0).Authorization).toBeUndefined();
  });

  it("echoes the CSRF cookie on unsafe methods only", async () => {
    setCookie("csrf-1");
    await api.post("/sales", { a: 1 });
    await api.get("/sales");

    expect(headersOf(0)["x-csrf-token"]).toBe("csrf-1");
    expect(headersOf(1)["x-csrf-token"]).toBeUndefined();
  });

  it("omits the CSRF header when there is no session", async () => {
    await api.post("/auth/login", {});
    expect(headersOf(0)["x-csrf-token"]).toBeUndefined();
  });

  it("reads cookies by exact name", () => {
    document.cookie = "other=1; path=/";
    setCookie("a%20b");
    expect(readCookie("luxa_csrf")).toBe("a b");
    expect(readCookie("luxa")).toBeNull();
    expect(hasSession()).toBe(true);
    clearCookies();
    expect(hasSession()).toBe(false);
  });

  it("parses JSON and returns data on 2xx", async () => {
    fetchMock.mockResolvedValue(res({ hello: "world" }));
    await expect(api.get("/data")).resolves.toEqual({ hello: "world" });
  });

  it("throws ApiError carrying message and errors for non-2xx", async () => {
    fetchMock.mockResolvedValue(
      res(
        {
          message: "Email already registered",
          errors: [{ field: "email", message: "already exists" }],
        },
        400,
      ),
    );

    await expect(api.post("/auth/register", {})).rejects.toMatchObject({
      name: "ApiError",
      message: "Email already registered",
      errors: [{ field: "email", message: "already exists" }],
      status: 400,
    });
  });

  it("joins array error messages", async () => {
    fetchMock.mockResolvedValue(
      res({ message: ["first error", "second error"] }, 422),
    );

    await expect(api.post("/data", {})).rejects.toMatchObject({
      message: "first error, second error",
      status: 422,
    });
  });

  it("single-flights concurrent 401s and retries after one refresh", async () => {
    setCookie("csrf-old");
    let refreshed = false;
    fetchMock.mockImplementation(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        callLog.push({ url, init: init ?? {} });
        if (url.endsWith("/auth/refresh")) {
          refreshed = true;
          setCookie("csrf-new");
          return res({ user: {} });
        }
        return refreshed ? res({ ok: true }) : res({ message: "x" }, 401);
      },
    );

    const results = await Promise.all([
      api.get("/data"),
      api.get("/data"),
      api.get("/data"),
    ]);

    expect(results).toEqual([{ ok: true }, { ok: true }, { ok: true }]);
    const refreshCalls = callLog.filter((c) => c.url.endsWith("/auth/refresh"));
    expect(refreshCalls).toHaveLength(1);
    expect(refreshCalls[0].init.credentials).toBe("include");
    expect(
      (refreshCalls[0].init.headers as Record<string, string>)["x-csrf-token"],
    ).toBe("csrf-old");
  });

  it("skips the refresh call when another tab already rotated the session", async () => {
    setCookie("csrf-old");
    const request = vi.fn(
      async (_name: string, fn: () => Promise<boolean>) => {
        setCookie("csrf-from-other-tab");
        return fn();
      },
    );
    vi.stubGlobal("navigator", { locks: { request } });

    await expect(refreshSession()).resolves.toBe(true);
    expect(request).toHaveBeenCalledWith("luxa-session-refresh", expect.any(Function));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not refresh without a session", async () => {
    fetchMock.mockResolvedValue(res({ message: "Unauthorized" }, 401));

    await expect(api.get("/data")).rejects.toMatchObject({ status: 401 });
    expect(callLog.filter((c) => c.url.endsWith("/auth/refresh"))).toHaveLength(0);
  });

  it("does not attempt a refresh for a 401 on /auth/login", async () => {
    setCookie("csrf-1");
    fetchMock.mockImplementation(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        callLog.push({ url: String(input), init: init ?? {} });
        return res({ message: "Invalid credentials" }, 401);
      },
    );

    await expect(
      api.post("/auth/login", { email: "a@b.co", password: "nope" }),
    ).rejects.toMatchObject({ message: "Invalid credentials", status: 401 });
    expect(callLog.filter((c) => c.url.endsWith("/auth/refresh"))).toHaveLength(0);
  });

  it("posts multipart FormData without a Content-Type header", async () => {
    setCookie("csrf-1");
    const form = new FormData();
    form.append(
      "file",
      new File(["name,sellingPrice\nA,10"], "data.csv", { type: "text/csv" }),
    );

    await api.postForm("/inventory/bulk-import", form);

    expect(callLog[0].url).toBe("/api/inventory/bulk-import");
    expect(headersOf(0)["Content-Type"]).toBeUndefined();
    expect(headersOf(0)["x-csrf-token"]).toBe("csrf-1");
  });

  it("rejects without looping when the refresh fails", async () => {
    setCookie("csrf-1");
    fetchMock.mockImplementation(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        callLog.push({ url: String(input), init: init ?? {} });
        return res({ message: "Unauthorized" }, 401);
      },
    );

    await expect(api.get("/data")).rejects.toMatchObject({ status: 401 });
    expect(callLog.filter((c) => c.url.endsWith("/auth/refresh"))).toHaveLength(1);
    expect(callLog.filter((c) => c.url.endsWith("/data"))).toHaveLength(1);
  });
});
