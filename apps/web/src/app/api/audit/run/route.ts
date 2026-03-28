import { NextRequest, NextResponse } from "next/server";
import { getConvexClient } from "@/lib/convex";
import { api } from "@fantasia/backend/api";
import { runAudit } from "@fantasia/integrations/audit";
import { getSessionUserId } from "@/lib/cookies";
import { fetchHubSpotContacts, refreshAccessToken } from "@fantasia/integrations/hubspot";
import { Id } from "@fantasia/backend/dataModel";
import type { CrmContact } from "@fantasia/integrations/audit";
import { rateLimit } from "@/lib/rate-limit";

// POST /api/audit/run — trigger a new CRM health audit
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    // Always require authentication — never trust client-supplied userId
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Rate limit: 10 req/min per user
    const rl = rateLimit(userId, "audit/run", 10);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again shortly." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
      );
    }

    // Validate input
    if (body.mock !== undefined && typeof body.mock !== "boolean") {
      return NextResponse.json(
        { error: "Invalid parameter: mock must be a boolean" },
        { status: 400 }
      );
    }

    const convex = getConvexClient();
    const useMockData = body.mock === true;

    // Resolve HubSpot access token:
    // 1. Stored OAuth connection (from Convex)
    // 2. Private app token (HUBSPOT_ACCESS_TOKEN env var)
    let accessToken: string | null = null;
    let connectionId: Id<"hubspotConnections"> | undefined = undefined;

    const connection = await convex.query(api.hubspotConnections.getByUser, {
      userId: userId as Id<"users">,
    });

    if (connection) {
      connectionId = connection._id;

      // Refresh token if expired (with 5-minute buffer)
      if (connection.tokenExpiresAt < Date.now() + 5 * 60 * 1000) {
        try {
          const refreshed = await refreshAccessToken(connection.refreshToken);
          accessToken = refreshed.access_token;
          // Update stored tokens
          await convex.mutation(api.hubspotConnections.upsert, {
            userId: userId as Id<"users">,
            portalId: connection.portalId,
            accessToken: refreshed.access_token,
            refreshToken: refreshed.refresh_token,
            scopes: connection.scopes,
            tokenExpiresAt: Date.now() + refreshed.expires_in * 1000,
          });
        } catch {
          // Token refresh failed — don't silently fall back to mock data
          if (!useMockData) {
            return NextResponse.json(
              { error: "Could not access your HubSpot data. Please reconnect your CRM.", reconnect: true },
              { status: 502 }
            );
          }
        }
      } else {
        accessToken = connection.accessToken;
      }
    }

    // Fall back to private app token from env (only when no OAuth connection)
    if (!accessToken && !connection) {
      accessToken = process.env.HUBSPOT_ACCESS_TOKEN || null;
    }

    // Fetch real contacts or use mock data (only when explicitly requested)
    let contacts: CrmContact[] | undefined;
    if (accessToken && !useMockData) {
      try {
        contacts = await fetchHubSpotContacts(accessToken);
      } catch {
        // HubSpot API call failed — return error, never silently use mock data
        return NextResponse.json(
          { error: "Could not access your HubSpot data. Please reconnect your CRM.", reconnect: true },
          { status: 502 }
        );
      }
    } else if (!useMockData && connection) {
      // Had a connection but no valid token — error, don't silently mock
      return NextResponse.json(
        { error: "Could not access your HubSpot data. Please reconnect your CRM.", reconnect: true },
        { status: 502 }
      );
    }

    const result = runAudit({ contacts });

    // Persist to Convex
    const auditId = await convex.mutation(api.audits.create, {
      userId: userId as Id<"users">,
      hubspotConnectionId: connectionId,
      status: "complete",
      startedAt: Date.now(),
      completedAt: Date.now(),
      healthScore: result.healthScore,
      grade: result.grade,
      categoryScores: result.categories,
      totalContacts: result.totalRecords,
    });

    // Insert all issues
    if (result.issues.length > 0) {
      await convex.mutation(api.auditIssues.insertBatch, {
        issues: result.issues.map((issue) => ({
          auditId,
          category: issue.category,
          severity: issue.severity,
          hubspotRecordIds: [issue.record_id],
          details: issue.details,
        })),
      });
    }

    return NextResponse.json({
      audit_id: auditId,
      status: "complete",
      health_score: result.healthScore,
      grade: result.grade,
      categories: result.categories,
      issue_count: result.issues.length,
      total_records: result.totalRecords,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to run audit", details: message },
      { status: 500 }
    );
  }
}
