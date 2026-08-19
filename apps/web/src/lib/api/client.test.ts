import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const tokens = vi.hoisted(() => ({
  getAccessToken: vi.fn(),
  getRefreshToken: vi.fn(),
  setTokens: vi.fn(),
  clearTokens: vi.fn(),
  isTokenExpired: vi.fn(),
}));

vi.mock("@/lib/api/tokens", () => tokens);

import { api } from "@/lib/api/client";

const fetchMock = vi.fn();
const callLog: Array<{ url: string; headers: Record<string, string> }> = [];

function res(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

function installFetch() {
  fetchMock.mockImplementation(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      callLog.push({
        url,
        headers: (init?.headers ?? {}) as Record<string, string>,
      });
      return res({});
    },
  );
  vi.stubGlobal("fetch", fetchMock);
}

describe("api client", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_URL = "/api";
    callLog.length = 0;
    fetchMock.mockReset();
    installFetch();

    tokens.getAccessToken.mockReset();
    tokens.getRefreshToken.mockReset();
    tokens.setTokens.mockReset();
    tokens.clearTokens.mockReset();
    tokens.getAccessToken.mockReturnValue(null);
    tokens.getRefreshToken.mockReturnValue(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends the Authorization header when a token exists and omits it otherwise", async () => {
    tokens.getAccessToken.mockReturnValue("tok-1");
    await api.get("/data");
    expect(callLog[0].url).toBe("/api/data");
    expect(callLog[0].headers.Authorization).toBe("Bearer tok-1");

    callLog.length = 0;
    tokens.getAccessToken.mockReturnValue(null);
    await api.get("/data");
    expect(callLog[0].headers.Authorization).toBeUndefined();
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
      name: "ApiError",
      message: "first error, second error",
      status: 422,
    });
  });

  it("single-flights concurrent 401s and retries with the new token", async () => {
    tokens.getAccessToken.mockReturnValue("old-access");
    tokens.getRefreshToken.mockReturnValue("old-refresh");
    tokens.setTokens.mockImplementation((access: string) => {
      tokens.getAccessToken.mockReturnValue(access);
    });

    fetchMock.mockImplementation(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const headers = (init?.headers ?? {}) as Record<string, string>;
        callLog.push({ url, headers });
        if (url.endsWith("/auth/refresh")) {
          return res({
            access_token: "new-access",
            refresh_token: "new-refresh",
          });
        }
        if (headers.Authorization === "Bearer new-access") {
          return res({ ok: true });
        }
        return res({ message: "Unauthorized", statusCode: 401 }, 401);
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
    expect(tokens.setTokens).toHaveBeenCalledWith("new-access", "new-refresh");
  });

  it("does not attempt a refresh for a 401 on /auth/login", async () => {
    tokens.getAccessToken.mockReturnValue("at-1");
    tokens.getRefreshToken.mockReturnValue("rt-1");

    fetchMock.mockImplementation(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        callLog.push({
          url,
          headers: (init?.headers ?? {}) as Record<string, string>,
        });
        if (url.endsWith("/auth/login")) {
          return res({ message: "Invalid credentials" }, 401);
        }
        return res({ ok: true });
      },
    );

    await expect(
      api.post("/auth/login", { email: "a@b.co", password: "nope" }),
    ).rejects.toMatchObject({
      name: "ApiError",
      message: "Invalid credentials",
      status: 401,
    });
    const refreshCalls = callLog.filter((c) => c.url.endsWith("/auth/refresh"));
    expect(refreshCalls).toHaveLength(0);
  });

  it("posts multipart FormData without a Content-Type header", async () => {
    tokens.getAccessToken.mockReturnValue("tok-1");
    const form = new FormData();
    form.append(
      "file",
      new File(["name,sellingPrice\nA,10"], "data.csv", {
        type: "text/csv",
      }),
    );

    await api.postForm("/inventory/bulk-import", form);

    expect(callLog[0].url).toBe("/api/inventory/bulk-import");
    expect(callLog[0].headers["Content-Type"]).toBeUndefined();
    expect(callLog[0].headers.Authorization).toBe("Bearer tok-1");
  });

  it("clears tokens and rejects when the refresh fails without looping", async () => {
    tokens.getAccessToken.mockReturnValue("old-access");
    tokens.getRefreshToken.mockReturnValue("old-refresh");

    fetchMock.mockImplementation(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        callLog.push({
          url,
          headers: (init?.headers ?? {}) as Record<string, string>,
        });
        if (url.endsWith("/auth/refresh")) {
          return res({ message: "Invalid refresh token" }, 401);
        }
        return res({ message: "Unauthorized", statusCode: 401 }, 401);
      },
    );

    await expect(api.get("/data")).rejects.toMatchObject({
      name: "ApiError",
      status: 401,
    });
    expect(tokens.clearTokens).toHaveBeenCalled();
    const refreshCalls = callLog.filter((c) => c.url.endsWith("/auth/refresh"));
    expect(refreshCalls).toHaveLength(1);
  });
});