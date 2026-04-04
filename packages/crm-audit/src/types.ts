// Types for CRM audit engine

export interface CrmContact {
  id: string;
  email: string | null;
  firstname: string | null;
  lastname: string | null;
  company: string | null;
  jobtitle: string | null;
  phone: string | null;
  last_activity_date: string | null;
  notes_last_updated: string | null;
  createdate: string | null;
}

export type IssueCategory = "duplicate" | "stale" | "missing_field" | "format";
export type IssueSeverity = "critical" | "high" | "medium" | "low";

export interface AuditIssue {
  category: IssueCategory;
  severity: IssueSeverity;
  record_id: string;
  details: Record<string, unknown>;
}

export interface CategoryScore {
  score: number;
  affectedCount: number;
  totalRecords: number;
  percentAffected: number;
}

export interface AuditResult {
  healthScore: number;
  grade: "A" | "B" | "C" | "D" | "F";
  categories: {
    duplicates: CategoryScore;
    stale: CategoryScore;
    missingFields: CategoryScore;
    format: CategoryScore;
  };
  issues: AuditIssue[];
  totalRecords: number;
}
