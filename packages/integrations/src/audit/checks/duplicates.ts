import { CrmContact, AuditIssue } from "../types";

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function normalizeName(first: string | null, last: string | null): string {
  return `${(first ?? "").trim()} ${(last ?? "").trim()}`
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// Strip single-letter middle initials (e.g., "john j. doe" → "john doe")
function stripMiddleInitials(name: string): string {
  return name
    .replace(/\b[a-z]\.?\s+/g, (match, offset) => {
      // Only strip if it's not the first word (keep first name)
      return offset > 0 ? "" : match;
    })
    .replace(/\s+/g, " ")
    .trim();
}

function emailDomain(email: string | null): string | null {
  if (!email) return null;
  const parts = email.toLowerCase().split("@");
  return parts.length === 2 ? parts[1] : null;
}

// Normalize email username: strip +suffix, remove dots, lowercase
function normalizeEmailUsername(email: string | null): string | null {
  if (!email) return null;
  const atIndex = email.indexOf("@");
  if (atIndex < 1) return null;
  let username = email.substring(0, atIndex).toLowerCase();
  const plusIndex = username.indexOf("+");
  if (plusIndex >= 0) username = username.substring(0, plusIndex);
  username = username.replace(/\./g, "");
  return username || null;
}

// Normalize phone to digits only for comparison
function normalizePhone(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  // Must have at least 7 digits to be meaningful
  return digits.length >= 7 ? digits : null;
}

// Union-Find for clustering
class UnionFind {
  parent: Map<string, string> = new Map();
  find(x: string): string {
    if (!this.parent.has(x)) this.parent.set(x, x);
    if (this.parent.get(x) !== x) {
      this.parent.set(x, this.find(this.parent.get(x)!));
    }
    return this.parent.get(x)!;
  }
  union(a: string, b: string) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }
}

// Precompute name data for a contact
interface ContactNameData {
  name: string;
  stripped: string;
}

function getNameData(c: CrmContact): ContactNameData | null {
  const name = normalizeName(c.firstname, c.lastname);
  if (!name) return null;
  return { name, stripped: stripMiddleInitials(name) };
}

function bestNameDistance(a: ContactNameData, b: ContactNameData): number {
  return Math.min(
    levenshtein(a.name, b.name),
    levenshtein(a.stripped, b.stripped)
  );
}

// Compare contacts within a bucket and union matches
function compareBucket(
  bucket: CrmContact[],
  nameCache: Map<string, ContactNameData | null>,
  uf: UnionFind,
  matcher: (a: CrmContact, b: CrmContact, distFn: () => number) => boolean
) {
  for (let i = 0; i < bucket.length; i++) {
    for (let j = i + 1; j < bucket.length; j++) {
      const a = bucket[i];
      const b = bucket[j];
      const ndA = nameCache.get(a.id)!;
      const ndB = nameCache.get(b.id)!;
      if (!ndA || !ndB) continue;
      const distFn = () => bestNameDistance(ndA, ndB);
      if (matcher(a, b, distFn)) {
        uf.union(a.id, b.id);
      }
    }
  }
}

