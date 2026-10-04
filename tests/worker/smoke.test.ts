import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

const base = "https://ship60.test";

describe("worker scaffold", () => {
  it("health endpoint responds", async () => {
    const res = await SELF.fetch(`${base}/api/health`);
    expect(res.status).toBe(200);
    const body = await res.json<{ ok: boolean }>();
    expect(body.ok).toBe(true);
  });

  it("public stats returns the contract shape on an empty database", async () => {
    const res = await SELF.fetch(`${base}/api/stats/public`);
    expect(res.status).toBe(200);
    const body = await res.json<{ registrations: number; colleges: number; target: number }>();
    expect(body.registrations).toBe(0);
    expect(body.colleges).toBe(0);
    expect(body.target).toBe(500);
  });

  it("unknown api route returns the error envelope", async () => {
    const res = await SELF.fetch(`${base}/api/does-not-exist`);
    expect(res.status).toBe(404);
    const body = await res.json<{ error: { code: string } }>();
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("sets security headers", async () => {
    const res = await SELF.fetch(`${base}/api/health`);
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("content-security-policy")).toContain("default-src 'self'");
  });
});
