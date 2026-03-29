import { createInterface } from "readline";
import {
  getHubSpotAuthUrl,
  exchangeCodeForTokens,
  getPortalId,
} from "@fantasia/integrations/hubspot";
import { saveHubSpotTokens, saveAttioTokens } from "../credentials.js";

const DEFAULT_HUBSPOT_CLIENT_ID = "6af4effd-98b7-4b3c-80b1-eab1723b37d6";
const HUBSPOT_REDIRECT_URI = "https://fantasia.sh/api/auth/cli/hubspot/callback";

const ATTIO_AUTHORIZE_URL = "https://app.attio.com/authorize";
const ATTIO_TOKEN_URL = "https://app.attio.com/oauth/token";
const ATTIO_REDIRECT_URI = "https://fantasia.sh/api/auth/cli/attio/callback";

function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export async function runLogin(options: {
  hubspot?: boolean;
  attio?: boolean;
  apiKey?: string;
}): Promise<void> {
  if (!options.hubspot && !options.attio) {
    console.log("Usage: fantasia login --hubspot");
    console.log("       fantasia login --attio");
    console.log("       fantasia login --attio --api-key <key>");
    return;
  }

  const chalk = (await import("chalk")).default;

  if (options.hubspot) {
    await loginHubSpot(chalk);
  } else if (options.attio) {
    await loginAttio(chalk, options.apiKey);
  }
}

async function loginHubSpot(chalk: typeof import("chalk").default) {
  const open = (await import("open")).default;

  const clientId = process.env.HUBSPOT_CLIENT_ID ?? DEFAULT_HUBSPOT_CLIENT_ID;
  const clientSecret = process.env.HUBSPOT_CLIENT_SECRET;

  if (!clientSecret) {
    console.error(
      chalk.red("HUBSPOT_CLIENT_SECRET environment variable is required.")
    );
    process.exit(1);
  }

  const authUrl = getHubSpotAuthUrl({
    clientId,
    redirectUri: HUBSPOT_REDIRECT_URI,
  });

  console.log(chalk.cyan("Opening browser to authorize with HubSpot..."));
  console.log(chalk.dim(`(or visit: ${authUrl})`));
  console.log();

  open(authUrl).catch(() => {});

  const code = await prompt(
    "Paste the authorization code from the browser here: "
  );

  if (!code) {
    console.error(chalk.red("No code provided. Aborting."));
    process.exit(1);
  }

  try {
    const tokens = await exchangeCodeForTokens(code, {
      clientId,
      clientSecret,
      redirectUri: HUBSPOT_REDIRECT_URI,
    });

    const portalId = await getPortalId(tokens.access_token);

    saveHubSpotTokens({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + tokens.expires_in * 1000,
      portal_id: portalId,
    });

    console.log(
      chalk.green("\n✓ Connected to HubSpot") +
        chalk.dim(` (portal ${portalId})`)
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(chalk.red(`\nLogin failed: ${msg}`));
    process.exit(1);
  }
}

async function loginAttio(
  chalk: typeof import("chalk").default,
  apiKey?: string
) {
  // API key flow (simple)
  if (apiKey) {
    return saveAttioApiKey(chalk, apiKey);
  }

  console.log(chalk.cyan("How would you like to connect Attio?"));
  console.log("  1. API key (from Settings → Developers → API keys)");
  console.log("  2. OAuth (authorize via browser)");
  console.log();

  const choice = await prompt("Choose [1/2]: ");

  if (choice === "1") {
    const key = await prompt("Paste your Attio API key: ");
    return saveAttioApiKey(chalk, key);
  }

  if (choice === "2") {
    return loginAttioOAuth(chalk);
  }

  console.error(chalk.red("Invalid choice."));
  process.exit(1);
}

async function saveAttioApiKey(
  chalk: typeof import("chalk").default,
  apiKey: string
) {
  if (!apiKey) {
    console.error(chalk.red("No API key provided. Aborting."));
    process.exit(1);
  }

  // Verify the key works by hitting the Attio API
  const res = await fetch("https://api.attio.com/v2/self", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    console.error(chalk.red("Invalid API key. Please check and try again."));
    process.exit(1);
  }

  const self = (await res.json()) as Record<string, unknown>;
  const workspace = ((self.data ?? self) as Record<string, unknown>).workspace as { id: string; name: string };

  saveAttioTokens({
    access_token: apiKey,
    auth_type: "api_key",
    workspace_id: workspace.id,
    workspace_name: workspace.name,
  });

  console.log(
    chalk.green("\n✓ Connected to Attio") +
      chalk.dim(` (workspace: ${workspace.name})`)
  );
}

async function loginAttioOAuth(chalk: typeof import("chalk").default) {
  const open = (await import("open")).default;

  const clientId = process.env.ATTIO_CLIENT_ID;
  const clientSecret = process.env.ATTIO_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error(
      chalk.red(
        "ATTIO_CLIENT_ID and ATTIO_CLIENT_SECRET environment variables are required for OAuth."
      )
    );
    console.log(
      chalk.dim("Tip: use --api-key instead for a simpler setup.")
    );
    process.exit(1);
  }

  const state = Math.random().toString(36).slice(2);
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: ATTIO_REDIRECT_URI,
    state,
  });

  const authUrl = `${ATTIO_AUTHORIZE_URL}?${params.toString()}`;

  console.log(chalk.cyan("Opening browser to authorize with Attio..."));
  console.log(chalk.dim(`(or visit: ${authUrl})`));
  console.log();

  open(authUrl).catch(() => {});

  const code = await prompt(
    "Paste the authorization code from the browser here: "
  );

  if (!code) {
    console.error(chalk.red("No code provided. Aborting."));
    process.exit(1);
  }

  try {
    const tokenRes = await fetch(ATTIO_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: ATTIO_REDIRECT_URI,
      }),
    });

    if (!tokenRes.ok) {
      const error = await tokenRes.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    const tokens = (await tokenRes.json()) as {
      access_token: string;
      token_type: string;
    };

    // Get workspace info
    const selfRes = await fetch("https://api.attio.com/v2/self", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const self = (await selfRes.json()) as Record<string, unknown>;
    const workspace = ((self.data ?? self) as Record<string, unknown>).workspace as { id: string; name: string };

    saveAttioTokens({
      access_token: tokens.access_token,
      auth_type: "oauth",
      workspace_id: workspace.id,
      workspace_name: workspace.name,
    });

    console.log(
      chalk.green("\n✓ Connected to Attio") +
        chalk.dim(` (workspace: ${workspace.name})`)
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(chalk.red(`\nLogin failed: ${msg}`));
    process.exit(1);
  }
}
