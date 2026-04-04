import { CrmContact, AuditIssue } from "../types";

const STALE_THRESHOLD_DAYS = 90;

export function detectStaleRecords(contacts: CrmContact[]): AuditIssue[] {
  const now = Date.now();
  const thresholdMs = STALE_THRESHOLD_DAYS * 86400000;
  const issues: AuditIssue[] = [];

  for (const c of contacts) {
    // Exclude records created in the last 90 days
    if (c.createdate) {
      const createdAt = new Date(c.createdate).getTime();
      if (now - createdAt < thresholdMs) continue;
    }

    const lastActivity = c.last_activity_date
      ? new Date(c.last_activity_date).getTime()
      : null;
    const lastNotes = c.notes_last_updated
      ? new Date(c.notes_last_updated).getTime()
      : null;

    const mostRecent = Math.max(lastActivity ?? 0, lastNotes ?? 0);

    // Build data quality notes for date issues
    const dataQualityNotes: string[] = [];
    if (!c.last_activity_date && !c.notes_last_updated) {
      dataQualityNotes.push("No activity dates on record — may indicate a data import without engagement history");
    } else {
      if (!c.last_activity_date) {
        dataQualityNotes.push("Missing last_activity_date — activity tracking may not be configured");
      }
      if (!c.notes_last_updated) {
        dataQualityNotes.push("Missing notes_last_updated — no notes have been logged");
      }
    }

    // Flag suspiciously old lastmodifieddate (> 2 years)
    const twoYearsMs = 730 * 86400000;
    if (lastActivity && now - lastActivity > twoYearsMs) {
      dataQualityNotes.push("Last activity is over 2 years ago — consider archiving or re-engaging");
    }

    // No activity ever, or last activity > 90 days ago
    if (mostRecent === 0 || now - mostRecent > thresholdMs) {
      const daysSinceActivity =
        mostRecent === 0
          ? null
          : Math.floor((now - mostRecent) / 86400000);

      issues.push({
        category: "stale",
        severity: daysSinceActivity === null || daysSinceActivity > 180
          ? "high"
          : "medium",
        record_id: c.id,
        details: {
          days_since_activity: daysSinceActivity,
          last_activity_date: c.last_activity_date,
          last_notes_updated: c.notes_last_updated,
          contact_name: [c.firstname, c.lastname].filter(Boolean).join(" "),
          contact_email: c.email,
          ...(dataQualityNotes.length > 0 && { data_quality_notes: dataQualityNotes }),
        },
      });
    }
  }

  return issues;
}
