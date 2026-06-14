#!/usr/bin/env node
// Tiny smoke test for fantasia-scan. Zero deps. Run: node test/run.mjs
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scanner = path.join(__dirname, '..', 'bin', 'fantasia-scan');
const fixtures = path.join(__dirname, 'fixtures');
const fixturesClean = path.join(__dirname, 'fixtures-clean');

let failures = 0;
function check(name, cond) {
  if (cond) console.log('  ok  - ' + name);
  else { console.log('FAIL  - ' + name); failures++; }
}

// Run the scanner with arbitrary extra args and parse its JSON stdout.
function scan(root, extra = []) {
  const out = execFileSync(process.execPath, [scanner, root, '--json', '--no-user-config', ...extra], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  return { out, report: JSON.parse(out) };
}

const RAW_SECRETS = [
  'AKIAIOSFODNN7EXAMPLE',
  'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  'ghp_1234567890abcdefghijklmnopqrstuvwxyz',
  'sk-proj-abcdefghijklmnopqrstuvwxyz1234567890ABCD',
  '123-45-6789',
];

const stdout = execFileSync(process.execPath, [scanner, fixtures, '--json', '--no-user-config'], {
  encoding: 'utf8',
  maxBuffer: 16 * 1024 * 1024,
});

let report;
check('stdout is valid JSON', (() => { try { report = JSON.parse(stdout); return true; } catch { return false; } })());
if (!report) { process.exit(1); }

const ids = report.findings.map((f) => f.id);
const has = (id) => ids.includes(id);

check('redaction: no raw secret appears anywhere in output', !RAW_SECRETS.some((s) => stdout.includes(s)));
check('redaction: AKIA prefix shows redacted form', stdout.includes('AKIA' + '•'));
check('detects exposed secret (secret-in-readable-file)', has('secret-in-readable-file'));
check('detects loose mode (mode-bypass-permissions)', has('mode-bypass-permissions'));
check('detects network bash (network-bash-allowed)', has('network-bash-allowed'));
check('detects sensitive financial (sensitive-financial)', has('sensitive-financial'));
check('detects sensitive legal/pii (sensitive-legal-pii)', has('sensitive-legal-pii'));
check('correlation fires (reachable-secret)', has('reachable-secret'));
check('no-secret-deny-rules fires', has('no-secret-deny-rules'));
check('access.contentsReadIntoContext is 0', report.access.contentsReadIntoContext === 0);
check('access.traversedAboveRoot is false', report.access.traversedAboveRoot === false);
check('summary.score is an integer 0..100', Number.isInteger(report.summary.score) && report.summary.score >= 0 && report.summary.score <= 100);
check('critical count > 0 (secrets present)', report.summary.counts.critical > 0);
check('every finding has a fingerprint', report.findings.every((f) => typeof f.fingerprint === 'string' && f.fingerprint.length > 0));
check('no internal _raw field leaked', !stdout.includes('"_raw"') && !stdout.includes('"_rawSnippetSource"'));

// ---------------------------------------------------------------------------
// M2: backward-compat fields default cleanly (no new flags)
// ---------------------------------------------------------------------------
check('every finding has ignored:false by default', report.findings.every((f) => f.ignored === false));
check('every finding has isNew:null by default', report.findings.every((f) => f.isNew === null));
check('summary.ignoredCount is 0 by default', report.summary.ignoredCount === 0);
check('summary.newCount is null by default', report.summary.newCount === null);

// ---------------------------------------------------------------------------
// M2: .fantasiaignore — suppress a finding, drop it from counts, RAISE the score
// ---------------------------------------------------------------------------
{
  // Baseline (unignored) run of the clean fixture.
  const before = scan(fixturesClean).report;
  const IGNORE_FP = '.claude/settings.json:webfetch-all-domains:4';
  const beforeHasIt = before.findings.some((f) => f.fingerprint === IGNORE_FP);
  check('.fantasiaignore: clean fixture has the target finding to suppress', beforeHasIt);

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fantasia-ignore-'));
  const ignoreFile = path.join(tmp, 'my.fantasiaignore');
  fs.writeFileSync(ignoreFile, `# dismiss as a false positive\n${IGNORE_FP}\n`, 'utf8');

  const after = scan(fixturesClean, ['--ignore-file', ignoreFile]).report;
  const ignoredFinding = after.findings.find((f) => f.fingerprint === IGNORE_FP);

  check('.fantasiaignore: matched finding gets ignored:true', !!ignoredFinding && ignoredFinding.ignored === true);
  check('.fantasiaignore: ignored finding REMAINS in findings[]', !!ignoredFinding);
  check('.fantasiaignore: summary.ignoredCount counts it', after.summary.ignoredCount === 1);
  check('.fantasiaignore: ignored finding dropped from counts (medium fell by 1)',
    after.summary.counts.medium === before.summary.counts.medium - 1);
  check('.fantasiaignore: suppressing a finding RAISES the score', after.summary.score > before.summary.score);

  // Wildcard form file:id:* suppresses every line of that id in that file.
  const wildFile = path.join(tmp, 'wild.fantasiaignore');
  fs.writeFileSync(wildFile, '.claude/settings.json:webfetch-all-domains:*\n', 'utf8');
  const wild = scan(fixturesClean, ['--ignore-file', wildFile]).report;
  const wildFinding = wild.findings.find((f) => f.id === 'webfetch-all-domains');
  check('.fantasiaignore: line-wildcard (file:id:*) suppresses the finding', !!wildFinding && wildFinding.ignored === true);

  fs.rmSync(tmp, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// M2: baseline — accept current state; only NEW findings flag; score unchanged
// ---------------------------------------------------------------------------
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fantasia-baseline-'));
  // Work on a private copy so we can mutate it without touching the fixture.
  const proj = path.join(tmp, 'proj');
  fs.cpSync(fixturesClean, proj, { recursive: true });

  // --write-baseline into a nested (non-existent) dir to verify mkdir behavior.
  const baselinePath = path.join(tmp, 'nested', 'dir', 'baseline.json');
  const written = scan(proj, ['--write-baseline', baselinePath]).report;
  check('--write-baseline creates parent dirs and a file', fs.existsSync(baselinePath));
  check('--write-baseline still prints normal scan JSON to stdout', typeof written.summary.score === 'number');

  const baselineDoc = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  check('baseline file has fantasiaVersion', typeof baselineDoc.fantasiaVersion === 'string');
  check('baseline file createdAt is null (no Date called)', baselineDoc.createdAt === null);
  check('baseline file has a fingerprints array', Array.isArray(baselineDoc.fingerprints) && baselineDoc.fingerprints.length > 0);

  // Re-scan the UNCHANGED tree against the baseline -> nothing is new.
  const unchanged = scan(proj, ['--baseline', baselinePath]).report;
  check('baseline (unchanged tree): newCount === 0', unchanged.summary.newCount === 0);
  check('baseline (unchanged tree): every finding isNew:false', unchanged.findings.every((f) => f.isNew === false));
  check('baseline does NOT change the score', unchanged.summary.score === written.summary.score);

  // Introduce exactly one NEW finding: add bare Bash to a secret-free project.
  const settingsPath = path.join(proj, '.claude', 'settings.json');
  const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  settings.permissions.allow.push('Bash');
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');

  const changed = scan(proj, ['--baseline', baselinePath]).report;
  const newOnes = changed.findings.filter((f) => f.isNew === true);
  check('baseline (new finding): exactly one finding is isNew:true', newOnes.length === 1);
  check('baseline (new finding): it is the introduced bash-wide-open', newOnes.length === 1 && newOnes[0].id === 'bash-wide-open');
  check('baseline (new finding): summary.newCount === 1', changed.summary.newCount === 1);
  check('baseline (new finding): pre-existing findings stay isNew:false',
    changed.findings.filter((f) => f.id !== 'bash-wide-open').every((f) => f.isNew === false));

  // Redaction still holds across all M2 paths (no raw secret in any output).
  const allOut = [written, unchanged, changed].map((r) => JSON.stringify(r)).join('\n');
  check('M2: redaction still holds (no raw AKIA secret in baseline-mode output)',
    !RAW_SECRETS.some((s) => allOut.includes(s)));

  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log('');
if (failures) { console.log(`${failures} check(s) FAILED`); process.exit(1); }
console.log('all smoke checks passed');
