import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/cookies";
import { getConvexClient } from "@/lib/convex";
import { getHubSpotClient } from "@fantasia/integrations/hubspot";
import { executeUndo } from "@fantasia/integrations/fix";
import { api } from "@fantasia/backend/api";
import { Id } from "@fantasia/backend/dataModel";

// POST /api/fix/undo — undo a previously executed fix operation
export async function POST(request: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const { fixOperationId } = body as { fixOperationId: string };

    if (!fixOperationId) {
      return NextResponse.json(
        { error: "fixOperationId is required" },
        { status: 400 }
      );
    }

    const convex = getConvexClient();

    // Get the fix operation
    const fixOp = await convex.query(api.fixOperations.getById, {
      id: fixOperationId as Id<"fixOperations">,
    });
    if (!fixOp) {
      return NextResponse.json({ error: "Fix operation not found" }, { status: 404 });
    }
    if (fixOp.status !== "executed") {
      return NextResponse.json(
        { error: `Cannot undo: operation is ${fixOp.status}` },
        { status: 409 }
      );
    }

    // Check 30-day undo window
    if (fixOp.expiresAt && Date.now() > fixOp.expiresAt) {
      return NextResponse.json(
        { error: "Undo window has expired (30 days)" },
        { status: 410 }
      );
    }

    if (!fixOp.snapshot) {
      return NextResponse.json(
        { error: "No snapshot available for undo" },
        { status: 409 }
      );
    }

    // Execute undo via HubSpot
    const connection = await convex.query(api.hubspotConnections.getByUser, {
      userId: userId as Id<"users">,
    });

    let result = { restored: 0, skipped: 0 };

    if (connection) {
      const hsClient = getHubSpotClient(connection.accessToken);
      result = await executeUndo(fixOp.snapshot, hsClient);
    }

    // Mark fix operation as undone
    await convex.mutation(api.fixOperations.markUndone, {
      id: fixOperationId as Id<"fixOperations">,
    });

    // Clear fixed status on audit issues
    for (const issueId of fixOp.issueIds) {
      await convex.mutation(api.auditIssues.clearFixed, {
        id: issueId as Id<"auditIssues">,
      });
    }

    return NextResponse.json({
      status: "undone",
      fixOperationId,
      restored: result.restored,
      skipped: result.skipped,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to undo fix", details: message },
      { status: 500 }
    );
  }
}
