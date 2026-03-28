/**
 * HubSpot Test Data Generator
 *
 * Generates CSV files with realistic contacts, companies, and deals
 * that include deliberate data quality issues for testing Fantasia's CRM health audit.
 *
 * Usage: node scripts/generate-hubspot-test-data.js
 * Output: test-data/contacts.csv, test-data/companies.csv, test-data/deals.csv
 */

const fs = require('fs');
const path = require('path');

// ─── Seed data ─────────────────────────────────────────────────────────────

const FIRST_NAMES = [
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
  'William', 'Barbara', 'David', 'Elizabeth', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Lisa', 'Daniel', 'Nancy',
  'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley',
  'Steven', 'Dorothy', 'Paul', 'Kimberly', 'Andrew', 'Emily', 'Kenneth', 'Donna',
  'Kevin', 'Michelle', 'Brian', 'Carol', 'George', 'Amanda', 'Timothy', 'Melissa',
  'Ronald', 'Deborah', 'Edward', 'Stephanie', 'Jason', 'Rebecca', 'Jeffrey', 'Sharon',
  'Ryan', 'Laura', 'Jacob', 'Cynthia', 'Gary', 'Kathleen', 'Nicholas', 'Amy',
  'Eric', 'Angela', 'Jonathan', 'Shirley', 'Stephen', 'Anna', 'Larry', 'Brenda',
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker',
  'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
  'Carter', 'Roberts',
];

const COMPANIES = [
  'Acme Corp', 'TechNova Solutions', 'BlueSky Analytics', 'Meridian Partners',
  'Apex Systems', 'DataBridge Inc', 'CloudPath Technologies', 'Nexus Group',
  'Horizon Digital', 'Pinnacle Marketing', 'Sterling Dynamics', 'Vortex Software',
  'Summit Consulting', 'Cascade Ventures', 'Redwood Analytics', 'IronClad Security',
  'Flare Media', 'Cobalt Strategies', 'Atlas Operations', 'Ember Technologies',
  'Clearwave Solutions', 'Driftwood Studios', 'Granite Partners', 'Mosaic Labs',
  'Prism Analytics', 'Quartz Consulting', 'Solstice Digital', 'Tundra Systems',
  'Uplift Marketing', 'Vertex Group', 'Wren Technologies', 'Zephyr Ventures',
  'Alpine Consulting', 'Beacon Analytics', 'Cypress Solutions', 'Delta Operations',
  'Echo Systems', 'Fathom Digital', 'Gable Partners', 'Harbor Technologies',
  'Ibis Consulting', 'Jade Group', 'Keystone Analytics', 'Lunar Systems',
  'Mast Digital', 'Nordic Partners', 'Orbit Technologies', 'Pacific Consulting',
  'Quest Solutions', 'Rally Marketing',
];

const TITLES = [
  'CEO', 'CTO', 'VP of Sales', 'VP of Marketing', 'Director of Operations',
  'Sales Manager', 'Marketing Manager', 'Account Executive', 'Business Development Manager',
  'Product Manager', 'Head of Growth', 'Revenue Operations Manager', 'CMO', 'CFO',
  'Senior Account Executive', 'Director of Marketing', 'Head of Sales', 'Founder',
  'Co-Founder', 'Director of Business Development', 'Inside Sales Representative',
  'Marketing Coordinator', 'Operations Manager', 'Growth Manager', 'Sales Director',
];

const DOMAINS = [
  'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com',
];

const DEAL_STAGES = ['appointmentscheduled', 'qualifiedtobuy', 'presentationscheduled', 'decisionmakerboughtin', 'contractsent', 'closedwon', 'closedlost'];

// ─── Utilities ──────────────────────────────────────────────────────────────

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function slugEmail(firstName, lastName, domain) {
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`;
}

function companyEmail(firstName, lastName, company) {
  const domain = company.toLowerCase().replace(/[^a-z]/g, '').slice(0, 12) + '.com';
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`;
}

function randomPhone() {
  return `${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`;
}

// Deliberately malformed phone formats
function badPhone() {
  const formats = [
    `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
    `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
    `${Math.floor(Math.random() * 9000000000) + 1000000000}`,
    `${Math.floor(Math.random() * 900) + 100}.${Math.floor(Math.random() * 900) + 100}.${Math.floor(Math.random() * 9000) + 1000}`,
  ];
  return pick(formats);
}

// ─── Contact generators ─────────────────────────────────────────────────────

let contactId = 1;

