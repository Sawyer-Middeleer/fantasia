/**
 * Integration test: runs the full audit pipeline against the real HubSpot
 * developer test account (portalId 245540471).
 *
 * Requires HUBSPOT_ACCESS_TOKEN env var or a valid token in hubspot.config.yml.
 * Skip in CI with: jest --testPathIgnorePatterns hubspot-integration
 */

import { fetchHubSpotContacts } from "@fantasia/integrations/hubspot";
import { runAudit } from "@fantasia/integrations/audit";
import type { CrmContact } from "@fantasia/integrations/audit";

const ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;

const describeIfToken = ACCESS_TOKEN ? describe : describe.skip;

describeIfToken("HubSpot Integration (real API)", () => {
  let contacts: CrmContact[];

  beforeAll(async () => {
    contacts = await fetchHubSpotContacts(ACCESS_TOKEN!);
  }, 30_000);

  it("fetches contacts from HubSpot", () => {
    expect(contacts.length).toBeGreaterThan(0);
    // Verify shape matches CrmContact
    const first = contacts[0];
    expect(first).toHaveProperty("id");
    expect(first).toHaveProperty("email");
    expect(first).toHaveProperty("firstname");
    expect(first).toHaveProperty("lastname");
    expect(first).toHaveProperty("company");
    expect(first).toHaveProperty("jobtitle");
    expect(first).toHaveProperty("phone");
    expect(first).toHaveProperty("createdate");
  });

  it("runs full audit against real contacts", () => {
    const result = runAudit({ contacts });

    expect(result.healthScore).toBeGreaterThanOrEqual(0);
    expect(result.healthScore).toBeLessThanOrEqual(100);
    expect(["A", "B", "C", "D", "F"]).toContain(result.grade);
    expect(result.totalRecords).toBe(contacts.length);

    // All 4 categories computed
    expect(result.categories.duplicates.score).toBeDefined();
    expect(result.categories.stale.score).toBeDefined();
    expect(result.categories.missingFields.score).toBeDefined();
    expect(result.categories.format.score).toBeDefined();

    console.log("\n=== HubSpot Integration Audit Results ===");
    console.log(`Total contacts: ${result.totalRecords}`);
    console.log(`Health score:   ${result.healthScore}/100 (${result.grade})`);
    console.log(`Duplicates:     ${result.categories.duplicates.affectedCount} affected (score: ${result.categories.duplicates.score})`);
    console.log(`Stale:          ${result.categories.stale.affectedCount} affected (score: ${result.categories.stale.score})`);
    console.log(`Missing fields: ${result.categories.missingFields.affectedCount} affected (score: ${result.categories.missingFields.score})`);
    console.log(`Format issues:  ${result.categories.format.affectedCount} affected (score: ${result.categories.format.score})`);
    console.log(`Total issues:   ${result.issues.length}`);
    console.log("=========================================\n");
  });

  it("all 4 category scores are computed", () => {
    const result = runAudit({ contacts });
    // Each category score is a number 0-100
    expect(result.categories.duplicates.score).toBeGreaterThanOrEqual(0);
    expect(result.categories.stale.score).toBeGreaterThanOrEqual(0);
    expect(result.categories.missingFields.score).toBeGreaterThanOrEqual(0);
    expect(result.categories.format.score).toBeGreaterThanOrEqual(0);
  });

  // These tests require seeded test data (run scripts/seed-hubspot-test-data.ts first).
  // With only HubSpot sample contacts, duplicates/stale/format won't fire.
  const describeSeeded = contacts?.length > 10 ? describe : describe.skip;

  describeSeeded("with seeded test data (50+ contacts)", () => {
    it("duplicate check finds issues", () => {
      const result = runAudit({ contacts });
      const dupeIssues = result.issues.filter(
        (i) => i.category === "duplicate"
      );
      expect(dupeIssues.length).toBeGreaterThan(0);
    });

    it("stale check finds issues", () => {
      const result = runAudit({ contacts });
      const staleIssues = result.issues.filter((i) => i.category === "stale");
      expect(staleIssues.length).toBeGreaterThan(0);
    });

    it("missing fields check finds issues", () => {
      const result = runAudit({ contacts });
      const missingIssues = result.issues.filter(
        (i) => i.category === "missing_field"
      );
      expect(missingIssues.length).toBeGreaterThan(0);
    });

    it("format check finds issues", () => {
      const result = runAudit({ contacts });
      const formatIssues = result.issues.filter(
        (i) => i.category === "format"
      );
      expect(formatIssues.length).toBeGreaterThan(0);
    });
  });
});
