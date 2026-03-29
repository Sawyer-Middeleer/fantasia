import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export interface AttioTokens {
  access_token: string;
  workspace_id: string;
  workspace_name: string;
}

export interface Credentials {
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

export function getAttioTokens(): AttioTokens | null {
  const creds = readCredentials();
  return creds?.attio ?? null;
}

export function saveAttioTokens(tokens: AttioTokens): void {
  const creds = readCredentials() ?? {};
  creds.attio = tokens;
  writeCredentials(creds);
}
