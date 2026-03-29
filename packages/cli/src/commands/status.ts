import { readCredentials } from "../credentials.js";

export async function runStatus(options: { json?: boolean }): Promise<void> {
  const chalk = (await import("chalk")).default;

  const creds = readCredentials();
  const attio = creds?.attio ?? null;

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          integrations: {
            attio: attio
              ? {
                  connected: true,
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

  if (attio) {
    console.log(
      `  Attio: ${chalk.green("Connected")} ${chalk.dim(
        `(${attio.workspace_name})`
      )}`
    );
  } else {
    console.log(`  Attio: ${chalk.dim("Not connected")}`);
  }

  console.log();
  if (!attio) {
    console.log(chalk.dim("  Run `fantasia login` to connect."));
  }
  console.log();
}
