// Types for the auto-fix engine

export interface MergePreview {
  type: "merge_duplicates";
  clusters: MergeCluster[];
}

export interface MergeCluster {
  /** The auditIssue ID this cluster came from */
  issueId: string;
  /** CRM record IDs in this duplicate cluster */
  contactIds: string[];
  /** Which contact to keep (the "primary") */
  keepId: string;
  /** Contacts that will be merged into the primary */
  mergeIds: string[];
  /** What data will be merged from secondary contacts (fills gaps in primary) */
  mergedFields: Record<string, { from: string; value: string }>;
  /** Secondary values that differ from primary and would be lost without undo */
  discardedFields?: Record<string, { from: string; value: string; primaryValue: string }[]>;
}

export interface NormalizePreview {
  type: "normalize_format";
  changes: NormalizeChange[];
}

export interface NormalizeChange {
  issueId: string;
  contactId: string;
  fields: {
    field: string;
    currentValue: string;
    newValue: string;
  }[];
}

export interface FixSnapshot {
  type: "merge_duplicates" | "normalize_format";
  timestamp: number;
  entries: SnapshotEntry[];
}

export interface SnapshotEntry {
  contactId: string;
  /** Original field values before the fix */
  originalValues: Record<string, string | null>;
}
