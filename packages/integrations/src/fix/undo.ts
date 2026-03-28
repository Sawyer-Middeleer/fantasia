// Undo engine: restore original values from fix snapshots

import { Client } from "@hubspot/api-client";
import { FixSnapshot } from "./types";

/**
 * Restore original contact values from a fix snapshot.
 * For merge operations, we can only restore field values on the primary contact
 * (merged contacts cannot be un-merged via API).
 */
export async function executeUndo(
  snapshot: FixSnapshot,
  hubspotClient: Client
): Promise<{ restored: number; skipped: number }> {
  let restored = 0;
  let skipped = 0;

  for (const entry of snapshot.entries) {
    if (!entry.originalValues || Object.keys(entry.originalValues).length === 0) {
      skipped++;
      continue;
    }

    // Filter to only string values (skip nulls for undo)
    const props: Record<string, string> = {};
    for (const [key, val] of Object.entries(entry.originalValues)) {
      if (val !== null && val !== undefined) {
        props[key] = val;
      }
    }

    if (Object.keys(props).length === 0) {
      skipped++;
      continue;
    }

    try {
      await hubspotClient.crm.contacts.basicApi.update(entry.contactId, {
        properties: props,
      });
      restored++;
    } catch {
      // Contact may have been deleted (e.g., merged contact)
      skipped++;
    }
  }

  return { restored, skipped };
}
