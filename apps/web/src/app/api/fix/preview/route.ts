import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/cookies";
import { getConvexClient } from "@/lib/convex";
import { canUseFixes } from "@fantasia/billing";
import { getHubSpotClient } from "@fantasia/integrations/hubspot";
import { buildMergePreview, buildMockMergePreview } from "@fantasia/integrations/fix";
import { buildNormalizePreview, buildMockNormalizePreview } from "@fantasia/integrations/fix";
import { api } from "@fantasia/backend/api";
import { Id } from "@fantasia/backend/dataModel";
import { rateLimit } from "@/lib/rate-limit";

// POST /api/fix/preview — generate a fix preview for selected issues
export async function POST(request: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Rate limit: 20 req/min per user
    const rl = rateLimit(userId, "fix/preview", 20);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again shortly." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
      );
    }

    const body = await request.json();
    const { auditId, type, issueIds } = body;

    // Input validation
    if (!auditId || typeof auditId !== "string") {
      return NextResponse.json(
        { error: "auditId is required and must be a string" },
        { status: 400 }
      );
    }
    if (type !== "merge_duplicates" && type !== "normalize_format") {
      return NextResponse.json(
        { error: "type must be 'merge_duplicates' or 'normalize_format'" },
        { status: 400 }
      );
    }
    if (issueIds !== undefined && (!Array.isArray(issueIds) || !issueIds.every((id: unknown) => typeof id === "string"))) {
      return NextResponse.json(
        { error: "issueIds must be an array of strings" },
        { status: 400 }
      );
    }

    const convex = getConvexClient();

    // Verify the audit belongs to this user
    const audit = await convex.query(api.audits.get, {
      id: auditId as Id<"audits">,
    });
    if (!audit || audit.userId !== userId) {
      return NextResponse.json({ error: "Audit not found" }, { status: 404 });
    }

    // Check user plan
    const user = await convex.query(api.users.getById, {
      id: userId as Id<"users">,
    });
    if (!user || !canUseFixes(user.plan)) {
      return NextResponse.json(
        { error: "Upgrade to Pro to use auto-fix features", upgrade: true },
        { status: 403 }
      );
    }

    // Get audit issues
    const allIssues = await convex.query(api.auditIssues.getByAudit, {
      auditId: auditId as Id<"audits">,
    });

    // Filter to the right category and optionally specific IDs
    const category = type === "merge_duplicates" ? "duplicate" : "format";
    let targetIssues = allIssues.filter(
      (i) => i.category === category && !i.fixedAt
    );
    if (issueIds && issueIds.length > 0) {
      const idSet = new Set(issueIds);
      targetIssues = targetIssues.filter((i) => idSet.has(i._id));
    }

    if (targetIssues.length === 0) {
      return NextResponse.json(
        { error: "No unfixed issues found for this category" },
        { status: 404 }
      );
    }

    // Check for HubSpot connection
    const connection = await convex.query(api.hubspotConnections.getByUser, {
      userId: userId as Id<"users">,
    });

    let preview;
    if (connection) {
      const hsClient = getHubSpotClient(connection.accessToken);
      preview =
        type === "merge_duplicates"
          ? await buildMergePreview(targetIssues, hsClient)
          : await buildNormalizePreview(targetIssues, hsClient);
    } else {
      // Demo mode: build preview from audit data
      preview =
        type === "merge_duplicates"
          ? buildMockMergePreview(targetIssues)
          : buildMockNormalizePreview(targetIssues);
    }

    // Store preview as a fix operation
    const fixOpId = await convex.mutation(api.fixOperations.create, {
      auditId: auditId as Id<"audits">,
      userId: userId as Id<"users">,
      type,
      issueIds: targetIssues.map((i) => i._id),
      preview,
    });

    return NextResponse.json({
      fixOperationId: fixOpId,
      preview,
      issueCount: targetIssues.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to generate preview", details: message },
      { status: 500 }
    );
  }
}