function cleanContact(company) {
  const fn = pick(FIRST_NAMES);
  const ln = pick(LAST_NAMES);
  const id = contactId++;
  return {
    'Contact ID': `CONT-${id}`,
    'First Name': fn,
    'Last Name': ln,
    'Email': companyEmail(fn, ln, company),
    'Phone Number': randomPhone(),
    'Company Name': company,
    'Job Title': pick(TITLES),
    'Last Activity Date': daysAgo(Math.floor(Math.random() * 30)),
    'Notes': '',
  };
}

function duplicateContactPair(company) {
  const fn = pick(FIRST_NAMES);
  const ln = pick(LAST_NAMES);
  const email = companyEmail(fn, ln, company);
  const id1 = contactId++;
  const id2 = contactId++;

  // Slight variations to simulate real-world duplicates
  const variations = [
    // Same email, slightly different name
    [fn, ln, email, `${fn} ${ln}`.slice(0, -1)],
    // Different email formatting, same person
    [fn, ln, email, `${fn.toLowerCase()}${ln.toLowerCase()}@${company.toLowerCase().replace(/[^a-z]/g, '').slice(0, 8)}.com`],
    // Middle initial added
    [fn, `${fn[0]}. ${ln}`, email, email.replace('@', '+work@')],
  ];
  const [fn2, ln2Alt, email1, email2] = pick(variations);

  return [
    {
      'Contact ID': `CONT-${id1}`,
      'First Name': fn,
      'Last Name': ln,
      'Email': email1,
      'Phone Number': randomPhone(),
      'Company Name': company,
      'Job Title': pick(TITLES),
      'Last Activity Date': daysAgo(Math.floor(Math.random() * 60)),
      'Notes': '',
    },
    {
      'Contact ID': `CONT-${id2}`,
      'First Name': fn2 || fn,
      'Last Name': ln2Alt || ln,
      'Email': email2,
      'Phone Number': randomPhone(),
      'Company Name': company,
      'Job Title': pick(TITLES),
      'Last Activity Date': daysAgo(Math.floor(Math.random() * 60)),
      'Notes': 'DUPLICATE_SEED',
    },
  ];
}

function staleContact(company) {
  const fn = pick(FIRST_NAMES);
  const ln = pick(LAST_NAMES);
  const id = contactId++;
  return {
    'Contact ID': `CONT-${id}`,
    'First Name': fn,
    'Last Name': ln,
    'Email': companyEmail(fn, ln, company),
    'Phone Number': randomPhone(),
    'Company Name': company,
    'Job Title': pick(TITLES),
    'Last Activity Date': daysAgo(Math.floor(Math.random() * 275) + 90), // 90–365 days ago
    'Notes': 'STALE_SEED',
  };
}

function missingFieldContact(company) {
  const fn = pick(FIRST_NAMES);
  const ln = pick(LAST_NAMES);
  const id = contactId++;
  const missingType = pick(['email', 'company', 'title']);
  return {
    'Contact ID': `CONT-${id}`,
    'First Name': fn,
    'Last Name': ln,
    'Email': missingType === 'email' ? '' : companyEmail(fn, ln, company),
    'Phone Number': randomPhone(),
    'Company Name': missingType === 'company' ? '' : company,
    'Job Title': missingType === 'title' ? '' : pick(TITLES),
    'Last Activity Date': daysAgo(Math.floor(Math.random() * 60)),
    'Notes': `MISSING_${missingType.toUpperCase()}_SEED`,
  };
}

function formatIssueContact(company) {
  const fn = pick(FIRST_NAMES);
  const ln = pick(LAST_NAMES);
  const id = contactId++;
  const issueType = pick(['phone', 'casing']);
  return {
    'Contact ID': `CONT-${id}`,
    'First Name': issueType === 'casing' ? fn.toUpperCase() : fn,
    'Last Name': issueType === 'casing' ? ln.toLowerCase() : ln,
    'Email': companyEmail(fn, ln, company),
    'Phone Number': issueType === 'phone' ? badPhone() : randomPhone(),
    'Company Name': company,
    'Job Title': pick(TITLES),
    'Last Activity Date': daysAgo(Math.floor(Math.random() * 60)),
    'Notes': `FORMAT_ISSUE_${issueType.toUpperCase()}_SEED`,
  };
}

// ─── Generate all data ───────────────────────────────────────────────────────

function generateContacts() {
  const contacts = [];
  const companiesUsed = [...COMPANIES];

  // 240 clean contacts
  for (let i = 0; i < 240; i++) {
    contacts.push(cleanContact(pick(companiesUsed)));
  }

  // ~50 duplicate pairs (~100 records)
  for (let i = 0; i < 50; i++) {
    const pair = duplicateContactPair(pick(companiesUsed));
    contacts.push(...pair);
  }

  // ~100 stale contacts
  for (let i = 0; i < 100; i++) {
    contacts.push(staleContact(pick(companiesUsed)));
  }

  // ~80 missing-field contacts
  for (let i = 0; i < 80; i++) {
    contacts.push(missingFieldContact(pick(companiesUsed)));
  }

  // ~30 format-issue contacts
  for (let i = 0; i < 30; i++) {
    contacts.push(formatIssueContact(pick(companiesUsed)));
  }

  return contacts;
}

