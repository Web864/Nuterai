import { describe, expect, it } from "vitest";

import { withSecurityHeaders } from "@/server";

describe("withSecurityHeaders", () => {
  it("adds clickjacking, sniffing, referrer and permissions headers", () => {
    const response = withSecurityHeaders(
      new Response("<html></html>", { headers: { "content-type": "text/html" } }),
    );

    expect(response.headers.get("X-Frame-Options")).toBe("DENY");
    expect(response.headers.get("Content-Security-Policy")).toBe("frame-ancestors 'none'");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(response.headers.get("Strict-Transport-Security")).toContain("max-age=");
    // The barcode/photo scanner needs the camera on our own origin.
    expect(response.headers.get("Permissions-Policy")).toContain("camera=(self)");
  });

  it("keeps headers a route already set", () => {
    const response = withSecurityHeaders(
      new Response("ok", { headers: { "Referrer-Policy": "no-referrer" } }),
    );
    expect(response.headers.get("Referrer-Policy")).toBe("no-referrer");
  });

  it("copies responses whose headers are immutable", async () => {
    const original = Response.redirect("https://example.com/", 302);
    const response = withSecurityHeaders(original);
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://example.com/");
    expect(response.headers.get("X-Frame-Options")).toBe("DENY");
  });
});
