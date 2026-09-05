import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizeOrigin,
  readEnv,
  resolvePublicOrigin,
} from "./production-url.ts";

describe("production-url", () => {
  it("readEnv trims and drops empty", () => {
    assert.equal(readEnv("A", { A: "  x  " }), "x");
    assert.equal(readEnv("A", { A: "   " }), undefined);
    assert.equal(readEnv("A", {}), undefined);
  });

  it("normalizeOrigin strips trailing slashes", () => {
    assert.equal(normalizeOrigin("https://a.example/"), "https://a.example");
  });

  it("prefers BETTER_AUTH_URL", () => {
    assert.equal(
      resolvePublicOrigin({
        BETTER_AUTH_URL: "https://olivo-production.up.railway.app/",
        RAILWAY_PUBLIC_DOMAIN: "ignored.up.railway.app",
      }),
      "https://olivo-production.up.railway.app",
    );
  });

  it("falls back to RAILWAY_PUBLIC_DOMAIN", () => {
    assert.equal(
      resolvePublicOrigin({
        RAILWAY_PUBLIC_DOMAIN: "olivo-production.up.railway.app",
      }),
      "https://olivo-production.up.railway.app",
    );
  });

  it("falls back to RAILWAY_STATIC_URL origin", () => {
    assert.equal(
      resolvePublicOrigin({
        RAILWAY_STATIC_URL: "https://olivo-production.up.railway.app/",
      }),
      "https://olivo-production.up.railway.app",
    );
  });
});
