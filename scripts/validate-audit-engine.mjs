/**
 * FAN-42: Audit Engine Validation Script
 * Runs the audit engine against test-data/contacts.csv and measures
 * detection accuracy vs seeded ground truth.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// ─── CSV Parser ────────────────────────────────────────────────────────────
function parseCSV(filepath) {
  const content = fs.readFileSync(filepath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const values = [];
    let current = '';
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === ',' && !inQuotes) { values.push(current); current = ''; continue; }
      current += ch;
    }
    values.push(current);
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
  });
}

// ─── Map CSV rows → CrmContact ─────────────────────────────────────────────
function toCrmContact(row) {
  // createdate: mark all test data as "old" (created 200 days ago) so stale check applies
  // The stale check excludes records created in last 90 days
  const createdate = new Date(Date.now() - 200 * 86400000).toISOString();

  const lastActivity = row['Last Activity Date']?.trim();
  return {
    id: row['Contact ID'],
    email: row['Email']?.trim() || null,
    firstname: row['First Name']?.trim() || null,
    lastname: row['Last Name']?.trim() || null,
    company: row['Company Name']?.trim() || null,
    jobtitle: row['Job Title']?.trim() || null,
    phone: row['Phone Number']?.trim() || null,
    hs_last_activity_date: lastActivity || null,
    notes_last_updated: null,
    createdate,
    _notes: row['Notes']?.trim() || '', // ground truth marker
  };
}

// ─── Inline copies of the audit logic (avoid TS compilation) ───────────────

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

function normalizeName(first, last) {
  return `${(first ?? '').trim()} ${(last ?? '').trim()}`.toLowerCase().replace(/\s+/g, ' ').trim();
}

function stripMiddleInitials(name) {
  return name
    .replace(/\b[a-z]\.?\s+/g, (match, offset) => offset > 0 ? '' : match)
    .replace(/\s+/g, ' ')
    .trim();
}

function emailDomain(email) {
  if (!email) return null;
  const parts = email.toLowerCase().split('@');
  return parts.length === 2 ? parts[1] : null;
}

function normalizeEmailUsername(email) {
  if (!email) return null;
  const atIndex = email.indexOf('@');
  if (atIndex < 1) return null;
  let username = email.substring(0, atIndex).toLowerCase();
  const plusIndex = username.indexOf('+');
  if (plusIndex >= 0) username = username.substring(0, plusIndex);
  username = username.replace(/\./g, '');
  return username || null;
}

function normalizePhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 7 ? digits : null;
}

class UnionFind {
  parent = new Map();
  find(x) {
    if (!this.parent.has(x)) this.parent.set(x, x);
    if (this.parent.get(x) !== x) this.parent.set(x, this.find(this.parent.get(x)));
    return this.parent.get(x);
  }
  union(a, b) {
    const ra = this.find(a), rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }
}

function detectDuplicates(contacts) {
  const uf = new UnionFind();
  const emailIndex = new Map();
  for (const c of contacts) {
    if (c.email) {
      const key = c.email.toLowerCase();
      const list = emailIndex.get(key) ?? [];
      list.push(c.id);
      emailIndex.set(key, list);
    }
  }
  for (const ids of emailIndex.values()) {
    if (ids.length > 1) for (let i = 1; i < ids.length; i++) uf.union(ids[0], ids[i]);
  }
  for (let i = 0; i < contacts.length; i++) {
    for (let j = i + 1; j < contacts.length; j++) {
      const a = contacts[i], b = contacts[j];
      const nameA = normalizeName(a.firstname, a.lastname);
      const nameB = normalizeName(b.firstname, b.lastname);
      if (!nameA || !nameB) continue;
      const nameDist = levenshtein(nameA, nameB);
      const strippedA = stripMiddleInitials(nameA);
      const strippedB = stripMiddleInitials(nameB);
      const strippedDist = levenshtein(strippedA, strippedB);
      const bestNameDist = Math.min(nameDist, strippedDist);
      const domainA = emailDomain(a.email), domainB = emailDomain(b.email);
      const sameDomain = domainA && domainB && domainA === domainB;
      if (sameDomain && bestNameDist <= 2) { uf.union(a.id, b.id); continue; }
      const usernameA = normalizeEmailUsername(a.email), usernameB = normalizeEmailUsername(b.email);
      if (usernameA && usernameB && levenshtein(usernameA, usernameB) <= 2 && bestNameDist <= 2) { uf.union(a.id, b.id); continue; }
      const companyA = a.company?.toLowerCase().trim(), companyB = b.company?.toLowerCase().trim();
      if (companyA && companyB && companyA === companyB && bestNameDist <= 2) { uf.union(a.id, b.id); continue; }
      const phoneA = normalizePhone(a.phone), phoneB = normalizePhone(b.phone);
      if (phoneA && phoneB && phoneA === phoneB && bestNameDist <= 4) { uf.union(a.id, b.id); continue; }
    }
  }
  const clusters = new Map();
  for (const c of contacts) {
    const root = uf.find(c.id);
    const list = clusters.get(root) ?? [];
    list.push(c.id);
    clusters.set(root, list);
  }
  const issues = [];
  for (const [, members] of clusters) {
    if (members.length < 2) continue;
    const severity = members.length >= 4 ? 'critical' : members.length >= 3 ? 'high' : 'medium';
    issues.push({ category: 'duplicate', severity, record_id: members[0], details: { cluster_size: members.length, cluster_ids: members } });
  }
  return issues;
}

function detectStaleRecords(contacts) {
  const now = Date.now();
  const thresholdMs = 90 * 86400000;
  const issues = [];
  for (const c of contacts) {
    if (c.createdate) {
      const createdAt = new Date(c.createdate).getTime();
      if (now - createdAt < thresholdMs) continue;
    }
    const lastActivity = c.hs_last_activity_date ? new Date(c.hs_last_activity_date).getTime() : null;
    const lastNotes = c.notes_last_updated ? new Date(c.notes_last_updated).getTime() : null;
    const mostRecent = Math.max(lastActivity ?? 0, lastNotes ?? 0);
    if (mostRecent === 0 || now - mostRecent > thresholdMs) {
      const daysSinceActivity = mostRecent === 0 ? null : Math.floor((now - mostRecent) / 86400000);
      issues.push({ category: 'stale', severity: daysSinceActivity === null || daysSinceActivity > 180 ? 'high' : 'medium', record_id: c.id, details: { days_since_activity: daysSinceActivity } });
    }
  }
  return issues;
}

function detectMissingFields(contacts) {
  const REQUIRED = ['email', 'company', 'jobtitle', 'phone'];
  const issues = [];
  for (const c of contacts) {
    const missing = REQUIRED.filter(f => !c[f] || c[f].toString().trim() === '');
    if (missing.length > 0) {
      const ratio = missing.length / REQUIRED.length;
      const severity = ratio >= 0.75 ? 'critical' : ratio >= 0.5 ? 'high' : 'medium';
      issues.push({ category: 'missing_fields', severity, record_id: c.id, details: { missing_fields: missing } });
    }
  }
  return issues;
}

function detectNameCasing(name) {
  if (!name || !name.trim()) return null;
  const t = name.trim();
  if (t === t.toLowerCase()) return 'lower_case';
  if (t === t.toUpperCase()) return 'upper_case';
  if (/^([A-Z][a-z]*\.?\s*)+$/.test(t)) return 'title_case';
  return 'mixed';
}

function detectPhoneFormat(phone) {
  if (!phone || !phone.trim()) return null;
  const p = phone.trim();
  if (/^\(\d{3}\)\s?\d{3}-\d{4}$/.test(p)) return 'parenthesized';
  if (/^\d{3}-\d{3}-\d{4}$/.test(p)) return 'dashed';
  if (/^\d{3}\.\d{3}\.\d{4}$/.test(p)) return 'dotted';
  if (/^\d{10,11}$/.test(p)) return 'digits_only';
  if (/^\+/.test(p)) return 'international';
  return 'other';
}

function majorityFormat(values) {
  const counts = new Map();
  for (const v of values) { if (v !== null) counts.set(v, (counts.get(v) ?? 0) + 1); }
  let best = null, bestCount = 0;
  for (const [k, c] of counts) { if (c > bestCount) { best = k; bestCount = c; } }
  return best;
}

function detectFormatIssues(contacts) {
  const fnCasings = contacts.map(c => detectNameCasing(c.firstname));
  const lnCasings = contacts.map(c => detectNameCasing(c.lastname));
  const phoneFormats = contacts.map(c => detectPhoneFormat(c.phone));
  const majFN = majorityFormat(fnCasings);
  const majLN = majorityFormat(lnCasings);
  const majPhone = majorityFormat(phoneFormats);
  const issues = [];
  for (let i = 0; i < contacts.length; i++) {
    const c = contacts[i];
    const problems = [];
    if (fnCasings[i] && majFN && fnCasings[i] !== majFN) problems.push('firstname_casing');
    if (lnCasings[i] && majLN && lnCasings[i] !== majLN) problems.push('lastname_casing');
    if (phoneFormats[i] && majPhone && phoneFormats[i] !== majPhone) problems.push('phone_format');
    if (problems.length > 0) issues.push({ category: 'format', severity: problems.length >= 2 ? 'medium' : 'low', record_id: c.id, details: { issues: problems } });
  }
  return issues;
}

function categoryScore(affected, total) {
  if (total === 0) return 100;
  const pct = (affected / total) * 100;
  if (pct === 0) return 100;
  if (pct <= 5) return 85;
  if (pct <= 15) return 70;
  if (pct <= 30) return 50;
  if (pct <= 50) return 30;
  return 10;
}

function countDuplicateAffected(issues) {
  const seen = new Set();
  for (const issue of issues) for (const id of (issue.details.cluster_ids ?? [])) seen.add(id);
  return seen.size;
}

// ─── Main ──────────────────────────────────────────────────────────────────

console.log('=== FAN-42: Audit Engine Validation ===\n');

const csvPath = path.join(ROOT, 'test-data', 'contacts.csv');
const rawRows = parseCSV(csvPath);
const contacts = rawRows.map(toCrmContact);

console.log(`Loaded ${contacts.length} contacts from test-data/contacts.csv\n`);

// Ground truth from seed markers
const gt = {
  duplicates: rawRows.filter(r => r['Notes']?.includes('DUPLICATE')).map(r => r['Contact ID']),
  stale: rawRows.filter(r => r['Notes']?.includes('STALE')).map(r => r['Contact ID']),
  missing: rawRows.filter(r => r['Notes']?.includes('MISSING')).map(r => r['Contact ID']),
  format: rawRows.filter(r => r['Notes']?.includes('FORMAT')).map(r => r['Contact ID']),
};

console.log('--- Ground Truth (seeded) ---');
console.log(`  Duplicate seeds:      ${gt.duplicates.length} records (50 pairs, each pair has 1 marked record)`);
console.log(`  Stale seeds:          ${gt.stale.length} records`);
console.log(`  Missing field seeds:  ${gt.missing.length} records`);
console.log(`  Format issue seeds:   ${gt.format.length} records`);
console.log();

// Run audit
const dupIssues = detectDuplicates(contacts);
const staleIssues = detectStaleRecords(contacts);
const missingIssues = detectMissingFields(contacts);
const formatIssues = detectFormatIssues(contacts);

const dupAffected = countDuplicateAffected(dupIssues);
const total = contacts.length;

// Collect detected IDs per category
const detectedDupIds = new Set();
for (const issue of dupIssues) for (const id of (issue.details.cluster_ids ?? [])) detectedDupIds.add(id);

const detectedStaleIds = new Set(staleIssues.map(i => i.record_id));
const detectedMissingIds = new Set(missingIssues.map(i => i.record_id));
const detectedFormatIds = new Set(formatIssues.map(i => i.record_id));

// ─── Duplicate Analysis ────────────────────────────────────────────────────
console.log('--- DUPLICATES ---');
console.log(`  Seeded duplicate records (marked):  ${gt.duplicates.length}`);
console.log(`  Duplicate clusters found:           ${dupIssues.length}`);
console.log(`  Total records in clusters:          ${dupAffected}`);

// How many seeded records are in detected clusters?
const dupSeededDetected = gt.duplicates.filter(id => detectedDupIds.has(id));
const dupRecall = gt.duplicates.length > 0 ? (dupSeededDetected.length / gt.duplicates.length * 100).toFixed(1) : 'N/A';
console.log(`  Seeded records detected:            ${dupSeededDetected.length}/${gt.duplicates.length} (${dupRecall}% recall)`);

// False positives: detected IDs that are NOT seeded (and not the "original" of the pair)
// Note: the generator marks only ONE of each pair with DUPLICATE_SEED
// Actual duplicate universe = 100 records (50 pairs), but only 50 are marked
// So false positive analysis is approximate
const nonSeededInClusters = [...detectedDupIds].filter(id => !gt.duplicates.includes(id));
console.log(`  Non-seeded records in clusters:     ${nonSeededInClusters.length} (includes unmarked originals + potential FPs)`);
console.log(`  Note: each pair has only 1 marked record; ~50 unmarked originals are expected`);

// ─── Stale Analysis ────────────────────────────────────────────────────────
console.log('\n--- STALE RECORDS ---');
const staleSeededDetected = gt.stale.filter(id => detectedStaleIds.has(id));
const staleNotDetected = gt.stale.filter(id => !detectedStaleIds.has(id));
const staleFalsePos = [...detectedStaleIds].filter(id => !gt.stale.includes(id));

console.log(`  Seeded stale records:               ${gt.stale.length}`);
console.log(`  Total flagged by engine:            ${staleIssues.length}`);
console.log(`  Seeded records correctly flagged:   ${staleSeededDetected.length} (${(staleSeededDetected.length/gt.stale.length*100).toFixed(1)}% recall)`);
console.log(`  Seeded records missed:              ${staleNotDetected.length}`);
console.log(`  Non-seeded records flagged (FP?):   ${staleFalsePos.length}`);

if (staleNotDetected.length > 0) {
  console.log('\n  Sample missed stale records:');
  staleNotDetected.slice(0, 3).forEach(id => {
    const row = rawRows.find(r => r['Contact ID'] === id);
    console.log(`    ${id}: lastActivity="${row?.['Last Activity Date']}", notes="${row?.['Notes']}"`);
  });
}
if (staleFalsePos.length > 0) {
  console.log('\n  Sample false positives (non-seeded flagged):');
  staleFalsePos.slice(0, 3).forEach(id => {
    const row = rawRows.find(r => r['Contact ID'] === id);
    console.log(`    ${id}: lastActivity="${row?.['Last Activity Date']}", notes="${row?.['Notes']}"`);
  });
}

// ─── Missing Fields Analysis ───────────────────────────────────────────────
console.log('\n--- MISSING FIELDS ---');
const missingSeededDetected = gt.missing.filter(id => detectedMissingIds.has(id));
const missingNotDetected = gt.missing.filter(id => !detectedMissingIds.has(id));
const missingFalsePos = [...detectedMissingIds].filter(id => !gt.missing.includes(id));

console.log(`  Seeded missing-field records:       ${gt.missing.length}`);
console.log(`  Total flagged by engine:            ${missingIssues.length}`);
console.log(`  Seeded records correctly flagged:   ${missingSeededDetected.length} (${gt.missing.length > 0 ? (missingSeededDetected.length/gt.missing.length*100).toFixed(1) : 'N/A'}% recall)`);
console.log(`  Seeded records missed:              ${missingNotDetected.length}`);
console.log(`  Non-seeded records flagged (FP?):   ${missingFalsePos.length}`);

// ─── Format Analysis ───────────────────────────────────────────────────────
console.log('\n--- FORMAT ISSUES ---');
const formatSeededDetected = gt.format.filter(id => detectedFormatIds.has(id));
const formatNotDetected = gt.format.filter(id => !detectedFormatIds.has(id));
const formatFalsePos = [...detectedFormatIds].filter(id => !gt.format.includes(id));

console.log(`  Seeded format-issue records:        ${gt.format.length}`);
console.log(`  Total flagged by engine:            ${formatIssues.length}`);
console.log(`  Seeded records correctly flagged:   ${formatSeededDetected.length} (${gt.format.length > 0 ? (formatSeededDetected.length/gt.format.length*100).toFixed(1) : 'N/A'}% recall)`);
console.log(`  Seeded records missed:              ${formatNotDetected.length}`);
console.log(`  Non-seeded records flagged (FP?):   ${formatFalsePos.length}`);

if (formatNotDetected.length > 0) {
  console.log('\n  Sample missed format issues:');
  formatNotDetected.slice(0, 3).forEach(id => {
    const row = rawRows.find(r => r['Contact ID'] === id);
    console.log(`    ${id}: fn="${row?.['First Name']}" ln="${row?.['Last Name']}" phone="${row?.['Phone Number']}" notes="${row?.['Notes']}"`);
  });
}

// ─── Scoring Calibration ───────────────────────────────────────────────────
console.log('\n--- SCORING CALIBRATION ---');
const dupScore = categoryScore(dupAffected, total);
const staleScore = categoryScore(staleIssues.length, total);
const missingScore = categoryScore(missingIssues.length, total);
const formatScore = categoryScore(formatIssues.length, total);

const composite = Math.round(
  dupScore * 0.3 + staleScore * 0.25 + missingScore * 0.25 + formatScore * 0.2
);
const grade = composite >= 90 ? 'A' : composite >= 80 ? 'B' : composite >= 70 ? 'C' : composite >= 55 ? 'D' : 'F';

console.log(`  Total records: ${total}`);
console.log(`\n  Category breakdown:`);
console.log(`    Duplicates:   ${dupAffected}/${total} affected (${(dupAffected/total*100).toFixed(1)}%) → score ${dupScore}/100`);
console.log(`    Stale:        ${staleIssues.length}/${total} affected (${(staleIssues.length/total*100).toFixed(1)}%) → score ${staleScore}/100`);
console.log(`    Missing:      ${missingIssues.length}/${total} affected (${(missingIssues.length/total*100).toFixed(1)}%) → score ${missingScore}/100`);
console.log(`    Format:       ${formatIssues.length}/${total} affected (${(formatIssues.length/total*100).toFixed(1)}%) → score ${formatScore}/100`);
console.log(`\n  Weighted health score: ${composite}/100 → Grade ${grade}`);

console.log(`\n  Expected with perfect detection:`);
const expDupPct = 100/total*100;
const expStalePct = 100/total*100;
const expMissingPct = 80/total*100;
const expFormatPct = 30/total*100;
console.log(`    Dupes (100 expected):   ${(100/total*100).toFixed(1)}% → score ${categoryScore(100, total)}`);
console.log(`    Stale (100 expected):   ${(100/total*100).toFixed(1)}% → score ${categoryScore(100, total)}`);
console.log(`    Missing (80 expected):  ${(80/total*100).toFixed(1)}% → score ${categoryScore(80, total)}`);
console.log(`    Format (30 expected):   ${(30/total*100).toFixed(1)}% → score ${categoryScore(30, total)}`);
const expectedComposite = Math.round(categoryScore(100,total)*0.3 + categoryScore(100,total)*0.25 + categoryScore(80,total)*0.25 + categoryScore(30,total)*0.2);
const expectedGrade = expectedComposite >= 90 ? 'A' : expectedComposite >= 80 ? 'B' : expectedComposite >= 70 ? 'C' : expectedComposite >= 55 ? 'D' : 'F';
console.log(`    Expected composite: ${expectedComposite}/100 → Grade ${expectedGrade}`);

// ─── Edge Case Analysis ────────────────────────────────────────────────────
console.log('\n--- EDGE CASE ANALYSIS ---');

// 1. Empty CRM
const emptyResult = detectDuplicates([]);
console.log(`  Empty CRM duplicates check: ${emptyResult.length} issues (expected 0)`);
const emptyStale = detectStaleRecords([]);
console.log(`  Empty CRM stale check: ${emptyStale.length} issues (expected 0)`);

// 2. Contacts with no email
const noEmailContacts = contacts.filter(c => !c.email);
console.log(`\n  Contacts with no email: ${noEmailContacts.length}`);

// 3. Unusual name characters - check if any exist
const unusualNames = contacts.filter(c => /[^a-zA-Z\s.\-']/.test(c.firstname ?? '') || /[^a-zA-Z\s.\-']/.test(c.lastname ?? ''));
console.log(`  Contacts with unusual chars in names: ${unusualNames.length}`);

// 4. Duplicate clusters with size > 2
const largeClusters = dupIssues.filter(i => i.details.cluster_size > 2);
console.log(`  Duplicate clusters with 3+ members: ${largeClusters.length}`);

// 5. Contacts that have NO activity date AND no createdate
const noActivity = contacts.filter(c => !c.hs_last_activity_date && !c.notes_last_updated);
console.log(`  Contacts with no activity date at all: ${noActivity.length}`);

// 6. Phone number formats distribution
const phoneFormatCounts = new Map();
for (const c of contacts) {
  const fmt = detectPhoneFormat(c.phone) ?? 'none';
  phoneFormatCounts.set(fmt, (phoneFormatCounts.get(fmt) ?? 0) + 1);
}
console.log('\n  Phone format distribution:');
for (const [fmt, count] of [...phoneFormatCounts.entries()].sort((a,b) => b[1]-a[1])) {
  console.log(`    ${fmt}: ${count}`);
}

console.log('\n=== Validation Complete ===');
