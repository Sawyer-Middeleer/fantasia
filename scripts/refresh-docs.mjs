#!/usr/bin/env node
/**
 * scripts/refresh-docs.mjs
 *
 * Fetches the raw source markdown for the `references/docs/` distilled doc pack
 * from the official Claude Code documentation site and caches it under
 * `references/docs/_source/`.
 *
 * PURPOSE
 * -------
 * The `references/docs/` plain-English pack (Piece 3 / /fantasia:ask) is
 * distilled from these raw sources.  Distillation requires an LLM and is a
 * separate (human or agent) step.  This script's job is purely to FETCH AND
 * CACHE the upstream markdown so that step always has fresh input.
 *
 * USAGE
 * -----
 *   node scripts/refresh-docs.mjs              # fetch & write to _source/
 *   node scripts/refresh-docs.mjs --dry-run    # list what would be fetched; no writes
 *   node scripts/refresh-docs.mjs --stamp <iso> # inject an ISO timestamp into the manifest
 *   node scripts/refresh-docs.mjs --help
 *
 * ZERO EXTERNAL DEPENDENCIES — Node 18+ global fetch only.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// CURATED ALLOWLIST
// Edit this array to add / remove docs pages that back the distilled pack.
// Each entry has:
//   name  – filename stem written to _source/<name>.md
//   path  – URL path segment after the locale prefix (no leading slash needed)
//
// The base URL for raw markdown is: https://code.claude.com/docs/en/<path>.md
// ---------------------------------------------------------------------------
const ALLOWED_DOCS = [
  { name: 'permissions',     path: 'permissions' },
  { name: 'permission-modes', path: 'permission-modes' },
  { name: 'settings',        path: 'settings' },
  { name: 'security',        path: 'security' },
  { name: 'data-usage',      path: 'data-usage' },
  { name: 'memory',          path: 'memory' },
  { name: 'mcp',             path: 'mcp' },
  { name: 'mcp-quickstart',  path: 'mcp-quickstart' },
  { name: 'skills',          path: 'skills' },
  { name: 'sub-agents',      path: 'sub-agents' },
  { name: 'slash-commands',  path: 'slash-commands/commands' },
  { name: 'costs',           path: 'costs' },
  { name: 'setup',           path: 'setup' },
  { name: 'quickstart',      path: 'quickstart' },
  { name: 'hooks-guide',     path: 'hooks-guide' },
];

// Base URLs
const DOCS_BASE_URL   = 'https://code.claude.com/docs/en';
const DOCS_INDEX_URL  = 'https://code.claude.com/docs/llms.txt';

// ---------------------------------------------------------------------------
// Resolve output directory relative to this script (works from any CWD)
// ---------------------------------------------------------------------------
const __dirname    = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT    = join(__dirname, '..');
const SOURCE_DIR   = join(REPO_ROOT, 'references', 'docs', '_source');
const MANIFEST_PATH = join(SOURCE_DIR, '_manifest.json');

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------
const args       = process.argv.slice(2);
const DRY_RUN    = args.includes('--dry-run');
const SHOW_HELP  = args.includes('--help') || args.includes('-h');
const stampIdx   = args.indexOf('--stamp');
const STAMP      = stampIdx !== -1 ? args[stampIdx + 1] ?? null : null;

// ---------------------------------------------------------------------------
// Help text
// ---------------------------------------------------------------------------
if (SHOW_HELP) {
  console.log(`
refresh-docs.mjs — fetch Claude Code doc source for the references/docs/ pack

USAGE
  node scripts/refresh-docs.mjs [options]

OPTIONS
  --dry-run           List what would be fetched; make no network requests,
                      write no files.
  --stamp <iso>       Inject an ISO 8601 timestamp into _manifest.json's
                      fetchedAt fields instead of leaving them null.
                      Example: --stamp 2026-06-14T12:00:00Z
  --help, -h          Show this help.

OUTPUT
  references/docs/_source/<name>.md    Raw markdown for each doc page
  references/docs/_source/_manifest.json

NEXT STEP
  Run an LLM distillation pass over _source/*.md to regenerate
  references/docs/*.md (the human-readable, concern-indexed pack).
`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Utility: fetch with a timeout
// ---------------------------------------------------------------------------
async function fetchWithTimeout(url, timeoutMs = 15_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Utility: friendly byte display
// ---------------------------------------------------------------------------
function prettyBytes(n) {
  if (n < 1024)      return `${n} B`;
  if (n < 1024**2)   return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024**2).toFixed(2)} MB`;
}

// ---------------------------------------------------------------------------
// Dry-run path — no network, no writes
// ---------------------------------------------------------------------------
function runDryRun() {
  console.log('\n  fantasia refresh-docs  [DRY RUN]\n');
  console.log(`  Docs index : ${DOCS_INDEX_URL}`);
  console.log(`  Output dir : ${SOURCE_DIR}\n`);
  console.log('  Pages that would be fetched:\n');

  for (const doc of ALLOWED_DOCS) {
    const url = `${DOCS_BASE_URL}/${doc.path}.md`;
    console.log(`    ${doc.name.padEnd(18)}  ${url}`);
  }

  console.log(`\n  Would also fetch index: ${DOCS_INDEX_URL}`);
  console.log(`\n  Would write ${ALLOWED_DOCS.length} markdown files + _manifest.json`);
  console.log('  No network calls were made.\n');
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Main fetch-and-write flow
// ---------------------------------------------------------------------------
async function run() {
  if (DRY_RUN) {
    runDryRun();
  }

  console.log('\n  fantasia refresh-docs\n');
  console.log(`  Fetching docs index: ${DOCS_INDEX_URL}`);

  // Step 1: Fetch the index (informational — we log it, but drive from the
  // allowlist so the script is stable even if the index format changes).
  let indexNote = '(index fetch skipped or failed — driving from allowlist)';
  try {
    const res = await fetchWithTimeout(DOCS_INDEX_URL);
    if (res.ok) {
      const text = await res.text();
      const lineCount = text.split('\n').filter(l => l.trim()).length;
      indexNote = `fetched ${prettyBytes(text.length)} (${lineCount} lines)`;
    } else {
      indexNote = `HTTP ${res.status} — continuing from allowlist`;
    }
  } catch (err) {
    indexNote = `fetch failed (${err.message}) — continuing from allowlist`;
  }
  console.log(`  Index: ${indexNote}\n`);

  // Ensure the cache directory exists
  mkdirSync(SOURCE_DIR, { recursive: true });

  // Step 2: Fetch each allowlisted page
  const results   = [];
  let successCount = 0;
  let failCount    = 0;

  for (const doc of ALLOWED_DOCS) {
    const url      = `${DOCS_BASE_URL}/${doc.path}.md`;
    const outPath  = join(SOURCE_DIR, `${doc.name}.md`);
    process.stdout.write(`  Fetching  ${doc.name.padEnd(18)} ... `);

    try {
      const res = await fetchWithTimeout(url);

      if (!res.ok) {
        console.log(`WARN  HTTP ${res.status}`);
        results.push({ name: doc.name, path: doc.path, url, bytes: null, fetchedAt: STAMP ?? null, error: `HTTP ${res.status}` });
        failCount++;
        continue;
      }

      const text  = await res.text();
      const bytes = Buffer.byteLength(text, 'utf8');

      // Write raw markdown to cache
      writeFileSync(outPath, text, 'utf8');

      console.log(`OK    ${prettyBytes(bytes)}`);
      results.push({ name: doc.name, path: doc.path, url, bytes, fetchedAt: STAMP ?? null });
      successCount++;

    } catch (err) {
      console.log(`WARN  ${err.message}`);
      results.push({ name: doc.name, path: doc.path, url, bytes: null, fetchedAt: STAMP ?? null, error: err.message });
      failCount++;
    }
  }

  // Step 3: Write the manifest
  const manifest = {
    generatedBy: 'scripts/refresh-docs.mjs',
    docsIndexUrl: DOCS_INDEX_URL,
    docsBaseUrl: DOCS_BASE_URL,
    totalPages: ALLOWED_DOCS.length,
    fetched: successCount,
    failed: failCount,
    pages: results,
  };

  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  // Step 4: Summary
  console.log('\n  ─────────────────────────────────────────────────');
  console.log(`  Fetched  : ${successCount} / ${ALLOWED_DOCS.length} pages`);
  if (failCount > 0) {
    console.log(`  Failed   : ${failCount} page(s) — check warnings above`);
  }
  console.log(`  Cache    : ${SOURCE_DIR}`);
  console.log(`  Manifest : ${MANIFEST_PATH}`);
  console.log('');
  console.log('  NEXT STEP: run an LLM distillation pass over _source/*.md');
  console.log('  to regenerate references/docs/*.md (the concern-indexed pack).');
  console.log('  ─────────────────────────────────────────────────\n');

  // Exit nonzero only if every single fetch failed
  if (failCount > 0 && successCount === 0) {
    console.error('  ERROR: all fetches failed — no source written.\n');
    process.exit(1);
  }
}

run().catch(err => {
  console.error(`\n  Unexpected error: ${err.message}\n`);
  process.exit(1);
});
