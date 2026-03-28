import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { refreshAccessToken } from "@fantasia/integrations/hubspot";

export interface HubSpotTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  portal_id: string;
}

export interface AttioTokens {
  access_token: string;
  auth_type: "api_key" | "oauth";
  workspace_id: string;
  workspace_name: string;
}

export interface Credentials {
  hubspot?: HubSpotTokens;
  attio?: AttioTokens;
}

export function getCredentialsPath(): string {
  return join(homedir(), ".fantasia", "credentials.json");
}

export function readCredentials(): Credentials | null {
  try {
    const raw = readFileSync(getCredentialsPath(), "utf-8");
    return JSON.parse(raw) as Credentials;
  } catch {
    return null;
  }
}

export function writeCredentials(creds: Credentials): void {
  const filePath = getCredentialsPath();
  const dir = join(filePath, "..");
  mkdirSync(dir, { recursive: true });
  writeFileSync(filePath, JSON.stringify(creds, null, 2), { mode: 0o600 });
}

export function getHubSpotTokens(): HubSpotTokens | null {
  const creds = readCredentials();
  return creds?.hubspot ?? null;
}

export function saveHubSpotTokens(tokens: HubSpotTokens): void {
  const creds = readCredentials() ?? {};
  creds.hubspot = tokens;
  writeCredentials(creds);
}

export function getAttioTokens(): AttioTokens | null {
  const creds = readCredentials();
  return creds?.attio ?? null;
}

export function saveAttioTokens(tokens: AttioTokens): void {
  const creds = readCredentials() ?? {};
  creds.attio = tokens;
  writeCredentials(creds);
}

export async function ensureFreshToken(
  opts?: { clientId?: string; clientSecret?: string }
): Promise<HubSpotTokens | null> {
  const tokens = getHubSpotTokens();
  if (!tokens) return null;

  // Refresh if within 5 minutes of expiry
  const FIVE_MINUTES = 5 * 60 * 1000;
  if (tokens.expires_at - Date.now() < FIVE_MINUTES) {
    const refreshed = await refreshAccessToken(tokens.refresh_token, {
      clientId: opts?.clientId,
      clientSecret: opts?.clientSecret,
    });
    const updated: HubSpotTokens = {
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      expires_at: Date.now() + refreshed.expires_in * 1000,
      portal_id: tokens.portal_id,
    };
    saveHubSpotTokens(updated);
    return updated;
  }

  return tokens;
}
