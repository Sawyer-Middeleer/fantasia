#!/usr/bin/env node
// Tiny smoke test for fantasia-scan. Zero deps. Run: node test/run.mjs
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scanner = path.join(__dirname, '..', 'bin', 'fantasia-scan');
const fixtures = path.join(__dirname, 'fixtures');

let failures = 0;
function check(name, cond) {
  if (cond) console.log('  ok  - ' + name);
  else { console.log('FAIL  - ' + name); failures++; }
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

console.log('');
if (failures) { console.log(`${failures} check(s) FAILED`); process.exit(1); }
console.log('all smoke checks passed');
