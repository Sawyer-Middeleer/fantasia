import { createInterface } from "readline";
import { saveAttioTokens } from "../credentials.js";

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
  apiKey?: string;
}): Promise<void> {
  const chalk = (await import("chalk")).default;

  const key =
    options.apiKey ??
    (await prompt(
      "Paste your Attio API key\n(Settings → Developers → API keys): "
    ));

  if (!key) {
    console.error(chalk.red("No API key provided. Aborting."));
    process.exit(1);
  }

  const res = await fetch("https://api.attio.com/v2/self", {
    headers: { Authorization: `Bearer ${key}` },
  });

  if (!res.ok) {
    console.error(chalk.red("Invalid API key. Please check and try again."));
    process.exit(1);
  }

  const self = (await res.json()) as {
    workspace_id: string;
    workspace_name: string;
  };

  saveAttioTokens({
    access_token: key,
    workspace_id: self.workspace_id,
    workspace_name: self.workspace_name,
  });

  console.log(
    chalk.green("\n✓ Connected to Attio") +
      chalk.dim(` (workspace: ${self.workspace_name})`)
  );
}
