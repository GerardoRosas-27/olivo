import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeEmailServerBase } from "./send.ts";

describe("normalizeEmailServerBase", () => {
  it("trims and strips trailing slashes", () => {
    assert.equal(
      normalizeEmailServerBase("  https://email.example/  "),
      "https://email.example",
    );
  });

  it("prepends https when scheme is missing", () => {
    assert.equal(
      normalizeEmailServerBase("email-server-production-45a4.up.railway.app"),
      "https://email-server-production-45a4.up.railway.app",
    );
  });

  it("keeps http and https schemes", () => {
    assert.equal(
      normalizeEmailServerBase("http://localhost:3001/"),
      "http://localhost:3001",
    );
    assert.equal(
      normalizeEmailServerBase("https://email-server.up.railway.app"),
      "https://email-server.up.railway.app",
    );
  });
});
