import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isEmailVerificationEnabled } from "./email-verification.ts";

describe("isEmailVerificationEnabled", () => {
  it("defaults to false when unset", () => {
    assert.equal(isEmailVerificationEnabled({}), false);
    assert.equal(isEmailVerificationEnabled({ EMAIL_VERIFICATION_ENABLED: "" }), false);
    assert.equal(isEmailVerificationEnabled({ EMAIL_VERIFICATION_ENABLED: "  " }), false);
  });

  it("is true only for true/1", () => {
    assert.equal(isEmailVerificationEnabled({ EMAIL_VERIFICATION_ENABLED: "true" }), true);
    assert.equal(isEmailVerificationEnabled({ EMAIL_VERIFICATION_ENABLED: "TRUE" }), true);
    assert.equal(isEmailVerificationEnabled({ EMAIL_VERIFICATION_ENABLED: "1" }), true);
  });

  it("is false for other values", () => {
    assert.equal(isEmailVerificationEnabled({ EMAIL_VERIFICATION_ENABLED: "false" }), false);
    assert.equal(isEmailVerificationEnabled({ EMAIL_VERIFICATION_ENABLED: "yes" }), false);
    assert.equal(isEmailVerificationEnabled({ EMAIL_VERIFICATION_ENABLED: "0" }), false);
  });
});
