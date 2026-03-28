export { runAudit } from "./engine";
export { computeCategoryScore, computeHealthScore } from "./scoring";
export { getMockContacts } from "./mock-data";
export { detectDuplicates, countDuplicateAffectedRecords } from "./checks/duplicates";
export { detectStaleRecords } from "./checks/stale";
export { detectMissingFields } from "./checks/missing-fields";
export { detectFormatIssues } from "./checks/format";
export type {
  CrmContact,
  AuditIssue,
  AuditResult,
  CategoryScore,
  IssueCategory,
  IssueSeverity,
} from "./types";
