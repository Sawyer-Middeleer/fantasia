import { getAttioTokens } from "../credentials.js";
import { fetchAttioContacts } from "@fantasia/integrations/attio";
import { runAudit as runCrmAudit } from "@fantasia/integrations/audit";
import type { AuditResult, AuditIssue } from "@fantasia/integrations/audit";

function renderBar(score: number, width = 20): string {
  const filled = Math.round((score / 100) * width);
  return "\u2588".repeat(filled) + "\u2591".repeat(width - filled);
}

function severityOrder(s: string): number {
  switch (s) {
    case "critical":
      return 0;
    case "high":
      return 1;
    case "medium":
      return 2;
    case "low":
      return 3;
    default:
      return 4;
  }
}

function categoryLabel(cat: string): string {
  switch (cat) {
    case "duplicate":
      return "Duplicates";
    case "stale":
      return "Stale";
    case "missing_field":
      return "Missing Fields";
    case "format":
      return "Format";
    default:
      return cat;
  }
}

export async function runAudit(options: {
  json?: boolean;
  threshold?: string;
}): Promise<void> {
  const chalk = (await import("chalk")).default;

  const tokens = getAttioTokens();
  if (!tokens) {
    console.error(
      chalk.red("Not logged in. Run `fantasia login` first.")
    );
    process.exit(1);
  }

  console.log(chalk.dim("Fetching contacts..."));

  const contacts = await fetchAttioContacts(tokens.access_token);

  console.log(chalk.dim(`Running audit on ${contacts.length} contacts...`));

  const result: AuditResult = runCrmAudit({ contacts });

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    const threshold = parseInt(options.threshold ?? "0", 10);
    process.exit(result.healthScore >= threshold ? 0 : 1);
    return;
  }

  // Human-readable output
  const gradeColor = (grade: string) => {
    if (grade === "A" || grade === "B") return chalk.green;
    if (grade === "C") return chalk.yellow;
    return chalk.red;
  };

  const scoreColor = (n: number) =>
    n >= 80 ? chalk.green : n >= 60 ? chalk.yellow : chalk.red;

  const barColor = (n: number, bar: string) =>
    n >= 80 ? chalk.green(bar) : n >= 60 ? chalk.yellow(bar) : chalk.red(bar);

  console.log();
  console.log(chalk.bold.white("  FANTASIA CRM AUDIT"));
  console.log(chalk.dim("  ─────────────────────────────────────────"));

  // Health score
  const bar = renderBar(result.healthScore, 30);
  console.log(
    `\n  Health Score   ${barColor(result.healthScore, bar)}  ${chalk.bold(
      scoreColor(result.healthScore)(String(result.healthScore))
    )}/100  ${gradeColor(result.grade)(result.grade)}`
  );

  // Category table
  console.log();
  console.log(chalk.dim("  Categories:"));

  const catEntries: { label: string; score: number; affected: number }[] = [
    {
      label: "Duplicates",
      score: result.categories.duplicates.score,
      affected: result.categories.duplicates.affectedCount,
    },
    {
      label: "Stale",
      score: result.categories.stale.score,
      affected: result.categories.stale.affectedCount,
    },
    {
      label: "Missing Fields",
      score: result.categories.missingFields.score,
      affected: result.categories.missingFields.affectedCount,
    },
    {
      label: "Format",
      score: result.categories.format.score,
      affected: result.categories.format.affectedCount,
    },
  ];

  for (const cat of catEntries) {
    const catBar = renderBar(cat.score, 20);
    const label = cat.label.padEnd(18);
    console.log(
      `  ${chalk.dim(label)} ${barColor(cat.score, catBar)}  ${scoreColor(
        cat.score
      )(String(cat.score))}/100  ${chalk.dim(`(${cat.affected} affected)`)}`
    );
  }

  // Top 5 issues by severity
  const sortedIssues = [...result.issues]
    .sort((a, b) => severityOrder(a.severity) - severityOrder(b.severity))
    .slice(0, 5);

  if (sortedIssues.length > 0) {
    console.log();
    console.log(chalk.dim("  ─────────────────────────────────────────"));
    console.log(chalk.bold("  Top Issues:"));
    sortedIssues.forEach((issue: AuditIssue, i: number) => {
      const sevColor =
        issue.severity === "critical" || issue.severity === "high"
          ? chalk.red
          : issue.severity === "medium"
            ? chalk.yellow
            : chalk.dim;
      console.log(
        `  ${chalk.cyan(`${i + 1}.`)} ${sevColor(
          `[${issue.severity.toUpperCase()}]`
        )} ${categoryLabel(issue.category)} — record ${chalk.dim(
          issue.record_id
        )}`
      );
    });
  }

  // Footer
  console.log();
  console.log(
    chalk.dim(
      `  ${result.totalRecords} records scanned | ${tokens.workspace_name}`
    )
  );
  console.log();

  const threshold = parseInt(options.threshold ?? "0", 10);
  process.exit(result.healthScore >= threshold ? 0 : 1);
}