export function detectDuplicates(contacts: CrmContact[]): AuditIssue[] {
  const uf = new UnionFind();

  // Precompute name data for all contacts
  const nameCache = new Map<string, ContactNameData | null>();
  for (const c of contacts) {
    nameCache.set(c.id, getNameData(c));
  }

  // Build indices (buckets) for blocking strategies
  const emailIndex = new Map<string, CrmContact[]>();
  const domainIndex = new Map<string, CrmContact[]>();
  const usernameIndex = new Map<string, CrmContact[]>();
  const companyIndex = new Map<string, CrmContact[]>();
  const phoneIndex = new Map<string, CrmContact[]>();

  for (const c of contacts) {
    if (c.email) {
      const key = c.email.toLowerCase();
      const list = emailIndex.get(key) ?? [];
      list.push(c);
      emailIndex.set(key, list);

      const domain = emailDomain(c.email);
      if (domain) {
        const dList = domainIndex.get(domain) ?? [];
        dList.push(c);
        domainIndex.set(domain, dList);
      }

      const username = normalizeEmailUsername(c.email);
      if (username && username.length >= 3) {
        const uList = usernameIndex.get(username) ?? [];
        uList.push(c);
        usernameIndex.set(username, uList);
      }
    }

    const company = c.company?.toLowerCase().trim();
    if (company) {
      const cList = companyIndex.get(company) ?? [];
      cList.push(c);
      companyIndex.set(company, cList);
    }

    const phone = normalizePhone(c.phone);
    if (phone) {
      const pList = phoneIndex.get(phone) ?? [];
      pList.push(c);
      phoneIndex.set(phone, pList);
    }
  }

  // 1. Exact email match (case-insensitive)
  for (const bucket of emailIndex.values()) {
    if (bucket.length > 1) {
      for (let i = 1; i < bucket.length; i++) {
        uf.union(bucket[0].id, bucket[i].id);
      }
    }
  }

  // 2. Same email domain + similar name
  for (const bucket of domainIndex.values()) {
    if (bucket.length < 2) continue;
    compareBucket(bucket, nameCache, uf, (_a, _b, distFn) => distFn() <= 2);
  }

  // 3. Same email username across domains + similar name + companies don't differ
  for (const bucket of usernameIndex.values()) {
    if (bucket.length < 2) continue;
    compareBucket(bucket, nameCache, uf, (a, b, distFn) => {
      const compA = a.company?.toLowerCase().trim();
      const compB = b.company?.toLowerCase().trim();
      const companiesDiffer = compA && compB && compA !== compB;
      return !companiesDiffer && distFn() <= 2;
    });
  }

  // 4. Same company + very similar name
  for (const bucket of companyIndex.values()) {
    if (bucket.length < 2) continue;
    compareBucket(bucket, nameCache, uf, (_a, _b, distFn) => distFn() <= 2);
  }

  // 5. Same phone number + similar name
  for (const bucket of phoneIndex.values()) {
    if (bucket.length < 2) continue;
    compareBucket(bucket, nameCache, uf, (_a, _b, distFn) => distFn() <= 4);
  }

  // Build clusters
  const clusters = new Map<string, string[]>();
  for (const c of contacts) {
    uf.find(c.id); // ensure path compression
    const root = uf.find(c.id);
    const list = clusters.get(root) ?? [];
    list.push(c.id);
    clusters.set(root, list);
  }

  const contactMap = new Map(contacts.map((c) => [c.id, c]));
  const issues: AuditIssue[] = [];

  for (const [, members] of clusters) {
    if (members.length < 2) continue;

    // Each cluster = one issue, severity based on cluster size
    const severity = members.length >= 4 ? "critical" : members.length >= 3 ? "high" : "medium";
    const primaryId = members[0];
    const primary = contactMap.get(primaryId)!;

    issues.push({
      category: "duplicate",
      severity,
      record_id: primaryId,
      details: {
        cluster_size: members.length,
        cluster_ids: members,
        primary_email: primary.email,
        primary_name: normalizeName(primary.firstname, primary.lastname),
        match_type: determineMatchType(members, contactMap),
      },
    });
  }

  return issues;
}

function determineMatchType(
  ids: string[],
  contactMap: Map<string, CrmContact>
): string {
  const contacts = ids.map((id) => contactMap.get(id)!);
  const emails = contacts
    .map((c) => c.email?.toLowerCase())
    .filter(Boolean) as string[];
  const uniqueEmails = new Set(emails);

  if (uniqueEmails.size < emails.length) return "exact_email";

  // Check if matched via email username similarity
  const usernames = contacts
    .map((c) => normalizeEmailUsername(c.email))
    .filter(Boolean) as string[];
  const uniqueUsernames = new Set(usernames);
  if (uniqueUsernames.size < usernames.length) return "email_username";

  // Check if matched via same company
  const companies = contacts
    .map((c) => c.company?.toLowerCase().trim())
    .filter(Boolean) as string[];
  const uniqueCompanies = new Set(companies);
  if (uniqueCompanies.size === 1 && companies.length > 1) return "company_name";

  // Check phone match
  const phones = contacts
    .map((c) => normalizePhone(c.phone))
    .filter(Boolean) as string[];
  const uniquePhones = new Set(phones);
  if (uniquePhones.size < phones.length) return "phone_match";

  return "fuzzy_name_domain";
}

// Count of unique records involved in duplicate clusters
export function countDuplicateAffectedRecords(issues: AuditIssue[]): number {
  const seen = new Set<string>();
  for (const issue of issues) {
    const ids = (issue.details.cluster_ids as string[]) ?? [];
    for (const id of ids) seen.add(id);
  }
  return seen.size;
}
