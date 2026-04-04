import { CrmContact, AuditIssue } from "../types";

const REQUIRED_FIELDS: (keyof CrmContact)[] = [
  "email",
  "company",
  "jobtitle",
  "phone",
];

export function detectMissingFields(contacts: CrmContact[]): AuditIssue[] {
  const issues: AuditIssue[] = [];

  for (const c of contacts) {
    const missing: string[] = [];
    for (const field of REQUIRED_FIELDS) {
      const val = c[field];
      if (val === null || val === undefined || (typeof val === "string" && val.trim() === "")) {
        missing.push(field);
      }
    }

    if (missing.length === 0) continue;

    const ratio = missing.length / REQUIRED_FIELDS.length;
    const severity =
      ratio >= 0.75
        ? "critical"
        : ratio >= 0.5
          ? "high"
          : "medium";

    issues.push({
      category: "missing_field",
      severity,
      record_id: c.id,
      details: {
        missing_fields: missing,
        missing_count: missing.length,
        total_required: REQUIRED_FIELDS.length,
        completeness_pct: Math.round((1 - ratio) * 100),
        contact_name: [c.firstname, c.lastname].filter(Boolean).join(" "),
        contact_email: c.email,
      },
    });
  }

  return issues;
}

// Total empty field slots across all contacts
export function totalMissingFieldSlots(contacts: CrmContact[]): {
  empty: number;
  total: number;
} {
  let empty = 0;
  const total = contacts.length * REQUIRED_FIELDS.length;

  for (const c of contacts) {
    for (const field of REQUIRED_FIELDS) {
      const val = c[field];
      if (val === null || val === undefined || (typeof val === "string" && val.trim() === "")) {
        empty++;
      }
    }
  }

  return { empty, total };
}
