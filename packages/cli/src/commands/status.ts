import { readCredentials } from "../credentials.js";

export async function runStatus(options: { json?: boolean }): Promise<void> {
  const chalk = (await import("chalk")).default;

  const creds = readCredentials();
  const hubspot = creds?.hubspot ?? null;
  const attio = creds?.attio ?? null;

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          integrations: {
            hubspot: hubspot
              ? {
                  connected: true,
                  portal_id: hubspot.portal_id,
                  expires_at: hubspot.expires_at,
                }
              : { connected: false },
            attio: attio
              ? {
                  connected: true,
                  auth_type: attio.auth_type,
                  workspace_id: attio.workspace_id,
                  workspace_name: attio.workspace_name,
                }
              : { connected: false },
          },
        },
        null,
        2
      )
    );
    return;
  }

  console.log();
  console.log(chalk.bold.white("  Integrations:"));
  console.log(chalk.dim("  ─────────────────────────────────────────"));

  if (hubspot) {
    const expiresIn = hubspot.expires_at - Date.now();
    const expiresMinutes = Math.round(expiresIn / 60_000);
    const expiryText =
      expiresIn > 0
        ? `token expires in ${expiresMinutes} min`
        : "token expired";
    console.log(
      `  HubSpot: ${chalk.green("Connected")} ${chalk.dim(
        `(portal ${hubspot.portal_id}, ${expiryText})`
      )}`
    );
  } else {
    console.log(`  HubSpot: ${chalk.dim("Not connected")}`);
  }

  if (attio) {
    console.log(
      `  Attio:   ${chalk.green("Connected")} ${chalk.dim(
        `(${attio.workspace_name}, ${attio.auth_type})`
      )}`
    );
  } else {
    console.log(`  Attio:   ${chalk.dim("Not connected")}`);
  }

  console.log();
  if (!hubspot && !attio) {
    console.log(chalk.dim("  Run `fantasia login --hubspot` or `fantasia login --attio` to connect."));
  }
  console.log();
}
