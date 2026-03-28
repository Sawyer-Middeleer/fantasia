// Duplicate merge engine: preview what will be merged, execute via HubSpot API

import { Client } from "@hubspot/api-client";
import { MergeCluster, MergePreview, FixSnapshot, SnapshotEntry } from "./types";

interface AuditIssueRecord {
  _id: string;
  hubspotRecordIds: string[];
  details: Record<string, unknown>;
}

const MERGEABLE_FIELDS = [
  "email",
  "firstname",
  "lastname",
  "company",
  "jobtitle",
  "phone",
] as const;

/**
 * Build a merge preview from duplicate audit issues.
 * For each cluster, pick the contact with the most data as primary.
 */
export async function buildMergePreview(
  issues: AuditIssueRecord[],
  hubspotClient: Client
): Promise<MergePreview> {
  const clusters: MergeCluster[] = [];

  for (const issue of issues) {
    const clusterIds = (issue.details.cluster_ids as string[]) ?? issue.hubspotRecordIds;
    if (!clusterIds || clusterIds.length < 2) continue;

    // Fetch current contact data from HubSpot
    const contacts = await Promise.all(
      clusterIds.map(async (id) => {
        try {
          const resp = await hubspotClient.crm.contacts.basicApi.getById(id, MERGEABLE_FIELDS as unknown as string[]);
          return { id, properties: resp.properties };
        } catch {
          return { id, properties: {} as Record<string, string> };
        }
      })
    );

    // Pick primary: the contact with the most non-empty fields
    const scored = contacts.map((c) => ({
      ...c,
      score: Object.values(c.properties).filter((v) => v && v.trim()).length,
    }));
    scored.sort((a, b) => b.score - a.score);

    const keepId = scored[0].id;
    const mergeIds = scored.slice(1).map((c) => c.id);

    // Determine what data from secondaries fills gaps in primary, and track conflicts
    const primaryProps = scored[0].properties;
    const mergedFields: Record<string, { from: string; value: string }> = {};
    const discardedFields: Record<string, { from: string; value: string; primaryValue: string }[]> = {};

    for (const secondary of scored.slice(1)) {
      for (const field of MERGEABLE_FIELDS) {
        const primaryVal = primaryProps[field];
        const secondaryVal = secondary.properties[field];
        if (!secondaryVal || !secondaryVal.trim()) continue;

        if (!primaryVal || !primaryVal.trim()) {
          // Gap fill: primary is empty, take secondary's value
          if (!mergedFields[field]) {
            mergedFields[field] = { from: secondary.id, value: secondaryVal };
          }
        } else if (primaryVal.trim() !== secondaryVal.trim()) {
          // Conflict: both have values, secondary's will be discarded
          if (!discardedFields[field]) discardedFields[field] = [];
          discardedFields[field].push({
            from: secondary.id,
            value: secondaryVal,
            primaryValue: primaryVal,
          });
        }
      }
    }

    clusters.push({
      issueId: issue._id,
      contactIds: clusterIds,
      keepId,
      mergeIds,
      mergedFields,
      discardedFields: Object.keys(discardedFields).length > 0 ? discardedFields : undefined,
    });
  }

  return { type: "merge_duplicates", clusters };
}

/**
 * Execute the merge: update primary with merged fields, then use HubSpot merge API.
 * Returns a snapshot for undo.
 */
export async function executeMerge(
  preview: MergePreview,
  hubspotClient: Client,
  accessToken: string
): Promise<FixSnapshot> {
  const entries: SnapshotEntry[] = [];

  for (const cluster of preview.clusters) {
    // Snapshot all contacts before merge
    for (const contactId of cluster.contactIds) {
      try {
        const resp = await hubspotClient.crm.contacts.basicApi.getById(
          contactId,
          MERGEABLE_FIELDS as unknown as string[]
        );
        entries.push({
          contactId,
          originalValues: { ...resp.properties },
        });
      } catch {
        // Contact may not exist; snapshot what we can
        entries.push({ contactId, originalValues: {} });
      }
    }

    // Update primary contact with merged fields
    if (Object.keys(cluster.mergedFields).length > 0) {
      const updateProps: Record<string, string> = {};
      for (const [field, info] of Object.entries(cluster.mergedFields)) {
        updateProps[field] = info.value;
      }
      await hubspotClient.crm.contacts.basicApi.update(cluster.keepId, {
        properties: updateProps,
      });
    }

    // Merge secondary contacts into primary via HubSpot merge API
    for (const mergeId of cluster.mergeIds) {
      // HubSpot merge: POST /crm/v3/objects/contacts/merge
      await fetch("https://api.hubapi.com/crm/v3/objects/contacts/merge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          primaryObjectId: cluster.keepId,
          objectIdToMerge: mergeId,
        }),
      });
    }
  }

  return {
    type: "merge_duplicates",
    timestamp: Date.now(),
    entries,
  };
}

/**
 * Build a mock merge preview for demo mode (no HubSpot API calls).
 */
export function buildMockMergePreview(
  issues: AuditIssueRecord[]
): MergePreview {
  const clusters: MergeCluster[] = [];

  for (const issue of issues) {
    const clusterIds = (issue.details.cluster_ids as string[]) ?? issue.hubspotRecordIds;
    if (!clusterIds || clusterIds.length < 2) continue;

    const keepId = clusterIds[0];
    const mergeIds = clusterIds.slice(1);

    clusters.push({
      issueId: issue._id,
      contactIds: clusterIds,
      keepId,
      mergeIds,
      mergedFields: {},
    });
  }

  return { type: "merge_duplicates", clusters };
}
