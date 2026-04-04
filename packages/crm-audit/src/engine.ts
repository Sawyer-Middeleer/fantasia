import { CrmContact, AuditResult } from "./types";
import {
  detectDuplicates,
  countDuplicateAffectedRecords,
} from "./checks/duplicates";
import { detectStaleRecords } from "./checks/stale";
import { detectMissingFields } from "./checks/missing-fields";
import { detectFormatIssues } from "./checks/format";
import { computeCategoryScore, computeHealthScore } from "./scoring";
import { getMockContacts } from "./mock-data";

export interface RunAuditOptions {
  // When null/undefined, uses mock data for dev/testing
  contacts?: CrmContact[] | null;
}

export function runAudit(options?: RunAuditOptions): AuditResult {
  const contacts = options?.contacts ?? getMockContacts();
  const totalRecords = contacts.length;

  // Run all 4 checks
  const duplicateIssues = detectDuplicates(contacts);
  const staleIssues = detectStaleRecords(contacts);
  const missingFieldIssues = detectMissingFields(contacts);
  const formatIssues = detectFormatIssues(contacts);

  // Count affected records per category
  const duplicateAffected = countDuplicateAffectedRecords(duplicateIssues);
  const staleAffected = staleIssues.length;
  const missingFieldAffected = missingFieldIssues.length;
  const formatAffected = formatIssues.length;

  // Compute category scores
  const categories = {
    duplicates: computeCategoryScore(duplicateAffected, totalRecords),
    stale: computeCategoryScore(staleAffected, totalRecords),
    missingFields: computeCategoryScore(missingFieldAffected, totalRecords),
    format: computeCategoryScore(formatAffected, totalRecords),
  };

  // Compute composite health score
  const { score, grade } = computeHealthScore(categories);

  return {
    healthScore: score,
    grade,
    categories,
    issues: [
      ...duplicateIssues,
      ...staleIssues,
      ...missingFieldIssues,
      ...formatIssues,
    ],
    totalRecords,
  };
}
