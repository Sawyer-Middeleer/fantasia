import { NextRequest, NextResponse } from "next/server";
import { getConvexClient } from "@/lib/convex";
import { api } from "@fantasia/backend/api";
import { Id } from "@fantasia/backend/dataModel";

// GET /api/audit/[id]/issues — get issues for an audit
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Audit ID is required" }, { status: 400 });
  }

  try {
    const convex = getConvexClient();

    // Verify audit exists
    const audit = await convex.query(api.audits.get, {
      id: id as Id<"audits">,
    });

    if (!audit) {
      return NextResponse.json({ error: "Audit not found" }, { status: 404 });
    }

    const issues = await convex.query(api.auditIssues.getByAudit, {
      auditId: id as Id<"audits">,
    });

    return NextResponse.json({
      audit_id: id,
      issues: issues ?? [],
      total: issues?.length ?? 0,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch audit issues", details: message },
      { status: 500 }
    );
  }
}
