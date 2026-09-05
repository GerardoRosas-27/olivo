import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeTrialAccess } from "./trial.ts";

describe("computeTrialAccess", () => {
  const now = Date.parse("2026-09-05T12:00:00.000Z");

  it("allows access during trial even if unverified", () => {
    const r = computeTrialAccess({
      nowMs: now,
      trialEndsAt: "2026-09-20T12:00:00.000Z",
      verifiedAt: null,
      emailVerified: false,
    });
    assert.equal(r.trialActive, true);
    assert.equal(r.hasAccess, true);
    assert.equal(r.locked, false);
    assert.equal(r.daysRemaining, 15);
  });

  it("locks when trial ended and not verified", () => {
    const r = computeTrialAccess({
      nowMs: now,
      trialEndsAt: "2026-08-01T12:00:00.000Z",
      verifiedAt: null,
      emailVerified: false,
    });
    assert.equal(r.trialActive, false);
    assert.equal(r.hasAccess, false);
    assert.equal(r.locked, true);
    assert.equal(r.daysRemaining, 0);
  });

  it("unlocks when nip/email verified after trial", () => {
    const r = computeTrialAccess({
      nowMs: now,
      trialEndsAt: "2026-08-01T12:00:00.000Z",
      verifiedAt: "2026-09-01T00:00:00.000Z",
      emailVerified: true,
    });
    assert.equal(r.nipVerified, true);
    assert.equal(r.hasAccess, true);
    assert.equal(r.locked, false);
  });
});