function generateCompanies() {
  const companies = [];
  for (let i = 0; i < COMPANIES.length; i++) {
    const name = COMPANIES[i];
    const isComplete = i < 35;
    const isDuplicate = i >= 45; // Last 5 are intentional duplicates
    companies.push({
      'Company ID': `COMP-${i + 1}`,
      'Company Name': isDuplicate ? COMPANIES[i - 45] + ' Inc.' : name, // Slight variation for duplicates
      'Website': isComplete ? `https://www.${name.toLowerCase().replace(/[^a-z]/g, '')}.com` : '',
      'Industry': isComplete ? pick(['Software', 'Marketing', 'Consulting', 'Finance', 'Healthcare', 'Retail', 'Manufacturing', 'Media']) : '',
      'Number of Employees': isComplete ? pick(['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000']) : '',
      'Annual Revenue': isComplete ? pick(['< $1M', '$1M-$10M', '$10M-$50M', '$50M-$200M', '$200M+']) : '',
      'Notes': isDuplicate ? 'DUPLICATE_SEED' : '',
    });
  }
  return companies;
}

function generateDeals() {
  const deals = [];
  for (let i = 0; i < 20; i++) {
    const hasContact = i < 15; // 5 deals with no associated contacts
    const hasCloseDate = i < 17; // 3 deals missing close dates
    deals.push({
      'Deal ID': `DEAL-${i + 1}`,
      'Deal Name': `${pick(COMPANIES)} - ${pick(['Enterprise', 'Pro', 'Starter'])} License`,
      'Deal Stage': pick(DEAL_STAGES),
      'Amount': String(Math.floor(Math.random() * 50000) + 1000),
      'Close Date': hasCloseDate ? daysAgo(Math.floor(Math.random() * 90) - 90) : '',
      'Associated Contact': hasContact ? `CONT-${Math.floor(Math.random() * 550) + 1}` : '',
      'Associated Company': `COMP-${Math.floor(Math.random() * 50) + 1}`,
      'Notes': !hasContact ? 'ORPHANED_DEAL_SEED' : (!hasCloseDate ? 'MISSING_CLOSE_DATE_SEED' : ''),
    });
  }
  return deals;
}

// ─── CSV serialization ──────────────────────────────────────────────────────

function toCSV(records) {
  if (records.length === 0) return '';
  const headers = Object.keys(records[0]);
  const rows = records.map(r =>
    headers.map(h => {
      const v = String(r[h] ?? '');
      return v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
    }).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

// ─── Write output ───────────────────────────────────────────────────────────

const outDir = path.join(__dirname, '..', 'test-data');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const contacts = generateContacts();
const companies = generateCompanies();
const deals = generateDeals();

fs.writeFileSync(path.join(outDir, 'contacts.csv'), toCSV(contacts));
fs.writeFileSync(path.join(outDir, 'companies.csv'), toCSV(companies));
fs.writeFileSync(path.join(outDir, 'deals.csv'), toCSV(deals));

// Summary
console.log('Test data generated:');
console.log(`  contacts.csv  — ${contacts.length} records`);
console.log(`    Clean:         ${contacts.filter(c => !c.Notes).length}`);
console.log(`    Duplicates:    ${contacts.filter(c => c.Notes?.includes('DUPLICATE')).length}`);
console.log(`    Stale:         ${contacts.filter(c => c.Notes?.includes('STALE')).length}`);
console.log(`    Missing field: ${contacts.filter(c => c.Notes?.includes('MISSING')).length}`);
console.log(`    Format issues: ${contacts.filter(c => c.Notes?.includes('FORMAT')).length}`);
console.log(`  companies.csv — ${companies.length} records`);
console.log(`    Duplicates:    ${companies.filter(c => c.Notes?.includes('DUPLICATE')).length}`);
console.log(`    Incomplete:    ${companies.filter(c => !c.Website || !c.Industry).length}`);
console.log(`  deals.csv     — ${deals.length} records`);
console.log(`    Orphaned:      ${deals.filter(d => d.Notes?.includes('ORPHANED')).length}`);
console.log(`    Missing date:  ${deals.filter(d => d.Notes?.includes('MISSING_CLOSE')).length}`);
console.log('\nOutput: test-data/');
console.log('Next: import CSVs into HubSpot via Settings > Import > Start an import');
