import {
  runAudit,
  detectDuplicates,
  detectStaleRecords,
  detectMissingFields,
  detectFormatIssues,
  computeCategoryScore,
  computeHealthScore,
  getMockContacts,
} from "@fantasia/crm-audit";
import type { CrmContact } from "@fantasia/crm-audit";

describe("Audit Engine", () => {
  const contacts = getMockContacts();

  describe("runAudit (full pipeline)", () => {
    it("returns a valid audit result with mock data", () => {
      const result = runAudit();

      expect(result.healthScore).toBeGreaterThanOrEqual(0);
      expect(result.healthScore).toBeLessThanOrEqual(100);
      expect(["A", "B", "C", "D", "F"]).toContain(result.grade);
      expect(result.totalRecords).toBe(20);
      expect(result.issues.length).toBeGreaterThan(0);

      // All 4 categories present
      expect(result.categories.duplicates).toBeDefined();
      expect(result.categories.stale).toBeDefined();
      expect(result.categories.missingFields).toBeDefined();
      expect(result.categories.format).toBeDefined();
    });

    it("produces deterministic results (same data = same score)", () => {
      const r1 = runAudit();
      const r2 = runAudit();
      expect(r1.healthScore).toBe(r2.healthScore);
      expect(r1.grade).toBe(r2.grade);
      expect(r1.issues.length).toBe(r2.issues.length);
    });
  });

  describe("Duplicate Detection", () => {
    it("detects exact email duplicates (case-insensitive)", () => {
      const issues = detectDuplicates(contacts);
      const clusterIds = issues.flatMap(
        (i) => (i.details.cluster_ids as string[]) ?? []
      );
      // 103 and 104 share charlie@wayne.com
      expect(clusterIds).toContain("103");
      expect(clusterIds).toContain("104");
    });

    it("detects fuzzy name + same domain duplicates", () => {
      const issues = detectDuplicates(contacts);
      const clusterIds = issues.flatMap(
        (i) => (i.details.cluster_ids as string[]) ?? []
      );
      // 105 (Diana Prince) and 106 (Dina Prince) at stark.com
      expect(clusterIds).toContain("105");
      expect(clusterIds).toContain("106");
    });

    it("does not flag unrelated contacts as duplicates", () => {
      const issues = detectDuplicates(contacts);
      const clusterIds = issues.flatMap(
        (i) => (i.details.cluster_ids as string[]) ?? []
      );
      // Alice (101) and Bob (102) should not be in any cluster
      expect(clusterIds).not.toContain("101");
      expect(clusterIds).not.toContain("102");
    });

    it("returns empty for all-unique contacts", () => {
      const unique: CrmContact[] = [
        {
          id: "1",
          email: "a@x.com",
          firstname: "A",
          lastname: "B",
          company: "X",
          jobtitle: "T",
          phone: "123",
          last_activity_date: null,
          notes_last_updated: null,
          createdate: null,
        },
        {
          id: "2",
          email: "c@y.com",
          firstname: "C",
          lastname: "D",
          company: "Y",
          jobtitle: "T",
          phone: "456",
          last_activity_date: null,
          notes_last_updated: null,
          createdate: null,
        },
      ];
      expect(detectDuplicates(unique)).toHaveLength(0);
    });
  });

  describe("Stale Record Detection", () => {
    it("detects stale records (no activity in 90+ days)", () => {
      const issues = detectStaleRecords(contacts);
      const staleIds = issues.map((i) => i.record_id);
      // 107 (last activity 120 days ago), 108 (no activity ever), 109 (200 days ago)
      expect(staleIds).toContain("107");
      expect(staleIds).toContain("108");
      expect(staleIds).toContain("109");
    });

    it("excludes new records (created < 90 days ago)", () => {
      const issues = detectStaleRecords(contacts);
      const staleIds = issues.map((i) => i.record_id);
      // 110 was created 30 days ago — should NOT be flagged
      expect(staleIds).not.toContain("110");
    });

    it("does not flag active records", () => {
      const issues = detectStaleRecords(contacts);
      const staleIds = issues.map((i) => i.record_id);
      // 101 (activity 5 days ago) should not be stale
      expect(staleIds).not.toContain("101");
    });
  });

  describe("Missing Fields Detection", () => {
    it("detects records with missing critical fields", () => {
      const issues = detectMissingFields(contacts);
      const affectedIds = issues.map((i) => i.record_id);
      // 111 (missing email, jobtitle, phone), 112 (missing company, jobtitle, phone), 113 (missing email, company, jobtitle, phone)
      expect(affectedIds).toContain("111");
      expect(affectedIds).toContain("112");
      expect(affectedIds).toContain("113");
    });

    it("assigns correct severity based on missing ratio", () => {
      const issues = detectMissingFields(contacts);
      // 113 is missing 4/4 → critical
      const issue113 = issues.find((i) => i.record_id === "113");
      expect(issue113?.severity).toBe("critical");
    });

    it("lists which fields are missing", () => {
      const issues = detectMissingFields(contacts);
      const issue111 = issues.find((i) => i.record_id === "111");
      expect(issue111?.details.missing_fields).toContain("email");
      expect(issue111?.details.missing_fields).toContain("jobtitle");
      expect(issue111?.details.missing_fields).toContain("phone");
    });

    it("does not flag complete records", () => {
      const issues = detectMissingFields(contacts);
      const affectedIds = issues.map((i) => i.record_id);
      expect(affectedIds).not.toContain("101"); // Alice has all fields
    });
  });

  describe("Format Inconsistencies", () => {
    it("detects name casing outliers", () => {
      const issues = detectFormatIssues(contacts);
      const affectedIds = issues.map((i) => i.record_id);
      // 114 (leo messi — lowercase) and 115 (MARIA GARCIA — uppercase) should be flagged
      expect(affectedIds).toContain("114");
      expect(affectedIds).toContain("115");
    });

    it("detects phone format inconsistencies", () => {
      const issues = detectFormatIssues(contacts);
      const phoneIssues = issues.filter((i) =>
        (i.details.issues as string[])?.includes("phone_format")
      );
      expect(phoneIssues.length).toBeGreaterThan(0);
    });

    it("does not flag records matching majority format", () => {
      const issues = detectFormatIssues(contacts);
      const affectedIds = issues.map((i) => i.record_id);
      // 101 (Alice Johnson, (555) 123-4567) matches majority format
      expect(affectedIds).not.toContain("101");
    });
  });

  describe("Duplicate Detection — Performance (bucketed)", () => {
    it("handles large contact lists without O(n²) blowup", () => {
      // Generate 1000 contacts across 50 companies — should complete quickly
      const largeList: CrmContact[] = [];
      for (let i = 0; i < 1000; i++) {
        const companyNum = i % 50;
        largeList.push({
          id: `perf-${i}`,
          email: `user${i}@company${companyNum}.com`,
          firstname: `First${i}`,
          lastname: `Last${i}`,
          company: `Company ${companyNum}`,
          jobtitle: "Role",
          phone: `(555) ${String(i).padStart(3, "0")}-${String(i + 1000).padStart(4, "0")}`,
          last_activity_date: null,
          notes_last_updated: null,
          createdate: null,
        });
      }
      const start = Date.now();
      detectDuplicates(largeList);
      const elapsed = Date.now() - start;
      // Should complete in well under 5 seconds (O(n²) would be much slower at scale)
      expect(elapsed).toBeLessThan(5000);
    });
  });

  describe("Format — Apostrophe and special name handling", () => {
    it("does not flag O'Brien as format inconsistency", () => {
      const nameContacts: CrmContact[] = [
        { id: "1", email: "a@x.com", firstname: "O'Brien", lastname: "Smith", company: "X", jobtitle: "T", phone: "(555) 111-2222", last_activity_date: null, notes_last_updated: null, createdate: null },
        { id: "2", email: "b@x.com", firstname: "Alice", lastname: "Johnson", company: "X", jobtitle: "T", phone: "(555) 222-3333", last_activity_date: null, notes_last_updated: null, createdate: null },
        { id: "3", email: "c@x.com", firstname: "Bob", lastname: "Williams", company: "X", jobtitle: "T", phone: "(555) 333-4444", last_activity_date: null, notes_last_updated: null, createdate: null },
        { id: "4", email: "d@x.com", firstname: "Charlie", lastname: "O'Malley", company: "X", jobtitle: "T", phone: "(555) 444-5555", last_activity_date: null, notes_last_updated: null, createdate: null },
        { id: "5", email: "e@x.com", firstname: "Diana", lastname: "Prince", company: "X", jobtitle: "T", phone: "(555) 555-6666", last_activity_date: null, notes_last_updated: null, createdate: null },
      ];
      const issues = detectFormatIssues(nameContacts);
      const affectedIds = issues.map((i) => i.record_id);
      // O'Brien and O'Malley are valid title case — should not be flagged
      expect(affectedIds).not.toContain("1");
      expect(affectedIds).not.toContain("4");
    });

    it("does not flag hyphenated names like Smith-Jones", () => {
      const nameContacts: CrmContact[] = [
        { id: "1", email: "a@x.com", firstname: "Mary", lastname: "Smith-Jones", company: "X", jobtitle: "T", phone: "(555) 111-2222", last_activity_date: null, notes_last_updated: null, createdate: null },
        { id: "2", email: "b@x.com", firstname: "Alice", lastname: "Johnson", company: "X", jobtitle: "T", phone: "(555) 222-3333", last_activity_date: null, notes_last_updated: null, createdate: null },
        { id: "3", email: "c@x.com", firstname: "Bob", lastname: "Williams", company: "X", jobtitle: "T", phone: "(555) 333-4444", last_activity_date: null, notes_last_updated: null, createdate: null },
      ];
      const issues = detectFormatIssues(nameContacts);
      const affectedIds = issues.map((i) => i.record_id);
      expect(affectedIds).not.toContain("1");
    });
  });

  describe("Stale Records — Data quality notes", () => {
    it("adds data quality notes when both activity dates are null", () => {
      const issues = detectStaleRecords(contacts);
      // 108 has null activity and null notes
      const issue108 = issues.find((i) => i.record_id === "108");
      expect(issue108).toBeDefined();
      const notes = issue108?.details.data_quality_notes as string[];
      expect(notes).toBeDefined();
      expect(notes.some((n: string) => n.includes("No activity dates"))).toBe(true);
    });

    it("adds quality note for very old activity dates (>2 years)", () => {
      const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();
      const oldContacts: CrmContact[] = [
        {
          id: "old1",
          email: "ancient@corp.com",
          firstname: "Ancient",
          lastname: "Contact",
          company: "OldCorp",
          jobtitle: "Manager",
          phone: "(555) 000-0000",
          last_activity_date: daysAgo(800), // > 2 years ago
          notes_last_updated: null,
          createdate: daysAgo(900),
        },
      ];
      const issues = detectStaleRecords(oldContacts);
      expect(issues).toHaveLength(1);
      const notes = issues[0].details.data_quality_notes as string[];
      expect(notes).toBeDefined();
      expect(notes.some((n: string) => n.includes("over 2 years"))).toBe(true);
    });
  });

  describe("Health Score Algorithm", () => {
    it("scores 100 when 0% affected", () => {
      expect(computeCategoryScore(0, 100).score).toBe(100);
    });

    it("scores 85 when 1-5% affected", () => {
      expect(computeCategoryScore(3, 100).score).toBe(85);
    });

    it("scores 70 when 6-15% affected", () => {
      expect(computeCategoryScore(10, 100).score).toBe(70);
    });

    it("scores 50 when 16-30% affected", () => {
      expect(computeCategoryScore(25, 100).score).toBe(50);
    });

    it("scores 30 when 31-50% affected", () => {
      expect(computeCategoryScore(40, 100).score).toBe(30);
    });

    it("scores 10 when 51%+ affected", () => {
      expect(computeCategoryScore(60, 100).score).toBe(10);
    });

    it("maps grades correctly", () => {
      const mkCat = (score: number) => ({
        score,
        affectedCount: 0,
        totalRecords: 100,
        percentAffected: 0,
      });

      // All 100 → A
      expect(
        computeHealthScore({
          duplicates: mkCat(100),
          stale: mkCat(100),
          missingFields: mkCat(100),
          format: mkCat(100),
        }).grade
      ).toBe("A");

      // All 10 → F
      expect(
        computeHealthScore({
          duplicates: mkCat(10),
          stale: mkCat(10),
          missingFields: mkCat(10),
          format: mkCat(10),
        }).grade
      ).toBe("F");
    });
  });
});
