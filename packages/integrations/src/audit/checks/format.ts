import { CrmContact, AuditIssue } from "../types";

type NameCasing = "title_case" | "lower_case" | "upper_case" | "mixed";
type PhoneFormat =
  | "parenthesized" // (555) 123-4567
  | "dashed" // 555-123-4567
  | "dotted" // 555.123.4567
  | "digits_only" // 5551234567
  | "international" // +1-555-123-4567 or +15551234567
  | "other";

function detectNameCasing(name: string | null): NameCasing | null {
  if (!name || name.trim() === "") return null;
  const trimmed = name.trim();
  if (trimmed === trimmed.toLowerCase()) return "lower_case";
  if (trimmed === trimmed.toUpperCase()) return "upper_case";
  // Title case: each word starts uppercase, rest lowercase
  // Handles initials like "S." or "J.", multi-word names like "Van Der Berg",
  // apostrophe names like "O'Brien", "O'Malley", and hyphenated names like "Smith-Jones"
  if (/^([A-Z][a-z]*(?:'[A-Z][a-z]*)*\.?[-\s]*)+$/.test(trimmed)) return "title_case";
  return "mixed";
}

function detectPhoneFormat(phone: string | null): PhoneFormat | null {
  if (!phone || phone.trim() === "") return null;
  const p = phone.trim();
  if (/^\(\d{3}\)\s?\d{3}-\d{4}$/.test(p)) return "parenthesized";
  if (/^\d{3}-\d{3}-\d{4}$/.test(p)) return "dashed";
  if (/^\d{3}\.\d{3}\.\d{4}$/.test(p)) return "dotted";
  if (/^\d{10,11}$/.test(p)) return "digits_only";
  if (/^\+/.test(p)) return "international";
  return "other";
}

function majorityFormat<T>(values: (T | null)[]): T | null {
  const counts = new Map<T, number>();
  for (const v of values) {
    if (v === null) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  let best: T | null = null;
  let bestCount = 0;
  for (const [k, c] of counts) {
    if (c > bestCount) {
      best = k;
      bestCount = c;
    }
  }
  return best;
}

export function detectFormatIssues(contacts: CrmContact[]): AuditIssue[] {
  // Determine majority formats
  const firstNameCasings = contacts.map((c) => detectNameCasing(c.firstname));
  const lastNameCasings = contacts.map((c) => detectNameCasing(c.lastname));
  const phoneFormats = contacts.map((c) => detectPhoneFormat(c.phone));

  const majorityFirstName = majorityFormat(firstNameCasings);
  const majorityLastName = majorityFormat(lastNameCasings);
  const majorityPhone = majorityFormat(phoneFormats);

  const issues: AuditIssue[] = [];

  for (let i = 0; i < contacts.length; i++) {
    const c = contacts[i];
    const problems: string[] = [];
    const details: Record<string, unknown> = {
      contact_name: [c.firstname, c.lastname].filter(Boolean).join(" "),
      contact_email: c.email,
    };

    // Check first name casing
    const fnCase = firstNameCasings[i];
    if (fnCase && majorityFirstName && fnCase !== majorityFirstName) {
      problems.push("firstname_casing");
      details.firstname_casing = fnCase;
      details.expected_firstname_casing = majorityFirstName;
    }

    // Check last name casing
    const lnCase = lastNameCasings[i];
    if (lnCase && majorityLastName && lnCase !== majorityLastName) {
      problems.push("lastname_casing");
      details.lastname_casing = lnCase;
      details.expected_lastname_casing = majorityLastName;
    }

    // Check phone format
    const pFmt = phoneFormats[i];
    if (pFmt && majorityPhone && pFmt !== majorityPhone) {
      problems.push("phone_format");
      details.phone_format = pFmt;
      details.expected_phone_format = majorityPhone;
      details.phone_value = c.phone;
    }

    if (problems.length > 0) {
      details.issues = problems;
      issues.push({
        category: "format",
        severity: problems.length >= 2 ? "medium" : "low",
        record_id: c.id,
        details,
      });
    }
  }

  return issues;
}
