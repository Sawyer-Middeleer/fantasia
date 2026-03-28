import { Client } from "@hubspot/api-client";
import { CrmContact } from "../audit/types";

export const HUBSPOT_SCOPES = [
  "crm.objects.contacts.read",
  "crm.objects.companies.read",
  "crm.objects.deals.read",
  "crm.objects.products.read",
  "crm.objects.users.read",
  "crm.objects.owners.read",
  "crm.lists.read",
  "crm.objects.leads.read",
];

// Properties we need from HubSpot contacts for audit checks
const CONTACT_PROPERTIES = [
  "email",
  "firstname",
  "lastname",
  "company",
  "jobtitle",
  "phone",
  "hs_last_activity_date",
  "notes_last_updated",
  "createdate",
];

export function getHubSpotAuthUrl(opts?: {
  clientId?: string;
  redirectUri?: string;
}): string {
  const clientId = opts?.clientId ?? process.env.HUBSPOT_CLIENT_ID!;
  const redirectUri = opts?.redirectUri ?? process.env.HUBSPOT_REDIRECT_URI!;
  const scope = HUBSPOT_SCOPES.join(" ");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope,
    response_type: "code",
  });

  return `https://app.hubspot.com/oauth/authorize?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  code: string,
  opts?: { clientId?: string; clientSecret?: string; redirectUri?: string }
) {
  const response = await fetch("https://api.hubapi.com/oauth/v1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: opts?.clientId ?? process.env.HUBSPOT_CLIENT_ID!,
      client_secret: opts?.clientSecret ?? process.env.HUBSPOT_CLIENT_SECRET!,
      redirect_uri: opts?.redirectUri ?? process.env.HUBSPOT_REDIRECT_URI!,
      code,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HubSpot token exchange failed: ${error}`);
  }

  return response.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }>;
}

/**
 * Fetch the portal (hub) ID associated with an access token.
 * Uses the HubSpot token info endpoint.
 */
export async function getPortalId(accessToken: string): Promise<string> {
  const response = await fetch(
    `https://api.hubapi.com/oauth/v1/access-tokens/${accessToken}`
  );
  if (!response.ok) {
    throw new Error("Failed to fetch HubSpot token info");
  }
  const info = (await response.json()) as { hub_id: number };
  return String(info.hub_id);
}

export async function refreshAccessToken(
  refreshToken: string,
  opts?: { clientId?: string; clientSecret?: string }
) {
  const response = await fetch("https://api.hubapi.com/oauth/v1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: opts?.clientId ?? process.env.HUBSPOT_CLIENT_ID!,
      client_secret: opts?.clientSecret ?? process.env.HUBSPOT_CLIENT_SECRET!,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HubSpot token refresh failed: ${error}`);
  }

  return response.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }>;
}

export function getHubSpotClient(accessToken: string): Client {
  return new Client({ accessToken });
}

/**
 * Fetch all contacts from a HubSpot portal, paginating through all results.
 * Returns contacts mapped to our CrmContact type for audit processing.
 */
export async function fetchHubSpotContacts(
  accessToken: string
): Promise<CrmContact[]> {
  const client = getHubSpotClient(accessToken);
  const contacts: CrmContact[] = [];
  let after: string | undefined;

  do {
    const response = await client.crm.contacts.basicApi.getPage(
      100, // limit per page
      after,
      CONTACT_PROPERTIES
    );

    for (const contact of response.results) {
      contacts.push({
        id: contact.id,
        email: contact.properties.email || null,
        firstname: contact.properties.firstname || null,
        lastname: contact.properties.lastname || null,
        company: contact.properties.company || null,
        jobtitle: contact.properties.jobtitle || null,
        phone: contact.properties.phone || null,
        hs_last_activity_date:
          contact.properties.hs_last_activity_date || null,
        notes_last_updated: contact.properties.notes_last_updated || null,
        createdate: contact.properties.createdate || null,
      });
    }

    after = response.paging?.next?.after;
  } while (after);

  return contacts;
}
