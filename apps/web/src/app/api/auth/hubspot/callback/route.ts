import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens, getPortalId, HUBSPOT_SCOPES } from "@fantasia/integrations/hubspot";
import { getSessionUserId } from "@/lib/cookies";
import { getConvexClient } from "@/lib/convex";
import { api } from "@fantasia/backend/api";
import { Id } from "@fantasia/backend/dataModel";

// GET /api/auth/hubspot/callback — handle OAuth callback from HubSpot
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.json(
      { error: "Missing authorization code" },
      { status: 400 }
    );
  }

  try {
    // Require an authenticated session — no anonymous OAuth connections
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const tokens = await exchangeCodeForTokens(code);
    const tokenExpiresAt = Date.now() + tokens.expires_in * 1000;

    // Extract the real portal ID from HubSpot token info
    const portalId = await getPortalId(tokens.access_token);

    const convex = getConvexClient();

    // Store the HubSpot connection scoped to this user + portal
    await convex.mutation(api.hubspotConnections.upsert, {
      userId: userId as Id<"users">,
      portalId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      scopes: HUBSPOT_SCOPES,
      tokenExpiresAt,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return NextResponse.redirect(`${appUrl}/?hubspot=connected`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "OAuth callback failed", details: message },
      { status: 500 }
    );
  }
}
