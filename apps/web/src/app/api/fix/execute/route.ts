import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/cookies";
import { getConvexClient } from "@/lib/convex";
import { canUseFixes } from "@fantasia/billing";
import { getHubSpotClient } from "@fantasia/integrations/hubspot";
import { executeMerge } from "@fantasia/integrations/fix";
import { executeNormalize } from "@fantasia/integrations/fix";
import { api } from "@fantasia/backend/api";
import { Id } from "@fantasia/backend/dataModel";
import { rateLimit } from "@/lib/rate-limit";

// POST /api/fix/execute — execute a previewed fix operation
export async function POST(request: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Rate limit: 5 req/min per user
    const rl = rateLimit(userId, "fix/execute", 5);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again shortly." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
      );
    }

    const body = await request.json();
    const { fixOperationId } = body;

    // Input validation
    if (!fixOperationId || typeof fixOperationId !== "string") {
      return NextResponse.json(
        { error: "fixOperationId is required and must be a string" },
        { status: 400 }
      );
    }

    const convex = getConvexClient();

    // Verify user plan
    const user = await convex.query(api.users.getById, {
      id: userId as Id<"users">,
    });
    if (!user || !canUseFixes(user.plan)) {
      return NextResponse.json(
        { error: "Upgrade to Pro to use auto-fix features", upgrade: true },
        { status: 403 }
      );
    }

    // Get the fix operation
    const fixOp = await convex.query(api.fixOperations.getById, {
      id: fixOperationId as Id<"fixOperations">,
    });
    if (!fixOp) {
      return NextResponse.json({ error: "Fix operation not found" }, { status: 404 });
    }
    // Ownership check: only the user who created this fix can execute it
    if (fixOp.userId !== userId) {
      return NextResponse.json({ error: "Fix operation not found" }, { status: 404 });
    }
    if (fixOp.status !== "preview") {
      return NextResponse.json(
        { error: `Cannot execute: operation is ${fixOp.status}` },
        { status: 409 }
      );
    }

    // Check HubSpot connection
    const connection = await convex.query(api.hubspotConnections.getByUser, {
      userId: userId as Id<"users">,
    });

    let snapshot;

    if (connection) {
      const hsClient = getHubSpotClient(connection.accessToken);

      if (fixOp.type === "merge_duplicates") {
        snapshot = await executeMerge(fixOp.preview, hsClient, connection.accessToken);
      } else {
        snapshot = await executeNormalize(fixOp.preview, hsClient);
      }
    } else {
      // Demo mode: create a mock snapshot (no real HubSpot calls)
      snapshot = {
        type: fixOp.type,
        timestamp: Date.now(),
        entries: [],
      };
    }

    // Mark fix operation as executed with snapshot
    await convex.mutation(api.fixOperations.markExecuted, {
      id: fixOperationId as Id<"fixOperations">,
      snapshot,
    });

    // Mark individual audit issues as fixed
    for (const issueId of fixOp.issueIds) {
      await convex.mutation(api.auditIssues.markFixed, {
        id: issueId as Id<"auditIssues">,
        fixSnapshot: { fixOperationId },
      });
    }

    return NextResponse.json({
      status: "executed",
      fixOperationId,
      fixedIssueCount: fixOp.issueIds.length,
      undoAvailableUntil: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ).toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to execute fix", details: message },
      { status: 500 }
    );
  }
}
