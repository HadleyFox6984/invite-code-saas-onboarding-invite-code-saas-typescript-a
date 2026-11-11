import test from "node:test";
import assert from "node:assert/strict";
import { acceptInvite } from "./onboarding_service.ts";

test("only tenant-shaped invite codes enter onboarding", () => {
  assert.equal(acceptInvite("TEAM-A1B2C3"), true);
  assert.equal(acceptInvite("PUBLIC-A1B2C3"), false);
  assert.equal(acceptInvite("TEAM-short"), false);
});
