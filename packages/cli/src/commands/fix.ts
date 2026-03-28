import readline from "readline";
import { ensureFreshToken } from "../credentials.js";
import { fetchHubSpotContacts, getHubSpotClient } from "@fantasia/integrations/hubspot";
import { runAudit as runCrmAudit } from "@fantasia/integrations/audit";
import {
  buildMergePreview,
  executeMerge,
  buildNormalizePreview,
  executeNormalize,
} from "@fantasia/integrations/fix";
import type { MergePreview, NormalizePreview } from "@fantasia/integrations/fix";

function askConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y");
    });
  });
}

export async function runFix(options: {
  dryRun?: boolean;
  execute?: boolean;
  json?: boolean;
  yes?: boolean;
}): Promise<void> {
  const chalk = (await import("chalk")).default;

  const tokens = await ensureFreshToken();
  if (!tokens) {
    console.error(
      chalk.red("Not logged in. Run `fantasia login --hubspot` first.")
    );
    process.exit(1);
  }

  console.log(chalk.dim("Fetching contacts..."));
  const contacts = await fetchHubSpotContacts(tokens.access_token);

  console.log(chalk.dim(`Running audit on ${contacts.length} contacts...`));
  const auditResult = runCrmAudit({ contacts });

  if (auditResult.issues.length === 0) {
    if (options.json) {
      console.log(JSON.stringify({ fixes: [], message: "No issues found!" }, null, 2));
    } else {
      console.log(chalk.green("No issues found!"));
    }
    process.exit(0);
  }

  // Map AuditIssue to the format expected by fix functions
  const duplicateIssues = auditResult.issues
    .filter((i) => i.category === "duplicate")
    .map((i) => ({
      _id: `${i.category}-${i.record_id}`,
      hubspotRecordIds: [i.record_id],
      details: i.details,
    }));

  const formatIssues = auditResult.issues
    .filter((i) => i.category === "format")
    .map((i) => ({
      _id: `${i.category}-${i.record_id}`,
      hubspotRecordIds: [i.record_id],
      details: i.details,
    }));

  const hubspotClient = getHubSpotClient(tokens.access_token);

  console.log(chalk.dim("Building fix previews..."));

  let mergePreview: MergePreview | null = null;
  let normalizePreview: NormalizePreview | null = null;

  if (duplicateIssues.length > 0) {
    mergePreview = await buildMergePreview(duplicateIssues, hubspotClient);
  }

  if (formatIssues.length > 0) {
    normalizePreview = await buildNormalizePreview(formatIssues, hubspotClient);
  }

  const totalFixes =
    (mergePreview?.clusters.length ?? 0) +
    (normalizePreview?.changes.length ?? 0);

  if (totalFixes === 0) {
    if (options.json) {
      console.log(JSON.stringify({ fixes: [], message: "No actionable fixes found." }, null, 2));
    } else {
      console.log(chalk.green("No actionable fixes found."));
    }
    process.exit(0);
  }

  // Show preview
  if (options.json) {
    const preview = {
      merges: mergePreview?.clusters ?? [],
      normalizations: normalizePreview?.changes ?? [],
      totalFixes,
    };

    if (!options.execute) {
      console.log(JSON.stringify(preview, null, 2));
      return;
    }
  } else {
    console.log();
    console.log(chalk.bold.white("  FANTASIA CRM FIX PREVIEW"));
    console.log(chalk.dim("  ─────────────────────────────────────────"));

    if (mergePreview && mergePreview.clusters.length > 0) {
      console.log();
      console.log(
        chalk.bold(`  Duplicate Merges: ${mergePreview.clusters.length}`)
      );
      for (const cluster of mergePreview.clusters) {
        console.log(
          `    ${chalk.cyan("Keep:")} ${cluster.keepId}  ${chalk.dim(
            "Merge:"
          )} ${cluster.mergeIds.join(", ")}`
        );
        if (Object.keys(cluster.mergedFields).length > 0) {
          for (const [field, info] of Object.entries(cluster.mergedFields)) {
            console.log(
              chalk.dim(`      + ${field}: "${info.value}" from ${info.from}`)
            );
          }
        }
      }
    }

    if (normalizePreview && normalizePreview.changes.length > 0) {
      console.log();
      console.log(
        chalk.bold(
          `  Format Normalizations: ${normalizePreview.changes.length}`
        )
      );
      for (const change of normalizePreview.changes) {
        console.log(`    ${chalk.cyan("Contact:")} ${change.contactId}`);
        for (const f of change.fields) {
          console.log(
            `      ${chalk.dim(f.field)}: ${chalk.red(
              `"${f.currentValue}"`
            )} ${chalk.dim("->")} ${chalk.green(`"${f.newValue}"`)}`
          );
        }
      }
    }

    console.log();
    console.log(chalk.dim(`  Total fixes: ${totalFixes}`));
    console.log();
  }

  // If no --execute, just show preview and exit
  if (!options.execute) {
    if (!options.json) {
      console.log(
        chalk.dim("  Run with --execute to apply fixes.")
      );
      console.log();
    }
    return;
  }

  // Confirm execution
  if (!options.yes) {
    const confirmed = await askConfirmation(
      `  Execute ${totalFixes} fixes? (y/N) `
    );
    if (!confirmed) {
      console.log(chalk.dim("  Aborted."));
      return;
    }
  }

  // Execute fixes
  console.log(chalk.dim("  Executing fixes..."));

  const results: { mergeSnapshot?: unknown; normalizeSnapshot?: unknown } = {};

  if (mergePreview && mergePreview.clusters.length > 0) {
    const snapshot = await executeMerge(
      mergePreview,
      hubspotClient,
      tokens.access_token
    );
    results.mergeSnapshot = snapshot;
    if (!options.json) {
      console.log(
        chalk.green(
          `  Merged ${mergePreview.clusters.length} duplicate cluster(s).`
        )
      );
    }
  }

  if (normalizePreview && normalizePreview.changes.length > 0) {
    const snapshot = await executeNormalize(normalizePreview, hubspotClient);
    results.normalizeSnapshot = snapshot;
    if (!options.json) {
      console.log(
        chalk.green(
          `  Normalized ${normalizePreview.changes.length} contact(s).`
        )
      );
    }
  }

  if (options.json) {
    console.log(
      JSON.stringify(
        { executed: true, totalFixes, ...results },
        null,
        2
      )
    );
  } else {
    console.log();
    console.log(chalk.bold.green(`  Done! ${totalFixes} fix(es) applied.`));
    console.log();
  }
}
