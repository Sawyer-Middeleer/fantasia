import { NextResponse } from "next/server";
import { getHubSpotAuthUrl } from "@fantasia/integrations/hubspot";

// POST /api/auth/hubspot — initiate HubSpot OAuth
export async function POST() {
  try {
    const authUrl = getHubSpotAuthUrl();
    return NextResponse.json({ url: authUrl });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate HubSpot auth URL" },
      { status: 500 }
    );
  }
}
