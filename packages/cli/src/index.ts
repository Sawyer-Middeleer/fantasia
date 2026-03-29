import { Command } from "commander";
import { runLogin } from "./commands/login.js";
import { runAudit } from "./commands/audit.js";
import { runFix } from "./commands/fix.js";
import { runStatus } from "./commands/status.js";

const pkg = { name: "fantasia", version: "0.1.0" };

const program = new Command();

program
  .name(pkg.name)
  .description("A collection of micro tools for building and running a business")
  .version(pkg.version);

program
  .command("login")
  .description("Authenticate with Attio")
  .option("--api-key <key>", "API key (skip interactive prompt)")
  .action(async (options: { apiKey?: string }) => {
    await runLogin(options);
  });

program
  .command("audit")
  .description("Run a CRM data-quality audit")
  .option("--json", "Output results as JSON")
  .option("--threshold <score>", "Minimum passing health score (exit 1 if below)")
  .action(async (options: { json?: boolean; threshold?: string }) => {
    await runAudit(options);
  });

program
  .command("fix")
  .description("Preview and apply auto-fixes for CRM data issues")
  .option("--execute", "Apply the fixes (default: dry-run preview)")
  .option("--json", "Output results as JSON")
  .option("-y, --yes", "Skip confirmation prompt")
  .action(
    async (options: {
      execute?: boolean;
      json?: boolean;
      yes?: boolean;
    }) => {
      await runFix(options);
    }
  );

program
  .command("status")
  .description("Show connection status for integrations")
  .option("--json", "Output results as JSON")
  .action(async (options: { json?: boolean }) => {
    await runStatus(options);
  });

program.parse(process.argv);
