"use strict";
const {describe, it} = require("node:test");
const assert = require("node:assert/strict");
const {parseArgs, run} = require("../scripts/beta-access");

function fakeAuth(initial) {
  const users = new Map([[initial.uid, {...initial}]]);
  const calls = [];
  return {
    calls,
    getUserByEmail: async (email) => {
      const u = [...users.values()].find((x) => x.email === email);
      if (!u) throw new Error("auth/user-not-found");
      return u;
    },
    getUser: async (uid) => users.get(uid),
    setCustomUserClaims: async (uid, claims) => {
      calls.push(["claims", uid, claims]);
      users.get(uid).customClaims = claims;
    },
    revokeRefreshTokens: async (uid) => calls.push(["revoke", uid]),
  };
}

describe("beta-access script", () => {
  it("requires an explicit project and a valid email", () => {
    assert.throws(() => parseArgs(["grant", "a@b.co"]), /--project/);
    assert.throws(() => parseArgs(["grant", "nope", "--project", "p"]), /email/);
    assert.throws(() => parseArgs(["delete", "a@b.co", "--project", "p"]), /action/);
  });

  it("refuses the production project without an explicit override", () => {
    assert.throws(() => parseArgs(["grant", "a@b.co", "--project", "coach-core-ai"]),
        /refusing to touch production/);
    assert.equal(parseArgs(["grant", "a@b.co", "--project", "coach-core-ai",
      "--i-understand-this-is-production"]).prodOk, true);
  });

  it("grant sets beta and keeps other claims", async () => {
    const auth = fakeAuth({uid: "u1", email: "c@x.io", emailVerified: true,
      customClaims: {role: "coach"}});
    const out = await run(auth, {action: "grant", email: "c@x.io"});
    assert.equal(out.beta, true);
    assert.deepEqual(auth.calls[0], ["claims", "u1", {role: "coach", beta: true}]);
  });

  it("revoke removes beta and revokes refresh tokens", async () => {
    const auth = fakeAuth({uid: "u1", email: "c@x.io", emailVerified: true,
      customClaims: {beta: true}});
    const out = await run(auth, {action: "revoke", email: "c@x.io"});
    assert.equal(out.beta, false);
    assert.deepEqual(auth.calls.map((c) => c[0]), ["claims", "revoke"]);
  });
});
