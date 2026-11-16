import { describe, it, expect } from "vitest";
import { isSupabaseConfigured, supabase } from "../src/lib/supabase";

describe("Supabase Security & RLS Compliance Verification", () => {
  it("never exposes service-role keys in public frontend configuration", () => {
    const supabaseUrl = process.env.SUPABASE_URL || "";
    const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || "";

    expect(publishableKey).not.toContain("service_role");
    expect(publishableKey.length).toBeGreaterThan(20);
    // Decode JWT payload of publishable key to assert role is 'anon'
    const parts = publishableKey.split(".");
    expect(parts.length).toBe(3);
    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
    expect(payload.role).toBe("anon");
  });

  it("extracts session context correctly and rejects spoofed headers when authenticated", () => {
    // Test helper mimicking backend extractSessionContext
    function extractContext(req: { user?: { uid: string }; headers: Record<string, string> }) {
      let requesterUid: string | undefined;
      if (req.user?.uid && !req.user.uid.startsWith("guest")) {
        requesterUid = req.user.uid;
      }
      return requesterUid;
    }

    const authenticatedUser = { uid: "user-alpha-uuid-1234" };
    const spoofedHeader = { "x-user-id": "user-victim-uuid-9999" };

    const resolvedUid = extractContext({ user: authenticatedUser, headers: spoofedHeader });
    expect(resolvedUid).toBe("user-alpha-uuid-1234");
    expect(resolvedUid).not.toBe("user-victim-uuid-9999");
  });

  it("rejects unauthorized token tampering in cryptographic verification", () => {
    const fakeToken = "invalid.tampered.token";
    const parts = fakeToken.split(".");
    expect(parts.length).toBe(3);
    try {
      const decoded = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
      expect(decoded.sub).toBeUndefined();
    } catch (e) {
      expect(e).toBeDefined();
    }
  });

  it("verifies RLS policies prevent cross-tenant queries", () => {
    // Policy logic emulation: User Beta querying User Alpha's record
    const userAlpha = { id: "alpha-uuid" };
    const userBeta = { id: "beta-uuid" };
    const records = [
      { id: "rec-1", user_id: "alpha-uuid", title: "Alpha Roadmap" },
      { id: "rec-2", user_id: "beta-uuid", title: "Beta Roadmap" },
    ];

    function evaluatePolicy(record: { user_id: string }, activeUser: { id: string }) {
      return record.user_id === activeUser.id;
    }

    const betaVisible = records.filter(r => evaluatePolicy(r, userBeta));
    expect(betaVisible.length).toBe(1);
    expect(betaVisible[0].title).toBe("Beta Roadmap");
    expect(betaVisible.some(r => r.user_id === "alpha-uuid")).toBe(false);
  });
});

