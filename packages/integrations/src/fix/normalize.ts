// Format normalization engine: fix phone numbers and name casing

import { Client } from "@hubspot/api-client";
import { NormalizePreview, NormalizeChange, FixSnapshot, SnapshotEntry } from "./types";

interface AuditIssueRecord {
  _id: string;
  hubspotRecordIds: string[];
  details: Record<string, unknown>;
}

/**
 * Convert a name string to Title Case.
 * Handles: "JOHN DOE" → "John Doe", "john doe" → "John Doe"
 */
function toTitleCase(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Normalize a US phone number to (555) 123-4567 format.
 * Falls back to E.164 for international numbers.
 */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  // US 10-digit
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  // US 11-digit (1 + 10)
  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  // International: return E.164
  if (digits.length > 10) {
    return `+${digits}`;
  }

  // Too short to normalize meaningfully
  return phone.trim();
}

/**
 * Build a normalization preview from format audit issues.
 */
export async function buildNormalizePreview(
  issues: AuditIssueRecord[],
  hubspotClient: Client
): Promise<NormalizePreview> {
  const changes: NormalizeChange[] = [];

  for (const issue of issues) {
    const contactId = issue.hubspotRecordIds[0];
    if (!contactId) continue;

    const issueList = (issue.details.issues as string[]) ?? [];
    if (issueList.length === 0) continue;

    // Fetch current values from HubSpot
    let currentProps: Record<string, string | null>;
    try {
      const resp = await hubspotClient.crm.contacts.basicApi.getById(contactId, [
        "firstname",
        "lastname",
        "phone",
      ]);
      currentProps = resp.properties as Record<string, string | null>;
    } catch {
      continue;
    }

    const fields: NormalizeChange["fields"] = [];

    for (const issueName of issueList) {
      const firstname = currentProps.firstname;
      const lastname = currentProps.lastname;
      const phone = currentProps.phone;

      if (issueName === "firstname_casing" && firstname) {
        const newVal = toTitleCase(firstname);
        if (newVal !== firstname) {
          fields.push({ field: "firstname", currentValue: firstname, newValue: newVal });
        }
      }
      if (issueName === "lastname_casing" && lastname) {
        const newVal = toTitleCase(lastname);
        if (newVal !== lastname) {
          fields.push({ field: "lastname", currentValue: lastname, newValue: newVal });
        }
      }
      if (issueName === "phone_format" && phone) {
        const newVal = normalizePhone(phone);
        if (newVal !== phone) {
          fields.push({ field: "phone", currentValue: phone, newValue: newVal });
        }
      }
    }

    if (fields.length > 0) {
      changes.push({ issueId: issue._id, contactId, fields });
    }
  }

  return { type: "normalize_format", changes };
}

/**
 * Execute format normalization: update contacts in HubSpot.
 * Returns a snapshot for undo.
 */
export async function executeNormalize(
  preview: NormalizePreview,
  hubspotClient: Client
): Promise<FixSnapshot> {
  const entries: SnapshotEntry[] = [];

  for (const change of preview.changes) {
    // Snapshot current values
    const originalValues: Record<string, string | null> = {};
    for (const f of change.fields) {
      originalValues[f.field] = f.currentValue;
    }
    entries.push({ contactId: change.contactId, originalValues });

    // Apply the normalized values
    const updateProps: Record<string, string> = {};
    for (const f of change.fields) {
      updateProps[f.field] = f.newValue;
    }

    await hubspotClient.crm.contacts.basicApi.update(change.contactId, {
      properties: updateProps,
    });
  }

  return {
    type: "normalize_format",
    timestamp: Date.now(),
    entries,
  };
}

/**
 * Build a mock normalization preview for demo mode.
 */
export function buildMockNormalizePreview(
  issues: AuditIssueRecord[]
): NormalizePreview {
  const changes: NormalizeChange[] = [];

  for (const issue of issues) {
    const contactId = issue.hubspotRecordIds[0];
    if (!contactId) continue;

    const issueList = (issue.details.issues as string[]) ?? [];
    const fields: NormalizeChange["fields"] = [];

    for (const issueName of issueList) {
      if (issueName === "firstname_casing") {
        const name = (issue.details.contact_name as string)?.split(" ")[0] ?? "";
        fields.push({
          field: "firstname",
          currentValue: name,
          newValue: toTitleCase(name),
        });
      }
      if (issueName === "lastname_casing") {
        const parts = (issue.details.contact_name as string)?.split(" ") ?? [];
        const last = parts.slice(1).join(" ") || "";
        fields.push({
          field: "lastname",
          currentValue: last,
          newValue: toTitleCase(last),
        });
      }
      if (issueName === "phone_format") {
        const phone = (issue.details.phone_value as string) ?? "";
        fields.push({
          field: "phone",
          currentValue: phone,
          newValue: normalizePhone(phone),
        });
      }
    }

    if (fields.length > 0) {
      changes.push({ issueId: issue._id, contactId, fields });
    }
  }

  return { type: "normalize_format", changes };
}
